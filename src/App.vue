<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import {
  DEPARTMENTS,
  STATUSES,
  createRecruitmentRecord,
  filterApplications,
  updateApplicationStatus,
  validateApplication,
} from "./recruitment.js";

const STORAGE_KEY = "zhuoruan_recruitment_applications";
const views = ["home", "matrix", "arsenal", "showcase", "register", "admin"];
const view = ref("home");
const applications = ref([]);
const selectedApplication = ref(null);
const errors = ref({});
const message = ref("");
const messageType = ref("");
const adminUnlocked = ref(false);
const showAdminGate = ref(false);
const adminPassword = ref("");
const adminLoginError = ref("");
const coreRotation = reactive({ x: -14, y: 24 });
const coreDrag = reactive({ active: false, x: 0, y: 0, startX: -14, startY: 24 });

const filters = reactive({
  department: "",
  status: "",
  keyword: "",
});

const departments = DEPARTMENTS;
const statuses = STATUSES;
const departmentCards = [
  ["研发部", "承担开发任务与框架设计，是社团核心技术部门，关注计划、设计、执行、测试和维护完整流程。", "{ }"],
  ["项目部", "负责项目开发与竞赛培训，覆盖数学建模、数据分析、AI、物联网、软件开发和创新创业。", "Σ"],
  ["外联部", "负责赞助、经费、外事联络和礼仪安排，为社团活动争取资源并推动校内外合作。", "↔"],
  ["组织部", "负责组织活动、物资管理、宣传设计、会场布置和社团日常活动支持。", "⌘"],
  ["产品部", "负责美工创意、需求分析、产品生命周期管理，协助技术团队打造有价值的项目成果。", "UI"],
  ["实干青年部", "拥有丰富竞赛资源，注重编码能力、沟通能力和团队协作能力培养，原则上不直接对外招新。", "AI"],
];
const bootLines = [
  "[ OK ] Started Zhuoruan Core Service.",
  "[ OK ] Loaded kernel module zhuoruan_builder.ko.",
  "[ OK ] Listening on api.zhuoruan.xyz gateway.",
  "[ OK ] Mounted /projects/recruitment.",
  "[ OK ] Started Mentor Target: Java / 408 / AI Ops.",
  "[ OK ] Reached target Geek Mode.",
  "[ INFO ] Awaiting new builders...",
];
const matrixCards = [
  {
    title: "无限火力 API",
    meta: "api.zhuoruan.xyz",
    text: "统一的 AI 模型聚合与分发网关，面向 AI Agent、自动化工具和课程项目实验开放，支持把模型服务转换为 OpenAI、Claude、Gemini 兼容接口。",
  },
  {
    title: "OpenAI 兼容入口",
    meta: "https://api.zhuoruan.xyz/v1",
    text: "公开线路已经配置 OpenAI 兼容格式，适合接入课程 Demo、脚本工具、Agent 工作流和社团内部实验项目。",
  },
  {
    title: "客户端一键接入",
    meta: "Cherry Studio / Lobe Chat / OpenCat",
    text: "平台暴露了 Cherry Studio、AionUI、Lobe Chat、AI as Workspace、AMA 问天、OpenCat 等客户端接入入口，新生可以更快把 API 用起来。",
  },
  {
    title: "多模态任务通道",
    meta: "Drawing / Task",
    text: "站点公开配置中已开启绘图能力和任务能力，后续可以作为 AI 绘图、异步任务、自动化工作流实验的展示支点。",
  },
  {
    title: "账号与额度管理",
    meta: "GitHub / Passkey / Email",
    text: "支持 GitHub OAuth、Passkey 登录和邮箱验证，配合额度、兑换码、日志和控制台模块，形成可管理的社团 API 资源池。",
  },
  {
    title: "硬核导师镇场",
    meta: "Architecture / Java / 408",
    text: "从理论到落地串起完整链路，覆盖 Spring Boot 微服务、数据库设计、系统原理和竞赛项目推进。",
  },
  {
    title: "项目训练场",
    meta: "Demo to Production",
    text: "把课堂作业推进到真实可演示项目，重视代码评审、测试、部署和复盘，而不是只停留在页面截图。",
  },
];
const modelLogos = [
  {
    name: "OpenAI",
    mark: "OA",
    group: "international",
    path: "M22.282 9.821a6 6 0 0 0-.516-4.91a6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9a6.05 6.05 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206a6 6 0 0 0 3.997-2.9a6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354l-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023l-.141-.085l-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5Z",
  },
  {
    name: "Claude",
    mark: "C",
    group: "international",
    path: "M17.304 3.541h-3.672l6.696 16.918H24Zm-10.608 0L0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541Zm-.371 10.223L8.616 7.82l2.291 5.945Z",
  },
  {
    name: "Gemini",
    mark: "G",
    group: "international",
    path: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68q.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58a12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68q-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96q2.19.93 3.81 2.55t2.55 3.81",
  },
  {
    name: "Codex",
    mark: "CX",
    group: "international",
    path: "M22.282 9.821a6 6 0 0 0-.516-4.91a6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9a6.05 6.05 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206a6 6 0 0 0 3.997-2.9a6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354l-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023l-.141-.085l-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5Z",
  },
  {
    name: "DeepSeek",
    mark: "DS",
    group: "domestic",
    path: "M23.748 4.651c-.254-.124-.364.113-.512.233c-.051.04-.094.09-.137.137c-.372.397-.806.657-1.373.626c-.829-.046-1.537.214-2.163.848c-.133-.782-.575-1.248-1.247-1.548c-.352-.155-.708-.311-.955-.65c-.172-.24-.219-.509-.305-.774c-.055-.16-.11-.323-.293-.35c-.2-.031-.278.136-.356.276c-.313.572-.434 1.202-.422 1.84c.027 1.436.633 2.58 1.838 3.393c.137.094.172.187.129.323c-.082.28-.18.553-.266.833c-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836c.27-.098.094-.433-.778-.428c-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136a9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653c1.857 1.533 3.997 2.284 6.438 2.14c1.482-.085 3.132-.284 4.994-1.86c.47.234.962.328 1.78.398c.629.058 1.235-.031 1.705-.129c.735-.155.684-.836.418-.961c-2.155-1.004-1.682-.595-2.112-.926c1.095-1.295 2.768-3.598 3.284-6.733c.05-.346.115-.834.108-1.114c-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517c.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16c-.39.024-.32.472-.234.763c.09.288.207.487.371.74c.114.167.192.416-.113.603c-.673.416-1.842-.14-1.897-.168c-1.361-.801-2.5-1.86-3.301-3.306c-.775-1.393-1.225-2.888-1.299-4.482c-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774c.868.86 1.525 1.887 2.202 2.89c.72 1.066 1.494 2.082 2.48 2.915c.348.291.626.513.892.677c-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287a.3.3 0 0 1 .113.074a.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727c-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078a.253.253 0 0 1-.114-.358a1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016c.352.144.618.408 1.001.782c.392.451.462.576.685.915c.176.264.336.536.446.848c.066.194-.02.353-.25.45",
  },
  {
    name: "Qwen",
    mark: "QW",
    group: "domestic",
    path: "M3.996 4.517h5.291L8.01 6.324L4.153 7.506a1.67 1.67 0 0 0-1.165 1.601v5.786a1.67 1.67 0 0 0 1.165 1.6l3.857 1.183l1.277 1.807H3.996A3.996 3.996 0 0 1 0 15.487V8.513a3.996 3.996 0 0 1 3.996-3.996m16.008 0h-5.291l1.277 1.807l3.857 1.182c.715.227 1.17.889 1.165 1.601v5.786a1.67 1.67 0 0 1-1.165 1.6l-3.857 1.183l-1.277 1.807h5.291A3.996 3.996 0 0 0 24 15.487V8.513a3.996 3.996 0 0 0-3.996-3.996m-4.007 8.345H8.002v-1.804h7.995Z",
  },
  { name: "Kimi", mark: "KM", group: "domestic" },
  { name: "GLM", mark: "GLM", group: "domestic" },
];
const arsenalTracks = [
  ["Backend", "后端引擎", "Java / 数据库 / 分布式架构", "构建能稳定运行的服务端系统，理解接口、数据和并发。"],
  ["Frontend", "前端交互", "Vue3 / Three.js / UI 动效", "把想法变成可操作、可演示、可维护的用户界面。"],
  ["AI & Ops", "智能与运维", "Docker / Multi-Agent / 自动化", "搭建模型工具链和部署流程，让项目真正跑起来。"],
];
const achievements = ["开源项目孵化", "竞赛作品打磨", "社团工具建设", "跨部门产品协作"];
const showcaseProjects = [
  {
    title: "服务外包创新创业训练项目",
    code: "A19 / Competition Lab",
    summary: "围绕真实赛题训练需求拆解、架构设计、前后端协同和交付复盘，让项目从 PPT 进入可演示系统。",
    tags: ["Vue3", "Spring Boot", "MySQL", "Docker", "竞赛实战"],
    result: "从赛题拆解到原型交付",
  },
  {
    title: "卓软招新与成员管理系统",
    code: "ZR-Recruitment",
    summary: "当前站点本身就是可持续迭代的社团工具，覆盖宣传、报名、筛选、详情查看和状态流转。",
    tags: ["Vue3", "Vite", "localStorage", "Admin", "测试覆盖"],
    result: "社团内部工具链雏形",
  },
  {
    title: "Multi-Agent 自动化工作流实验",
    code: "AgentOps",
    summary: "探索需求分析、代码生成、测试验证和文档沉淀的自动化协作流程，训练工程化 AI 使用能力。",
    tags: ["Multi-Agent", "Prompt", "Workflow", "CI", "Docs"],
    result: "AI 工程实践方向",
  },
  {
    title: "AI 网关与内部工具链",
    code: "api.zhuoruan.xyz",
    summary: "围绕模型调用、额度管理、接口封装和实验项目接入，降低新生启动 AI 项目的门槛。",
    tags: ["API Gateway", "LLM", "Ops", "Automation", "成本控制"],
    result: "算力资源基础设施",
  },
];

function startCoreDrag(event) {
  coreDrag.active = true;
  coreDrag.x = event.clientX;
  coreDrag.y = event.clientY;
  coreDrag.startX = coreRotation.x;
  coreDrag.startY = coreRotation.y;
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveCoreDrag(event) {
  if (!coreDrag.active) return;
  coreRotation.y = coreDrag.startY + (event.clientX - coreDrag.x) * 0.35;
  coreRotation.x = Math.max(-38, Math.min(38, coreDrag.startX - (event.clientY - coreDrag.y) * 0.25));
}

function stopCoreDrag(event) {
  coreDrag.active = false;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
}

function createEmptyForm() {
  return {
    name: "",
    gender: "",
    birthDate: "",
    ethnicity: "",
    politicalStatus: "",
    college: "",
    departmentMajor: "",
    className: "",
    phone: "",
    qq: "",
    preferredDepartment: "",
    acceptAdjustment: "",
    photoName: "",
    strengths: "",
    awards: "",
    experience: "",
    careerPlan: "",
  };
}

const form = reactive(createEmptyForm());

const filteredApplications = computed(() => filterApplications(applications.value, filters));
const adminStats = computed(
  () => `共 ${applications.value.length} 条报名，当前显示 ${filteredApplications.value.length} 条`,
);
const requiredFormKeys = [
  "name",
  "gender",
  "birthDate",
  "ethnicity",
  "politicalStatus",
  "college",
  "departmentMajor",
  "className",
  "phone",
  "qq",
  "preferredDepartment",
  "acceptAdjustment",
  "strengths",
  "careerPlan",
];
const formCompletion = computed(() => {
  const completed = requiredFormKeys.filter((key) => String(form[key] || "").trim()).length;
  return Math.round((completed / requiredFormKeys.length) * 100);
});

function syncViewFromHash() {
  const next = window.location.hash.replace("#", "") || "home";
  if (next === "admin" && !adminUnlocked.value) {
    view.value = "home";
    showAdminGate.value = true;
    window.location.hash = "";
    return;
  }
  view.value = views.includes(next) ? next : "home";
  if (view.value === "admin") loadApplications();
}

function go(next) {
  if (next === "admin" && !adminUnlocked.value) {
    showAdminGate.value = true;
    adminLoginError.value = "";
    return;
  }
  window.location.hash = next === "home" ? "" : next;
  view.value = next;
}

function submitAdminGate() {
  if (adminPassword.value !== "zhuoruan2026") {
    adminLoginError.value = "管理员口令错误";
    return;
  }
  adminUnlocked.value = true;
  showAdminGate.value = false;
  adminPassword.value = "";
  adminLoginError.value = "";
  loadApplications();
  go("admin");
}

function loadApplications() {
  try {
    applications.value = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    applications.value = [];
  }
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications.value));
}

function onPhotoChange(event) {
  const file = event.target.files && event.target.files[0];
  form.photoName = file ? file.name : "";
}

function resetForm() {
  Object.assign(form, createEmptyForm());
}

function submitApplication() {
  const result = validateApplication(form);
  errors.value = result.errors;
  if (!result.valid) {
    message.value = "请先完善标红字段后再提交。";
    messageType.value = "error";
    return;
  }

  const record = createRecruitmentRecord(form);
  applications.value = [record, ...applications.value];
  saveApplications();
  resetForm();
  errors.value = {};
  message.value = `报名成功，编号：${record.id}。请留意 QQ 或电话通知。`;
  messageType.value = "success";
}

function updateStatus(record, status) {
  applications.value = updateApplicationStatus(applications.value, record.id, status);
  saveApplications();
  selectedApplication.value = applications.value.find((item) => item.id === record.id) || null;
}

onMounted(() => {
  syncViewFromHash();
  loadApplications();
  window.addEventListener("hashchange", syncViewFromHash);
});

onUnmounted(() => window.removeEventListener("hashchange", syncViewFromHash));
</script>

<template>
  <header class="site-header">
    <a class="brand" href="#home" @click.prevent="go('home')">卓软信息工作室</a>
    <nav class="nav">
      <a href="#home" :class="{ active: view === 'home' }" @click.prevent="go('home')">宣传首页</a>
      <a href="#matrix" :class="{ active: view === 'matrix' }" @click.prevent="go('matrix')">算力矩阵</a>
      <a href="#arsenal" :class="{ active: view === 'arsenal' }" @click.prevent="go('arsenal')">技术兵器谱</a>
      <a href="#showcase" :class="{ active: view === 'showcase' }" @click.prevent="go('showcase')">开源展厅</a>
      <a href="#register" :class="{ active: view === 'register' }" @click.prevent="go('register')">招新报名</a>
    </nav>
    <button class="admin-entry" type="button" @click="go('admin')">管理员入口</button>
  </header>

  <div v-if="showAdminGate" class="modal-backdrop" data-admin-gate>
    <section class="admin-gate" role="dialog" aria-modal="true" aria-labelledby="admin-gate-title">
      <button class="modal-close" type="button" aria-label="关闭" @click="showAdminGate = false">×</button>
      <p class="eyebrow">Admin Access</p>
      <h2 id="admin-gate-title">管理员登录</h2>
      <p>后台只面向社团管理员开放。当前为前端演示口令，正式版本需要接入 Spring Boot 登录接口。</p>
      <form @submit.prevent="submitAdminGate">
        <label>
          管理员口令
          <input v-model.trim="adminPassword" type="password" autocomplete="current-password" />
        </label>
        <small>{{ adminLoginError }}</small>
        <button class="primary-action" type="submit">进入后台</button>
      </form>
    </section>
  </div>

  <main v-if="view === 'home'">
    <section class="hero">
      <div class="hero-content">
        <div class="terminal-feed" aria-label="系统启动日志">
          <span
            v-for="(line, index) in bootLines"
            :key="line"
            class="typewriter-line"
            :style="{ '--line-delay': `${index * 0.42}s` }"
          >{{ line }}</span>
        </div>
        <p class="eyebrow">The Awakening / 江苏师范大学科文学院</p>
        <h1>卓软信息工作室</h1>
        <p class="hero-copy">
          不要在平庸的代码里浪费天赋。卓软，重塑你的极客基因。
        </p>
        <div class="hero-actions">
          <button class="primary-action neon-action" type="button" @click="go('register')">[ Initiate Join Sequence_ ]</button>
          <button class="secondary-action" type="button" @click="go('matrix')">查看算力矩阵</button>
        </div>
        <div class="hero-metrics" aria-label="社团能力方向">
          <div><strong>6</strong><span>核心部门</span></div>
          <div><strong>3</strong><span>技术主线</span></div>
          <div><strong>24h</strong><span>项目训练场</span></div>
        </div>
      </div>
      <div
        class="server-orbit cyber-core-stage"
        aria-label="可拖拽旋转的赛博核心"
        @pointerdown="startCoreDrag"
        @pointermove="moveCoreDrag"
        @pointerup="stopCoreDrag"
        @pointerleave="stopCoreDrag"
      >
        <div
          class="server-core cyber-core"
          :style="{ transform: `rotateX(${coreRotation.x}deg) rotateY(${coreRotation.y}deg)` }"
        >
          <span class="core-face core-front"></span>
          <span class="core-face core-back"></span>
          <span class="core-face core-left"></span>
          <span class="core-face core-right"></span>
          <span class="core-face core-top"></span>
          <span class="core-face core-bottom"></span>
          <i></i>
        </div>
        <p>ZR-CORE ONLINE</p>
      </div>
    </section>

    <section id="about" class="section">
      <div class="section-heading">
        <p class="eyebrow">About</p>
        <h2>社团简介</h2>
      </div>
      <p class="wide-text">
        卓软信息工作室为科文学院院级社团之一，直属软件工程系下的特色社团，与信科系各专业直接对口，包含软件工程、数据、智科等方向。本着“科技、前沿、创作”的工作作风，努力开展以科技创新为主的各类活动。
      </p>
    </section>

    <section id="departments" class="section muted">
      <div class="section-heading">
        <p class="eyebrow">Departments</p>
        <h2>部门介绍</h2>
      </div>
      <div class="department-grid">
        <article class="department-card" v-for="[name, text, icon] in departmentCards" :key="name">
          <span class="department-icon" aria-hidden="true">{{ icon }}</span>
          <h3>{{ name }}</h3>
          <p>{{ text }}</p>
        </article>
      </div>
    </section>

    <section class="section process-section">
      <div class="section-heading">
        <p class="eyebrow">Recruitment Flow</p>
        <h2>招新流程</h2>
      </div>
      <div class="process-grid">
        <article>
          <span>01</span>
          <h3>线上报名</h3>
          <p>学生填写招新报名表，提交后生成报名编号。</p>
        </article>
        <article>
          <span>02</span>
          <h3>部门初筛</h3>
          <p>管理员按意向部门、状态和关键词整理报名信息。</p>
        </article>
        <article>
          <span>03</span>
          <h3>面试跟进</h3>
          <p>后台更新审核状态，形成清晰的招新进度。</p>
        </article>
      </div>
    </section>
  </main>

  <main v-else-if="view === 'matrix'" class="page-shell cyber-page">
    <section class="page-title">
      <p class="eyebrow">Compute Matrix</p>
      <h1>算力矩阵</h1>
      <p>把 API 平台、导师资源和项目训练场集中展示给对 AI、后端和自动化感兴趣的新生。</p>
    </section>

    <section class="matrix-grid">
      <article class="matrix-card" v-for="card in matrixCards" :key="card.title">
        <span>{{ card.meta }}</span>
        <h2>{{ card.title }}</h2>
        <p>{{ card.text }}</p>
        <div v-if="card.title === '无限火力 API'" class="compute-visual" aria-hidden="true">
          <span
            v-for="(logo, index) in modelLogos"
            :key="logo.name"
            class="model-logo"
            :class="logo.group"
            :style="{ '--logo-delay': `${index * 45}ms` }"
          >
            <svg v-if="logo.path" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="logo.path"></path>
            </svg>
            <i v-else>{{ logo.mark }}</i>
            <strong>{{ logo.name }}</strong>
          </span>
        </div>
      </article>
    </section>
  </main>

  <main v-else-if="view === 'arsenal'" class="page-shell cyber-page">
    <section class="page-title">
      <p class="eyebrow">Tech Arsenal</p>
      <h1>技术兵器谱</h1>
      <p>用清晰的技术方向告诉新生：加入后能学什么、做什么、把作品推进到什么程度。</p>
    </section>

    <section class="arsenal-layout">
      <div class="skill-tree" aria-label="技能树示意">
        <button class="tech-logo active" type="button">Vue3</button>
        <button class="tech-logo" type="button">Java</button>
        <button class="tech-logo" type="button">AI</button>
        <button class="tech-logo" type="button">Docker</button>
      </div>
      <div class="arsenal-list">
        <article v-for="[code, title, stack, text] in arsenalTracks" :key="code">
          <p>{{ code }}</p>
          <h2>{{ title }}</h2>
          <strong>{{ stack }}</strong>
          <span>{{ text }}</span>
        </article>
      </div>
    </section>

    <section class="achievement-strip" aria-label="往届战绩">
      <span v-for="item in achievements" :key="item">{{ item }}</span>
    </section>
  </main>

  <main v-else-if="view === 'showcase'" class="page-shell cyber-page showcase-page">
    <section class="page-title">
      <p class="eyebrow">Open Source Showcase</p>
      <h1>开源展厅</h1>
      <p>把“做过什么”单独拎出来展示，用项目、架构、标签和交付结果证明社团的实战密度。</p>
    </section>

    <section class="showcase-hero-card">
      <div>
        <p class="eyebrow">Project Signal</p>
        <h2>从赛题到系统，从想法到部署</h2>
        <p>这里不堆空洞截图，而是展示项目背后的技术栈、协作方式、架构取舍和交付结果。真实材料补齐后，每张卡都可以替换为对应项目链接、仓库地址或演示视频。</p>
      </div>
      <div class="architecture-map" aria-hidden="true">
        <span>Client</span>
        <span>API</span>
        <span>Model</span>
        <span>Deploy</span>
      </div>
    </section>

    <section class="showcase-grid">
      <article
        class="showcase-card"
        v-for="(project, index) in showcaseProjects"
        :key="project.title"
        :class="{ featured: index === 0 }"
      >
        <div class="project-graph" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <p>{{ project.code }}</p>
        <h2>{{ project.title }}</h2>
        <strong>{{ project.result }}</strong>
        <span>{{ project.summary }}</span>
        <div class="project-tags">
          <em v-for="tag in project.tags" :key="tag" :data-tag="tag">{{ tag }}</em>
        </div>
      </article>
    </section>
  </main>

  <main v-else-if="view === 'register'" class="page-shell terminal-register">
    <section class="page-title">
      <p class="eyebrow">Root Access</p>
      <h1>./join_zhuoruan.sh</h1>
      <p>按报名表字段提交申请。当前仍使用 Vue3 前端和 localStorage 演示数据流，后端接口将在下一阶段接入。</p>
      <div class="terminal-prompt">
        <span>$ sudo pacman -S zhuoruan-member</span>
        <span>&gt; collecting identity payload...</span>
        <span>&gt; Welcome to Zhuoruan, applicant.</span>
      </div>
    </section>

    <div class="application-layout">
      <aside class="form-side-panel">
        <p class="eyebrow">Application</p>
        <h2>招新申请</h2>
        <p>填写完成后，报名信息会进入管理员后台，后续由对应部门统一跟进。</p>
        <div class="form-progress">
          <div class="progress-label">
            <span>必填完成度</span>
            <strong>{{ formCompletion }}%</strong>
          </div>
          <div class="progress-track">
            <span :style="{ width: `${formCompletion}%` }"></span>
          </div>
        </div>
        <div class="side-list">
          <span>部门志愿</span>
          <span>项目经历</span>
          <span>发展规划</span>
        </div>
      </aside>

      <form class="form-panel application-form" @submit.prevent="submitApplication">
        <section class="form-section">
          <div class="form-section-title">
            <span>01</span>
            <div>
              <h2>基本信息</h2>
              <p>用于确认报名人身份、学院、班级和专业方向。</p>
            </div>
          </div>
          <div class="form-grid">
            <label>姓名<input name="name" v-model.trim="form.name" /><small>{{ errors.name }}</small></label>
            <label>性别<select name="gender" v-model="form.gender"><option value="">请选择</option><option>男</option><option>女</option></select><small>{{ errors.gender }}</small></label>
            <label>出生年月<input name="birthDate" type="month" v-model="form.birthDate" /><small>{{ errors.birthDate }}</small></label>
            <label>民族<input name="ethnicity" v-model.trim="form.ethnicity" placeholder="例如：汉族" /><small>{{ errors.ethnicity }}</small></label>
            <label>政治面貌<input name="politicalStatus" v-model.trim="form.politicalStatus" placeholder="例如：共青团员" /><small>{{ errors.politicalStatus }}</small></label>
            <label>二级学院<input name="college" v-model.trim="form.college" placeholder="例如：科文学院" /><small>{{ errors.college }}</small></label>
            <label>系别<input name="departmentMajor" v-model.trim="form.departmentMajor" placeholder="例如：软件工程系" /><small>{{ errors.departmentMajor }}</small></label>
            <label>班级<input name="className" v-model.trim="form.className" placeholder="例如：软件工程 2401" /><small>{{ errors.className }}</small></label>
            <label>照片<input name="photo" type="file" accept="image/*" @change="onPhotoChange" /></label>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-title">
            <span>02</span>
            <div>
              <h2>联系与志愿</h2>
              <p>用于后续通知、部门分配和面试联系。</p>
            </div>
          </div>
          <div class="form-grid">
            <label>联系电话<input name="phone" v-model.trim="form.phone" inputmode="tel" maxlength="11" /><small>{{ errors.phone }}</small></label>
            <label>QQ<input name="qq" v-model.trim="form.qq" inputmode="numeric" /><small>{{ errors.qq }}</small></label>
            <label>意向部门<select name="preferredDepartment" v-model="form.preferredDepartment"><option value="">请选择</option><option v-for="item in departments" :key="item">{{ item }}</option></select><small>{{ errors.preferredDepartment }}</small></label>
            <label>是否服从调剂<select name="acceptAdjustment" v-model="form.acceptAdjustment"><option value="">请选择</option><option>是</option><option>否</option></select><small>{{ errors.acceptAdjustment }}</small></label>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-title">
            <span>03</span>
            <div>
              <h2>个人经历</h2>
              <p>补充能力、奖项、经历和职业规划，帮助部门了解你的方向。</p>
            </div>
          </div>
          <label class="full">爱好及特长<textarea name="strengths" rows="4" v-model.trim="form.strengths"></textarea><small>{{ errors.strengths }}</small></label>
          <label class="full">曾获奖项<textarea name="awards" rows="3" v-model.trim="form.awards"></textarea></label>
          <label class="full">任职经历<textarea name="experience" rows="3" v-model.trim="form.experience"></textarea></label>
          <label class="full">职业规划<textarea name="careerPlan" rows="4" v-model.trim="form.careerPlan"></textarea><small>{{ errors.careerPlan }}</small></label>
        </section>

        <div class="form-actions sticky-actions">
          <button class="primary-action" type="submit">提交报名</button>
          <p class="notice" :class="messageType">{{ message }}</p>
        </div>
      </form>
    </div>
  </main>

  <main v-else-if="view === 'admin' && adminUnlocked" class="page-shell">
    <section class="page-title">
      <p class="eyebrow">Vue3 Admin</p>
      <h1>报名与人员管理</h1>
      <p>当前为前端本地数据管理版本，后续可接入 Spring Boot API 和 MySQL 数据库。</p>
    </section>

    <section class="admin-toolbar">
      <label>部门<select data-filter-department v-model="filters.department"><option value="">全部部门</option><option v-for="item in departments" :key="item">{{ item }}</option></select></label>
      <label>状态<select data-filter-status v-model="filters.status"><option value="">全部状态</option><option v-for="item in statuses" :key="item">{{ item }}</option></select></label>
      <label>搜索<input data-filter-keyword v-model.trim="filters.keyword" placeholder="姓名、电话、QQ、班级" /></label>
      <p>{{ adminStats }}</p>
    </section>

    <section class="table-wrap">
      <table>
        <thead><tr><th>姓名</th><th>班级</th><th>意向部门</th><th>状态</th><th>联系电话</th><th>操作</th></tr></thead>
        <tbody data-application-list>
          <tr v-if="!filteredApplications.length"><td colspan="6" class="empty">暂无符合条件的报名记录</td></tr>
          <tr v-for="record in filteredApplications" :key="record.id">
            <td>{{ record.name }}</td>
            <td>{{ record.className }}</td>
            <td>{{ record.preferredDepartment }}</td>
            <td><span class="status">{{ record.status }}</span></td>
            <td>{{ record.phone }}</td>
            <td>
              <button class="icon-text small" type="button" @click="selectedApplication = record">查看</button>
              <select :value="record.status" @change="updateStatus(record, $event.target.value)">
                <option v-for="item in statuses" :key="item">{{ item }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="detail-panel" data-application-detail>
      <h2>报名详情</h2>
      <p v-if="!selectedApplication">点击列表中的“查看”后，这里会展示完整报名表内容。</p>
      <dl v-else class="detail-grid">
        <dt>报名编号</dt><dd>{{ selectedApplication.id }}</dd>
        <dt>姓名</dt><dd>{{ selectedApplication.name }}</dd>
        <dt>性别</dt><dd>{{ selectedApplication.gender }}</dd>
        <dt>出生年月</dt><dd>{{ selectedApplication.birthDate }}</dd>
        <dt>民族</dt><dd>{{ selectedApplication.ethnicity }}</dd>
        <dt>政治面貌</dt><dd>{{ selectedApplication.politicalStatus }}</dd>
        <dt>二级学院</dt><dd>{{ selectedApplication.college }}</dd>
        <dt>系别</dt><dd>{{ selectedApplication.departmentMajor }}</dd>
        <dt>班级</dt><dd>{{ selectedApplication.className }}</dd>
        <dt>联系电话</dt><dd>{{ selectedApplication.phone }}</dd>
        <dt>QQ</dt><dd>{{ selectedApplication.qq }}</dd>
        <dt>意向部门</dt><dd>{{ selectedApplication.preferredDepartment }}</dd>
        <dt>服从调剂</dt><dd>{{ selectedApplication.acceptAdjustment }}</dd>
        <dt>照片文件</dt><dd>{{ selectedApplication.photoName || "未上传" }}</dd>
        <dt>爱好及特长</dt><dd>{{ selectedApplication.strengths }}</dd>
        <dt>曾获奖项</dt><dd>{{ selectedApplication.awards || "未填写" }}</dd>
        <dt>任职经历</dt><dd>{{ selectedApplication.experience || "未填写" }}</dd>
        <dt>职业规划</dt><dd>{{ selectedApplication.careerPlan }}</dd>
      </dl>
    </section>
  </main>
</template>
