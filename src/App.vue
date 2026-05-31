<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  DEPARTMENTS,
  STATUSES,
  createRecruitmentRecord,
  filterApplications,
  updateApplicationStatus,
  validateApplication,
} from "./recruitment.js";

const STORAGE_KEY = "zhuoruan_recruitment_applications";
const FORM_DRAFT_KEY = "zhuoruan_recruitment_form_draft";
const views = [
  "home",
  "matrix",
  "mentor",
  "arsenal",
  "showcase",
  "activity",
  "guide",
  "status",
  "department",
  "register",
  "admin",
];
const view = ref("home");
const applications = ref([]);
const selectedApplication = ref(null);
const selectedSkillId = ref("java");
const errors = ref({});
const message = ref("");
const messageType = ref("");
const draftSavedAt = ref("");
const adminUnlocked = ref(false);
const showAdminGate = ref(false);
const adminPassword = ref("");
const adminLoginError = ref("");
const statusQuery = reactive({
  id: "",
  phone: "",
});
const statusResult = ref(null);
const statusMessage = ref("");

const filters = reactive({
  department: "",
  status: "",
  keyword: "",
});

const departments = DEPARTMENTS;
const statuses = STATUSES;
const selectedDepartmentId = ref("dev");
const departmentProfiles = [
  {
    id: "dev",
    name: "研发部",
    icon: "{ }",
    summary: "承担开发任务与框架设计，是社团核心技术部门，关注计划、设计、执行、测试和维护完整流程。",
    mission: "把需求拆成可运行的软件系统，负责核心代码、接口设计、工程规范和技术攻坚。",
    suitedFor: "适合愿意长期写代码、喜欢拆问题、能接受调试和复盘的新生。没有完整项目经验也可以，但要愿意持续练习。",
    learn: ["Vue3 / Java / API 设计", "Git 协作与代码评审", "测试、部署和问题定位"],
    tasks: ["参与社团内部工具开发", "维护招新系统和后台功能", "沉淀项目模板与开发规范"],
    basics: "建议具备任意一门编程语言基础；如果基础薄弱，可以先从前端页面、脚本工具或接口联调任务切入。",
    advice: "报名时重点写清楚做过的小项目、刷题经历、调试经历，哪怕只是课程作业，也比空泛地写“喜欢编程”更有判断价值。",
    tags: ["Code", "API", "Review"],
  },
  {
    id: "project",
    name: "项目部",
    icon: "Σ",
    summary: "负责项目开发与竞赛培训，覆盖数学建模、数据分析、AI、物联网、软件开发和创新创业。",
    mission: "把赛题、创意和课程任务推进成可展示成果，负责需求拆解、进度推进、材料组织和跨角色协作。",
    suitedFor: "适合目标感强、愿意参加比赛、能主动沟通和跟进进度的新生。技术、文档、数据分析能力都能发挥作用。",
    learn: ["竞赛选题与需求分析", "项目排期与交付复盘", "AI / 数据 / 物联网方案整合"],
    tasks: ["组织竞赛项目训练", "协助队伍完成原型和答辩材料", "整理项目案例和复盘文档"],
    basics: "不要求一开始就会完整开发，但需要有执行力，能按节点完成资料、调研、数据或功能任务。",
    advice: "报名时可以写自己参加过的比赛、负责过的小组任务、擅长的信息整理或表达能力，突出“能把事情推进”。",
    tags: ["Competition", "Delivery", "Research"],
  },
  {
    id: "outreach",
    name: "外联部",
    icon: "↔",
    summary: "负责赞助、经费、外事联络和礼仪安排，为社团活动争取资源并推动校内外合作。",
    mission: "连接社团与外部资源，负责沟通、赞助、合作对接和活动支持，让技术项目有更好的展示与资源环境。",
    suitedFor: "适合表达清楚、敢于沟通、做事稳妥的新生。对技术不熟也可以，但需要可靠、礼貌、有跟进意识。",
    learn: ["商务沟通与合作对接", "活动资源统筹", "正式场合表达和礼仪"],
    tasks: ["联系活动资源与赞助", "协助校内外合作沟通", "支持招新、讲座和竞赛活动落地"],
    basics: "推荐具备基本沟通能力和文案能力，能按时反馈进展，避免信息断档。",
    advice: "报名时可以写组织活动、班委社团经历、沟通协调案例，重点体现责任心和表达能力。",
    tags: ["Resource", "Communication", "Event"],
  },
  {
    id: "organization",
    name: "组织部",
    icon: "⌘",
    summary: "负责组织活动、物资管理、宣传设计、会场布置和社团日常活动支持。",
    mission: "保障社团活动从计划到现场执行都能稳定落地，是维持社团日常运转的重要枢纽。",
    suitedFor: "适合细心、有秩序感、愿意做现场执行和流程管理的新生。技术能力不是硬门槛，可靠性更重要。",
    learn: ["活动流程设计", "现场执行与物资管理", "宣传协同和复盘记录"],
    tasks: ["组织招新、讲座、培训活动", "管理物资和场地安排", "协助宣传与活动记录"],
    basics: "需要守时、细致、能处理琐碎事项，最好有班级或社团活动执行经验。",
    advice: "报名时可以写自己负责过的活动、排班、物资、宣传或现场协调经历，越具体越好。",
    tags: ["Ops", "Schedule", "Support"],
  },
  {
    id: "product",
    name: "产品部",
    icon: "UI",
    summary: "负责美工创意、需求分析、产品生命周期管理，协助技术团队打造有价值的项目成果。",
    mission: "站在用户视角定义产品体验，把想法变成清晰的原型、页面结构、需求说明和展示材料。",
    suitedFor: "适合对审美、交互、文案、用户体验或产品策划感兴趣的新生。会设计软件是加分项，但不是唯一标准。",
    learn: ["需求分析与原型设计", "UI 视觉与交互细节", "产品文档和演示表达"],
    tasks: ["设计项目页面和功能流程", "配合研发部梳理需求", "制作展示海报、PPT 和演示材料"],
    basics: "推荐了解 Figma、墨刀、Canva、PS 或任意设计工具；没有工具基础也可以从竞品分析和文案开始。",
    advice: "报名时可以附上设计作品、PPT、海报、页面截图或产品想法，重点展示审美判断和表达结构。",
    tags: ["UI", "Prototype", "Story"],
  },
  {
    id: "youth",
    name: "实干青年部",
    icon: "AI",
    summary: "拥有丰富竞赛资源，注重编码能力、沟通能力和团队协作能力培养，原则上不直接对外招新。",
    mission: "围绕高强度项目和竞赛任务培养能独立推进的人，强调实战、协作和长期成长。",
    suitedFor:
      "适合已经有较强执行力、愿意承担压力、能持续投入项目的新生。该部门原则上不直接对外招新，可先加入其他部门成长。",
    learn: ["高强度项目协作", "竞赛方案打磨", "跨部门技术与表达训练"],
    tasks: ["参与重点竞赛与项目攻坚", "协助训练新成员实战能力", "沉淀高质量项目经验"],
    basics: "建议先在研发部、项目部或产品部积累一段时间，再通过项目表现进入更高强度任务。",
    advice: "报名时可说明自己愿意参与高强度项目，但意向部门建议优先选择研发部、项目部或产品部。",
    tags: ["Challenge", "Teamwork", "Growth"],
  },
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
    title: "AI 算力网关",
    meta: "api.zhuoruan.xyz",
    text: "统一的 AI 模型聚合与分发网关，面向 AI Agent、自动化工具和课程项目实验开放，支持把模型服务转换为 OpenAI、Claude、Gemini 兼容接口。",
    visual: "models",
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
];
const mentorTracks = [
  {
    title: "后端与架构",
    meta: "Spring Boot / MySQL / API",
    text: "从接口设计、数据库建模到服务拆分，帮助新生理解一个项目如何从课堂作业变成可维护系统。",
  },
  {
    title: "竞赛与交付",
    meta: "Competition / Demo / Review",
    text: "围绕赛题拆解、方案表达、原型交付和答辩材料，训练把想法推进成成果的完整能力。",
  },
  {
    title: "AI 工程实践",
    meta: "LLM Gateway / Agent / Ops",
    text: "基于社团 API 网关和自动化工具链，指导模型接入、Prompt 工作流和 AI 应用落地。",
  },
];
const mentorPath = [
  ["01", "补基础", "从编程语言、Git、接口和数据库开始，把项目协作的基础动作练稳。"],
  ["02", "进项目", "参与社团工具、竞赛 Demo 或 AI 工作流小任务，在真实上下文里提升。"],
  ["03", "做复盘", "通过代码评审、项目复盘和答辩演练，把经验沉淀成可复用能力。"],
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
  {
    code: "Backend",
    title: "后端引擎",
    stack: "Java / Spring Boot / MySQL / Redis",
    text: "构建能稳定运行的服务端系统，理解接口、数据、权限、缓存和并发。",
    modules: ["Java 基础", "Spring Boot", "MySQL 建模", "Redis 缓存", "接口安全"],
    skillIds: ["java", "spring", "mysql", "redis", "security"],
  },
  {
    code: "Frontend",
    title: "前端交互",
    stack: "HTML / CSS / JavaScript / Vue3",
    text: "把想法变成可操作、可演示、可维护的用户界面，兼顾审美和工程质量。",
    modules: ["响应式布局", "Vue3 组件", "Vite 工程化", "动效细节", "可访问性"],
    skillIds: ["vue", "product", "test"],
  },
  {
    code: "AI & Data",
    title: "智能与数据",
    stack: "Python / LLM / 数据分析 / 大数据",
    text: "围绕模型调用、数据处理和 Agent 工作流，把 AI 能力接入真实项目。",
    modules: ["Python 脚本", "Prompt 工程", "数据清洗", "可视化分析", "Agent 工作流"],
    skillIds: ["python", "ai", "bigdata", "analysis", "mysql"],
  },
  {
    code: "Algorithm",
    title: "算法与基础",
    stack: "C/C++ / 数据结构 / 算法 / 408",
    text: "训练计算机底层思维，支撑竞赛、考研和复杂工程问题的长期能力。",
    modules: ["C/C++ 基础", "数据结构", "算法题训练", "操作系统", "计算机网络"],
    skillIds: ["cpp", "algorithm", "java"],
  },
  {
    code: "Quality",
    title: "测试与安全",
    stack: "测试流程 / 自动化 / Web 安全",
    text: "让项目不只“能跑”，还要能稳定、可验证、可排查，具备基本安全意识。",
    modules: ["单元测试", "接口测试", "自动化测试", "权限校验", "基础安全"],
    skillIds: ["test", "security", "vue", "spring", "docker"],
  },
  {
    code: "Ops",
    title: "运维与交付",
    stack: "Linux / Docker / Nginx / CI",
    text: "掌握部署、日志、容器和线上排错，让作品真正运行在服务器上。",
    modules: ["Linux 命令", "Docker 部署", "Nginx 反代", "日志排查", "CI 构建"],
    skillIds: ["linux", "docker", "security", "spring"],
  },
  {
    code: "Full Stack",
    title: "全栈与 API",
    stack: "TypeScript / Node.js / Go / API Design",
    text: "从前端交互到后端接口和服务治理，训练完整系统的拆解、联调和交付能力。",
    modules: ["TypeScript", "Node.js", "Go", "REST API", "接口文档"],
    skillIds: ["typescript", "node", "go", "api-design", "vue"],
  },
  {
    code: "Mobile",
    title: "移动与跨端",
    stack: "Android / iOS / Flutter / HarmonyOS",
    text: "面向移动端应用和跨平台展示，适合后续扩展社团工具、活动签到和移动端报名体验。",
    modules: ["Android", "iOS", "Flutter", "鸿蒙", "移动端适配"],
    skillIds: ["android", "ios", "flutter", "harmony", "uiux"],
  },
  {
    code: "Cloud Native",
    title: "云原生与 MLOps",
    stack: "Kubernetes / Nginx / Cloud / MLOps",
    text: "把项目部署、扩缩容、监控和模型服务管理串起来，为后续真实线上系统做准备。",
    modules: ["Kubernetes", "Nginx", "云服务", "监控告警", "MLOps"],
    skillIds: ["kubernetes", "nginx", "cloud", "mlops", "docker"],
  },
  {
    code: "Product & Docs",
    title: "产品设计与文档",
    stack: "UI/UX / 产品 / 技术写作 / BI",
    text: "把需求、体验、数据和文档表达清楚，让项目更容易被理解、展示和持续迭代。",
    modules: ["UI/UX", "产品分析", "技术写作", "BI 看板", "演示材料"],
    skillIds: ["uiux", "product", "tech-writing", "bi", "analysis"],
  },
  {
    code: "CS Growth",
    title: "计算机基础与认证",
    stack: "408 / 软考 / 网络工程 / 架构",
    text: "面向长期成长和升学就业，补齐计算机基础、网络、系统设计和工程表达能力。",
    modules: ["408", "软考", "网络工程", "软件架构", "系统设计"],
    skillIds: ["cs408", "soft-exam", "network", "architecture", "algorithm"],
  },
];
const arsenalStages = [
  ["00", "入门基础", "编程语言、Git、命令行、Markdown，把协作和表达的基础动作练稳。"],
  ["01", "方向分流", "根据兴趣进入后端、前端、AI 数据、算法基础、测试安全或运维交付方向。"],
  ["02", "项目实战", "参与招新系统、API 网关、竞赛 Demo、自动化脚本和数据分析任务。"],
  ["03", "工程进阶", "补齐测试、性能、权限、部署、复盘和文档，让作品具备长期维护能力。"],
];
const arsenalSkillNodes = [
  {
    id: "java",
    name: "Java",
    role: "后端主语言",
    base: "语法、面向对象、集合、异常、IO",
    modules: ["Java SE", "面向对象", "集合框架", "JVM 入门", "代码规范"],
    practice: "完成报名系统的接口实体、校验逻辑或后台状态流转。",
    links: ["Spring Boot", "MySQL", "Redis", "算法"],
  },
  {
    id: "python",
    name: "Python",
    role: "AI 与自动化脚本入口",
    base: "语法、文件处理、HTTP 请求、数据清洗",
    modules: ["Python 基础", "爬虫与接口", "数据处理", "可视化", "AI SDK 调用"],
    practice: "写一个报名数据清洗脚本，或接入 API 网关完成 AI 自动摘要。",
    links: ["AI", "大数据", "数据分析", "测试"],
  },
  {
    id: "vue",
    name: "Vue3",
    role: "前端应用框架",
    base: "HTML、CSS、JavaScript、组件化思维",
    modules: ["Composition API", "组件拆分", "状态管理", "表单交互", "Vite 构建"],
    practice: "继续迭代招新网站页面、部门详情页和管理后台交互。",
    links: ["产品", "测试", "Docker", "Spring Boot"],
  },
  {
    id: "spring",
    name: "Spring Boot",
    role: "后端工程框架",
    base: "Java、HTTP、MVC、依赖注入",
    modules: ["Controller", "Service", "Repository", "登录鉴权", "接口文档"],
    practice: "把当前 localStorage 报名数据迁移为真实后端接口。",
    links: ["Java", "MySQL", "Redis", "安全"],
  },
  {
    id: "mysql",
    name: "MySQL",
    role: "关系型数据存储",
    base: "表结构、SQL、索引、事务",
    modules: ["表设计", "CRUD", "索引优化", "事务", "备份"],
    practice: "设计报名表、部门表、管理员表和审核记录表。",
    links: ["Java", "Spring Boot", "数据分析", "安全"],
  },
  {
    id: "redis",
    name: "Redis",
    role: "缓存与状态加速",
    base: "Key-Value、过期时间、缓存策略",
    modules: ["缓存", "计数器", "验证码", "限流", "会话"],
    practice: "为后台登录、报名统计或接口限流设计缓存方案。",
    links: ["Spring Boot", "安全", "Linux", "Docker"],
  },
  {
    id: "linux",
    name: "Linux",
    role: "服务器基本功",
    base: "命令行、文件权限、进程、日志",
    modules: ["常用命令", "用户权限", "进程管理", "日志排查", "Shell"],
    practice: "把 Vite 构建产物部署到服务器并配置静态站点。",
    links: ["Docker", "Nginx", "安全", "测试"],
  },
  {
    id: "docker",
    name: "Docker",
    role: "容器化交付",
    base: "镜像、容器、端口、卷、Compose",
    modules: ["Dockerfile", "Compose", "镜像构建", "环境变量", "服务编排"],
    practice: "为前端、后端和数据库写一套本地演示环境。",
    links: ["Linux", "Spring Boot", "MySQL", "测试"],
  },
  {
    id: "cpp",
    name: "C/C++",
    role: "底层与算法基础",
    base: "指针、内存、结构体、STL",
    modules: ["C 语法", "C++ STL", "内存模型", "数据结构", "算法训练"],
    practice: "用 C++ 完成基础算法题和数据结构实现。",
    links: ["算法", "Linux", "408", "安全"],
  },
  {
    id: "algorithm",
    name: "算法",
    role: "问题拆解能力",
    base: "复杂度、数组、链表、树、图",
    modules: ["复杂度", "排序搜索", "动态规划", "图论", "刷题复盘"],
    practice: "每周完成一组算法题，并写复盘说明解题思路。",
    links: ["C/C++", "Java", "数据结构", "竞赛"],
  },
  {
    id: "test",
    name: "测试",
    role: "质量保障",
    base: "用例设计、断言、接口检查、回归测试",
    modules: ["单元测试", "页面测试", "接口测试", "自动化测试", "Bug 复盘"],
    practice: "为报名校验、后台筛选、页面结构写稳定测试。",
    links: ["Vue3", "Spring Boot", "Docker", "安全"],
  },
  {
    id: "security",
    name: "安全",
    role: "权限与风险意识",
    base: "登录、鉴权、输入校验、敏感信息保护",
    modules: ["Token", "权限控制", "XSS", "SQL 注入", "日志脱敏"],
    practice: "把当前前端口令升级为后端登录和角色权限方案。",
    links: ["Spring Boot", "MySQL", "测试", "Linux"],
  },
  {
    id: "ai",
    name: "AI",
    role: "智能应用能力",
    base: "模型调用、Prompt、上下文、工具调用",
    modules: ["LLM API", "Prompt 设计", "RAG 入门", "Agent", "工作流"],
    practice: "基于 api.zhuoruan.xyz 做报名摘要、FAQ 助手或项目文档生成。",
    links: ["Python", "数据分析", "大数据", "产品"],
  },
  {
    id: "bigdata",
    name: "大数据",
    role: "批量数据处理",
    base: "数据采集、清洗、统计、可视化",
    modules: ["数据采集", "清洗转换", "统计分析", "可视化", "数据看板"],
    practice: "对报名来源、部门意向、审核状态做统计看板。",
    links: ["Python", "MySQL", "数据分析", "AI"],
  },
  {
    id: "product",
    name: "产品",
    role: "需求与体验设计",
    base: "用户场景、流程图、原型、文案",
    modules: ["需求分析", "原型设计", "竞品分析", "交互细节", "演示表达"],
    practice: "设计部门详情、报名转化和后台审核流程的产品方案。",
    links: ["Vue3", "数据分析", "AI", "测试"],
  },
  {
    id: "analysis",
    name: "数据分析",
    role: "从数据里找判断",
    base: "指标、表格、图表、结论表达",
    modules: ["Excel", "SQL 查询", "Python 分析", "图表表达", "结论复盘"],
    practice: "输出招新报名趋势、部门热度和面试转化分析。",
    links: ["Python", "MySQL", "大数据", "产品"],
  },
  {
    id: "typescript",
    name: "TypeScript",
    role: "大型前端和全栈项目类型系统",
    base: "JavaScript、类型、接口、泛型",
    modules: ["类型标注", "接口设计", "泛型", "工程配置", "类型收窄"],
    practice: "把复杂表单、API 返回值和后台筛选条件抽成类型清晰的数据结构。",
    links: ["Vue3", "Node.js", "API 设计", "测试"],
  },
  {
    id: "node",
    name: "Node.js",
    role: "JavaScript 服务端与工具链",
    base: "JavaScript、npm、HTTP、异步编程",
    modules: ["Express", "文件处理", "接口服务", "脚本工具", "构建工具"],
    practice: "为招新数据写一个导出、校验或批处理脚本服务。",
    links: ["TypeScript", "API 设计", "Docker", "测试"],
  },
  {
    id: "go",
    name: "Go",
    role: "高并发服务与云原生语言",
    base: "语法、结构体、接口、协程",
    modules: ["Go 基础", "Goroutine", "HTTP 服务", "并发模型", "CLI 工具"],
    practice: "写一个轻量 API 健康检查或日志分析工具。",
    links: ["Docker", "Linux", "Kubernetes", "API 设计"],
  },
  {
    id: "api-design",
    name: "API 设计",
    role: "前后端协作契约",
    base: "HTTP、REST、状态码、JSON、鉴权",
    modules: ["REST 规范", "状态码", "接口文档", "错误码", "版本管理"],
    practice: "为报名提交、审核状态、部门详情设计一套后端接口草案。",
    links: ["Spring Boot", "Node.js", "测试", "安全"],
  },
  {
    id: "android",
    name: "Android",
    role: "安卓应用开发",
    base: "Kotlin/Java、Activity、布局、网络请求",
    modules: ["Kotlin", "Jetpack", "网络请求", "本地存储", "移动 UI"],
    practice: "设计一个社团活动签到或报名查询移动端原型。",
    links: ["Java", "UI/UX", "API 设计", "测试"],
  },
  {
    id: "ios",
    name: "iOS",
    role: "苹果生态应用开发",
    base: "Swift、SwiftUI、状态、网络请求",
    modules: ["Swift", "SwiftUI", "列表表单", "网络层", "App 打包"],
    practice: "把招新报名流程改造成 iOS 原型页面。",
    links: ["UI/UX", "API 设计", "产品", "测试"],
  },
  {
    id: "flutter",
    name: "Flutter",
    role: "跨平台移动开发",
    base: "Dart、Widget、布局、状态管理",
    modules: ["Dart", "Widget", "路由", "状态管理", "跨端打包"],
    practice: "做一个可同时演示安卓和 iOS 的社团工具原型。",
    links: ["Android", "iOS", "UI/UX", "API 设计"],
  },
  {
    id: "harmony",
    name: "鸿蒙",
    role: "国产移动生态方向",
    base: "ArkTS、组件、页面路由、设备适配",
    modules: ["ArkTS", "声明式 UI", "路由", "数据绑定", "多端适配"],
    practice: "探索招新展示页或活动通知页的鸿蒙端实现。",
    links: ["UI/UX", "产品", "API 设计", "测试"],
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    role: "容器编排与服务治理",
    base: "Docker、Linux、YAML、服务发现",
    modules: ["Pod", "Deployment", "Service", "ConfigMap", "Ingress"],
    practice: "把前后端和数据库拆成可编排的演示环境。",
    links: ["Docker", "Linux", "Nginx", "云服务"],
  },
  {
    id: "nginx",
    name: "Nginx",
    role: "反向代理与静态资源服务",
    base: "HTTP、域名、端口、配置文件",
    modules: ["静态托管", "反向代理", "HTTPS", "缓存", "日志"],
    practice: "为招新网站配置生产静态资源和 API 反向代理。",
    links: ["Linux", "Docker", "安全", "云服务"],
  },
  {
    id: "cloud",
    name: "云服务",
    role: "线上部署与资源管理",
    base: "服务器、域名、对象存储、数据库",
    modules: ["云服务器", "域名解析", "对象存储", "数据库服务", "监控"],
    practice: "设计一套从代码到线上访问的部署链路。",
    links: ["Linux", "Docker", "Nginx", "MLOps"],
  },
  {
    id: "mlops",
    name: "MLOps",
    role: "模型服务工程化",
    base: "AI、Python、API、监控、成本意识",
    modules: ["模型部署", "调用监控", "成本统计", "评测集", "回滚策略"],
    practice: "为社团 API 网关设计模型调用监控和成本看板。",
    links: ["AI", "Python", "云服务", "大数据"],
  },
  {
    id: "uiux",
    name: "UI/UX",
    role: "体验与界面设计",
    base: "信息架构、排版、交互、可用性",
    modules: ["用户路径", "低保真原型", "视觉规范", "动效", "可用性测试"],
    practice: "优化报名页、部门详情和后台审核流程的用户体验。",
    links: ["产品", "Vue3", "数据分析", "测试"],
  },
  {
    id: "tech-writing",
    name: "技术写作",
    role: "把技术讲清楚",
    base: "Markdown、结构化表达、图示、复盘",
    modules: ["README", "接口文档", "项目复盘", "教程", "答辩材料"],
    practice: "为招新系统写开发说明、部署文档和用户手册。",
    links: ["产品", "API 设计", "测试", "数据分析"],
  },
  {
    id: "bi",
    name: "BI",
    role: "业务数据看板",
    base: "指标、SQL、图表、筛选器",
    modules: ["指标体系", "SQL 聚合", "图表组件", "数据看板", "结论表达"],
    practice: "做一个展示报名人数、部门热度和审核进度的管理看板。",
    links: ["数据分析", "MySQL", "产品", "大数据"],
  },
  {
    id: "cs408",
    name: "408",
    role: "计算机专业基础",
    base: "数据结构、计组、操作系统、计网",
    modules: ["数据结构", "计算机组成", "操作系统", "计算机网络", "真题复盘"],
    practice: "把项目中遇到的缓存、网络、进程和数据结构问题映射到基础课。",
    links: ["算法", "C/C++", "网络工程", "Linux"],
  },
  {
    id: "soft-exam",
    name: "软考",
    role: "工程与管理认证方向",
    base: "软件工程、项目管理、数据库、网络",
    modules: ["软件设计", "项目管理", "数据库", "网络基础", "案例分析"],
    practice: "用社团项目训练需求分析、系统设计和项目管理表达。",
    links: ["产品", "架构", "技术写作", "数据库"],
  },
  {
    id: "network",
    name: "网络工程",
    role: "网络与基础设施",
    base: "TCP/IP、DNS、HTTP、路由、安全",
    modules: ["TCP/IP", "DNS", "HTTP", "路由交换", "抓包分析"],
    practice: "排查域名解析、HTTPS、API 访问和服务器端口问题。",
    links: ["Linux", "Nginx", "安全", "408"],
  },
  {
    id: "architecture",
    name: "架构",
    role: "系统设计能力",
    base: "模块边界、数据流、接口、部署、扩展性",
    modules: ["分层架构", "领域建模", "接口契约", "扩展性", "可观测性"],
    practice: "为社团管理系统画出前后端、数据库、权限和部署架构图。",
    links: ["Spring Boot", "API 设计", "云服务", "技术写作"],
  },
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
const activityFeeds = [
  {
    type: "活动照片",
    title: "近期社团活动记录",
    text: "预留活动照片与现场简讯位置，后期可替换为招新宣讲、技术分享或项目路演素材。",
    meta: "Photo / 待补充",
  },
  {
    type: "竞赛速报",
    title: "竞赛获奖与立项动态",
    text: "预留国家级、省级、校级竞赛成果位，用于展示团队近期获奖、入围或项目推进消息。",
    meta: "Awards / 待补充",
  },
  {
    type: "技术分享",
    title: "下一场内部分享",
    text: "预留分享主题、主讲人、时间和地点，可用于发布 Spring Boot、Vue3、AI Agent 等培训预告。",
    meta: "Talk / 待补充",
  },
  {
    type: "项目里程碑",
    title: "API 网关与内部工具进展",
    text: "预留社团项目里程碑，例如模型接入数量、工具上线、版本发布和训练营任务完成情况。",
    meta: "Milestone / 待补充",
  },
];
const onboardingSteps = [
  "配置 Git 与 GitHub 账号，学会提交第一条 commit。",
  "安装 Node.js，运行 npm install 与 npm run dev。",
  "阅读项目目录，理解 index.html、src/App.vue、styles.css 的关系。",
  "从一个小样式或文案问题开始，提交第一个 PR。",
];
const resourceLinks = [
  { name: "社团网盘", value: "待补充" },
  { name: "内部文档", value: "待补充" },
  { name: "推荐网课列表", value: "待补充" },
  { name: "项目任务看板", value: "待补充" },
];
const faqItems = [
  {
    question: "我不会编程能报名吗？",
    answer: "可以。研发和项目方向需要持续补基础，组织、外联、产品方向更看重表达、执行、审美和协作能力。",
  },
  {
    question: "面试主要看什么？",
    answer: "主要看真实经历、学习意愿、沟通表达和能否稳定完成任务。有项目、作品或活动经历可以重点展示。",
  },
  {
    question: "如何选择部门？",
    answer: "先看部门详情页和快速自测。喜欢写代码可优先研发，喜欢推进竞赛可看项目，喜欢表达设计可看产品或外联。",
  },
  {
    question: "入社第一周做什么？",
    answer: "完成环境配置、跑通项目、认识协作流程，并领取一个足够小的入门任务。",
  },
];
const memberWall = [
  { name: "成员 A", department: "研发部", direction: "Spring Boot / API", link: "待补充" },
  { name: "成员 B", department: "产品部", direction: "UI/UX / 原型", link: "待补充" },
  { name: "成员 C", department: "项目部", direction: "竞赛 / 数据分析", link: "待补充" },
  { name: "成员 D", department: "实干青年部", direction: "AI / Flutter", link: "待补充" },
];
const departmentChoiceCards = [
  {
    question: "更喜欢写代码、拆问题、调 bug？",
    answer: "优先看研发部；如果还想做竞赛交付，可以同时了解项目部。",
    departments: ["研发部", "项目部"],
  },
  {
    question: "更喜欢沟通、组织资源、跑活动？",
    answer: "优先看外联部和组织部，重点展示责任心、表达和执行记录。",
    departments: ["外联部", "组织部"],
  },
  {
    question: "更喜欢设计体验、整理需求、做展示？",
    answer: "优先看产品部；如果愿意参与高强度项目，可再了解实干青年部。",
    departments: ["产品部", "实干青年部"],
  },
];
const formGuideSteps = [
  { code: "01", title: "身份载入", text: "姓名、学院、班级、专业等基础信息。" },
  { code: "02", title: "通信握手", text: "电话、QQ、意向部门与是否服从调剂。" },
  { code: "03", title: "能力画像", text: "特长、获奖、经历和职业规划。" },
];

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
const selectedDepartment = computed(
  () => departmentProfiles.find((item) => item.id === selectedDepartmentId.value) || departmentProfiles[0],
);
const selectedSkill = computed(
  () => arsenalSkillNodes.find((item) => item.id === selectedSkillId.value) || arsenalSkillNodes[0],
);
const relatedArsenalTracks = computed(() => {
  const tracks = arsenalTracks.filter((track) => track.skillIds.includes(selectedSkill.value.id));
  return tracks.length ? tracks : arsenalTracks.slice(0, 3);
});

function syncViewFromHash() {
  const next = window.location.hash.replace("#", "") || "home";
  if (next.startsWith("department-")) {
    const departmentId = next.replace("department-", "");
    selectedDepartmentId.value = departmentProfiles.some((item) => item.id === departmentId)
      ? departmentId
      : departmentProfiles[0].id;
    view.value = "department";
    return;
  }
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

function goDepartment(departmentId) {
  selectedDepartmentId.value = departmentId;
  window.location.hash = `department-${departmentId}`;
  view.value = "department";
}

function applyDepartmentAndRegister(departmentName) {
  form.preferredDepartment = departmentName;
  go("register");
}

function selectSkillByName(skillName) {
  const nextSkill = arsenalSkillNodes.find((item) => item.name === skillName);
  if (nextSkill) selectedSkillId.value = nextSkill.id;
}

function hasSkillNode(skillName) {
  return arsenalSkillNodes.some((item) => item.name === skillName);
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
  } catch {
    applications.value = [];
  }
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications.value));
}

function hasFormContent(payload) {
  return Object.values(payload).some((value) => String(value || "").trim());
}

function loadFormDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(FORM_DRAFT_KEY));
    if (saved && typeof saved === "object") {
      Object.assign(form, createEmptyForm(), saved);
      draftSavedAt.value = saved.savedAt || "已恢复上次草稿";
    }
  } catch {
    localStorage.removeItem(FORM_DRAFT_KEY);
  }
}

function saveFormDraft() {
  const payload = { ...form };
  if (!hasFormContent(payload)) {
    localStorage.removeItem(FORM_DRAFT_KEY);
    draftSavedAt.value = "";
    return;
  }
  const savedAt = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify({ ...payload, savedAt }));
  draftSavedAt.value = `草稿已自动保存 ${savedAt}`;
}

function clearFormDraft() {
  localStorage.removeItem(FORM_DRAFT_KEY);
  draftSavedAt.value = "";
}

function onPhotoChange(event) {
  const file = event.target.files && event.target.files[0];
  form.photoName = file ? file.name : "";
}

function resetForm(clearDraft = false) {
  Object.assign(form, createEmptyForm());
  if (clearDraft) clearFormDraft();
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
  resetForm(true);
  errors.value = {};
  statusQuery.id = record.id;
  statusQuery.phone = record.phone;
  message.value = `报名成功，编号：${record.id}。请留意 QQ 或电话通知。`;
  messageType.value = "success";
}

function searchApplicationStatus() {
  const id = statusQuery.id.trim();
  const phone = statusQuery.phone.trim();
  statusResult.value = null;
  statusMessage.value = "";
  if (!id || !phone) {
    statusMessage.value = "请输入报名编号和手机号。";
    return;
  }
  loadApplications();
  const record = applications.value.find((item) => item.id === id && item.phone === phone);
  if (!record) {
    statusMessage.value = "没有查到匹配记录，请确认编号和手机号是否一致。";
    return;
  }
  statusResult.value = record;
}

function updateStatus(record, status) {
  applications.value = updateApplicationStatus(applications.value, record.id, status);
  saveApplications();
  selectedApplication.value = applications.value.find((item) => item.id === record.id) || null;
}

onMounted(() => {
  syncViewFromHash();
  loadApplications();
  loadFormDraft();
  window.addEventListener("hashchange", syncViewFromHash);
});

onUnmounted(() => window.removeEventListener("hashchange", syncViewFromHash));

watch(form, saveFormDraft, { deep: true });
</script>

<template>
  <header class="site-header">
    <a class="brand" href="#home" @click.prevent="go('home')">卓软信息工作室</a>
    <nav class="nav">
      <a href="#home" :class="{ active: view === 'home' }" @click.prevent="go('home')">宣传首页</a>
      <a href="#matrix" :class="{ active: view === 'matrix' }" @click.prevent="go('matrix')">算力矩阵</a>
      <a href="#mentor" :class="{ active: view === 'mentor' }" @click.prevent="go('mentor')">导师资源</a>
      <a href="#arsenal" :class="{ active: view === 'arsenal' }" @click.prevent="go('arsenal')">技术成长图谱</a>
      <a href="#showcase" :class="{ active: view === 'showcase' }" @click.prevent="go('showcase')">开源展厅</a>
      <a href="#register" :class="{ active: view === 'register' }" @click.prevent="go('register')">招新报名</a>
      <details
        class="nav-more"
        :class="{ active: ['matrix', 'mentor', 'arsenal', 'showcase', 'activity', 'guide', 'status'].includes(view) }"
      >
        <summary>更多</summary>
        <div class="nav-more-menu">
          <a href="#activity" :class="{ active: view === 'activity' }" @click.prevent="go('activity')">社团动态</a>
          <a href="#guide" :class="{ active: view === 'guide' }" @click.prevent="go('guide')">新生指南</a>
          <a href="#status" :class="{ active: view === 'status' }" @click.prevent="go('status')">报名查询</a>
        </div>
      </details>
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
            >{{ line }}</span
          >
        </div>
        <p class="eyebrow">The Awakening / 江苏师范大学科文学院</p>
        <h1>卓软信息工作室</h1>
        <p class="hero-copy">不要在平庸的代码里浪费天赋。卓软，重塑你的极客基因。</p>
        <div class="hero-actions">
          <button class="primary-action neon-action" type="button" @click="go('register')">
            [ Initiate Join Sequence_ ]
          </button>
          <button class="secondary-action" type="button" @click="go('matrix')">查看算力矩阵</button>
        </div>
        <div class="hero-metrics" aria-label="社团能力方向">
          <div><strong>6</strong><span>核心部门</span></div>
          <div><strong>3</strong><span>技术主线</span></div>
          <div><strong>24h</strong><span>项目训练场</span></div>
        </div>
      </div>
      <div class="hero-console-stage" aria-label="卓软代码中枢示意">
        <div class="console-orbit" aria-hidden="true">
          <span>API</span>
          <span>AI</span>
          <span>Vue</span>
          <span>Java</span>
        </div>
        <div class="hero-console">
          <div class="console-topbar">
            <span></span><span></span><span></span>
            <strong>zr-core.sh</strong>
          </div>
          <div class="console-screen">
            <p>&gt; boot zhuoruan.workspace</p>
            <p>&gt; connect api.zhuoruan.xyz</p>
            <p>&gt; load mentor.resources</p>
            <p>&gt; deploy project.showcase</p>
          </div>
          <div class="console-metrics">
            <span>API</span>
            <span>CODE</span>
            <span>AGENT</span>
          </div>
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
        <article class="department-card" v-for="department in departmentProfiles" :key="department.id">
          <button type="button" @click="goDepartment(department.id)">
            <span class="department-icon" aria-hidden="true">{{ department.icon }}</span>
            <h3>{{ department.name }}</h3>
            <p>{{ department.summary }}</p>
            <strong>查看部门档案</strong>
          </button>
        </article>
      </div>
      <div class="choice-helper">
        <div class="section-heading compact">
          <p class="eyebrow">Fit Helper</p>
          <h2>不知道选哪个部门？</h2>
        </div>
        <div class="choice-grid">
          <article v-for="item in departmentChoiceCards" :key="item.question" class="choice-card">
            <h3>{{ item.question }}</h3>
            <p>{{ item.answer }}</p>
            <div>
              <span v-for="department in item.departments" :key="department">{{ department }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section activity-preview">
      <div class="section-heading">
        <p class="eyebrow">Live Feed</p>
        <h2>社团正在发生什么</h2>
      </div>
      <div class="activity-strip">
        <article v-for="item in activityFeeds.slice(0, 3)" :key="item.title">
          <span>{{ item.type }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
      <button class="secondary-action dark-action" type="button" @click="go('activity')">查看社团动态</button>
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

  <main v-else-if="view === 'department'" class="page-shell cyber-page department-detail-page">
    <section class="department-detail-hero">
      <div>
        <p class="eyebrow">Department Profile</p>
        <h1>{{ selectedDepartment.name }}</h1>
        <p>{{ selectedDepartment.mission }}</p>
        <div class="department-detail-actions">
          <button
            class="primary-action neon-action"
            type="button"
            @click="applyDepartmentAndRegister(selectedDepartment.name)"
          >
            选择该部门并报名
          </button>
          <button class="secondary-action" type="button" @click="go('home')">返回部门列表</button>
        </div>
      </div>
      <div class="department-emblem" aria-hidden="true">
        <span>{{ selectedDepartment.icon }}</span>
        <small>{{ selectedDepartment.id }}</small>
      </div>
    </section>

    <section class="department-detail-layout">
      <aside class="department-switcher" aria-label="部门切换">
        <button
          v-for="department in departmentProfiles"
          :key="department.id"
          type="button"
          :class="{ active: selectedDepartment.id === department.id }"
          @click="goDepartment(department.id)"
        >
          <span>{{ department.icon }}</span>
          <strong>{{ department.name }}</strong>
        </button>
      </aside>

      <div class="department-profile-grid">
        <article class="department-profile-card wide">
          <p class="eyebrow">Fit Check</p>
          <h2>适合人群</h2>
          <p>{{ selectedDepartment.suitedFor }}</p>
        </article>
        <article class="department-profile-card">
          <p class="eyebrow">Learn</p>
          <h2>能学到什么</h2>
          <ul>
            <li v-for="item in selectedDepartment.learn" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article class="department-profile-card">
          <p class="eyebrow">Missions</p>
          <h2>主要任务</h2>
          <ul>
            <li v-for="item in selectedDepartment.tasks" :key="item">{{ item }}</li>
          </ul>
        </article>
        <article class="department-profile-card">
          <p class="eyebrow">Baseline</p>
          <h2>推荐基础</h2>
          <p>{{ selectedDepartment.basics }}</p>
        </article>
        <article class="department-profile-card">
          <p class="eyebrow">Advice</p>
          <h2>报名建议</h2>
          <p>{{ selectedDepartment.advice }}</p>
        </article>
        <article class="department-profile-card wide">
          <p class="eyebrow">Signals</p>
          <h2>能力关键词</h2>
          <div class="department-tags">
            <span v-for="tag in selectedDepartment.tags" :key="tag">{{ tag }}</span>
          </div>
        </article>
      </div>
    </section>
  </main>

  <main v-else-if="view === 'matrix'" class="page-shell cyber-page">
    <section class="page-title">
      <p class="eyebrow">Compute Matrix</p>
      <h1>算力矩阵</h1>
      <p>聚焦 `api.zhuoruan.xyz` 聚合网关、模型接入、客户端入口和账号额度管理，让新生直观看到社团的 AI 资源底座。</p>
    </section>

    <section class="matrix-grid">
      <article class="matrix-card" v-for="card in matrixCards" :key="card.title">
        <span>{{ card.meta }}</span>
        <h2>{{ card.title }}</h2>
        <p>{{ card.text }}</p>
        <div v-if="card.visual === 'models'" class="compute-visual" aria-hidden="true">
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

  <main v-else-if="view === 'mentor'" class="page-shell cyber-page mentor-page">
    <section class="mentor-hero">
      <div>
        <p class="eyebrow">Mentor System</p>
        <h1>导师资源</h1>
        <p>
          把“有人带、能落地、能复盘”讲清楚。导师资源页专门展示社团在架构、竞赛和 AI 工程方向能给新生提供的指导路径。
        </p>
        <div class="mentor-actions">
          <button class="primary-action neon-action" type="button" @click="go('register')">申请加入训练序列</button>
          <button class="secondary-action" type="button" @click="go('arsenal')">查看技术成长图谱</button>
        </div>
      </div>
      <div class="mentor-terminal" aria-hidden="true">
        <span>$ mentorctl status</span>
        <span>&gt; architecture: online</span>
        <span>&gt; competition: online</span>
        <span>&gt; ai_engineering: online</span>
      </div>
    </section>

    <section class="mentor-grid">
      <article class="mentor-card" v-for="track in mentorTracks" :key="track.title">
        <span>{{ track.meta }}</span>
        <h2>{{ track.title }}</h2>
        <p>{{ track.text }}</p>
      </article>
    </section>

    <section class="mentor-path" aria-label="成长路径">
      <article v-for="[step, title, text] in mentorPath" :key="step">
        <span>{{ step }}</span>
        <h2>{{ title }}</h2>
        <p>{{ text }}</p>
      </article>
    </section>
  </main>

  <main v-else-if="view === 'arsenal'" class="page-shell cyber-page">
    <section class="page-title">
      <p class="eyebrow">Tech Growth Map</p>
      <h1>技术成长图谱</h1>
      <p>参考常见计算机网课方向，整理成适合社团训练的学习图谱：先补基础，再选方向，最后进入项目实战。</p>
    </section>

    <section class="arsenal-roadmap" aria-label="技术学习路线">
      <article v-for="[step, title, text] in arsenalStages" :key="step">
        <span>{{ step }}</span>
        <h2>{{ title }}</h2>
        <p>{{ text }}</p>
      </article>
    </section>

    <section class="arsenal-layout">
      <div class="skill-tree" aria-label="技能树示意">
        <button
          v-for="node in arsenalSkillNodes"
          :key="node.id"
          class="tech-logo"
          :class="{ active: selectedSkill.id === node.id }"
          type="button"
          @click="selectedSkillId = node.id"
        >
          {{ node.name }}
        </button>
      </div>
      <div class="arsenal-detail-column">
        <section class="skill-detail-panel">
          <p class="eyebrow">Selected Node</p>
          <h2>{{ selectedSkill.name }}</h2>
          <strong>{{ selectedSkill.role }}</strong>
          <p>{{ selectedSkill.base }}</p>
          <div class="skill-detail-grid">
            <div>
              <span>学习模块</span>
              <em v-for="module in selectedSkill.modules" :key="module">{{ module }}</em>
            </div>
            <div>
              <span>实践任务</span>
              <p>{{ selectedSkill.practice }}</p>
            </div>
          </div>
          <div class="skill-links">
            <span>关联节点</span>
            <button
              v-for="link in selectedSkill.links"
              :key="link"
              type="button"
              :class="{ linked: hasSkillNode(link) }"
              @click="selectSkillByName(link)"
            >
              {{ link }}
            </button>
          </div>
        </section>

        <div class="arsenal-related-heading">
          <p class="eyebrow">Related Tracks</p>
          <h2>{{ selectedSkill.name }} 推荐方向</h2>
        </div>
        <div class="arsenal-list">
          <article v-for="track in relatedArsenalTracks" :key="track.code">
            <p>{{ track.code }}</p>
            <h2>{{ track.title }}</h2>
            <strong>{{ track.stack }}</strong>
            <span>{{ track.text }}</span>
            <div class="arsenal-modules">
              <em v-for="module in track.modules" :key="module">{{ module }}</em>
            </div>
          </article>
        </div>
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
        <p>
          这里不堆空洞截图，而是展示项目背后的技术栈、协作方式、架构取舍和交付结果。真实材料补齐后，每张卡都可以替换为对应项目链接、仓库地址或演示视频。
        </p>
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
        <div class="project-graph" aria-hidden="true"><span></span><span></span><span></span></div>
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

  <main v-else-if="view === 'activity'" class="page-shell cyber-page activity-page">
    <section class="page-title">
      <p class="eyebrow">Studio Activity</p>
      <h1>社团动态</h1>
      <p>先保留静态数据结构，后期可直接替换为真实照片、获奖速报、分享预告和项目里程碑。</p>
    </section>

    <section class="activity-grid">
      <article v-for="item in activityFeeds" :key="item.title" class="activity-card">
        <span>{{ item.type }}</span>
        <h2>{{ item.title }}</h2>
        <p>{{ item.text }}</p>
        <strong>{{ item.meta }}</strong>
      </article>
    </section>

    <section class="member-wall">
      <div class="section-heading">
        <p class="eyebrow">Member Wall</p>
        <h2>成员方向展示</h2>
      </div>
      <div class="member-grid">
        <article v-for="member in memberWall" :key="member.name" class="member-card">
          <span>{{ member.name }}</span>
          <h3>{{ member.department }}</h3>
          <p>{{ member.direction }}</p>
          <small>{{ member.link }}</small>
        </article>
      </div>
    </section>
  </main>

  <main v-else-if="view === 'guide'" class="page-shell cyber-page guide-page">
    <section class="page-title">
      <p class="eyebrow">Newbie Guide</p>
      <h1>新生入门指南</h1>
      <p>技术成长图谱负责长期路线，这里只解决入社第一周怎么开始。</p>
    </section>

    <section class="guide-layout">
      <article class="guide-panel">
        <p class="eyebrow">Week 01</p>
        <h2>上手清单</h2>
        <ol>
          <li v-for="item in onboardingSteps" :key="item">{{ item }}</li>
        </ol>
      </article>
      <article class="guide-panel">
        <p class="eyebrow">Resources</p>
        <h2>常用资源</h2>
        <dl class="resource-list">
          <template v-for="item in resourceLinks" :key="item.name">
            <dt>{{ item.name }}</dt>
            <dd>{{ item.value }}</dd>
          </template>
        </dl>
      </article>
    </section>

    <section class="faq-grid">
      <article v-for="item in faqItems" :key="item.question" class="faq-card">
        <h2>{{ item.question }}</h2>
        <p>{{ item.answer }}</p>
      </article>
    </section>
  </main>

  <main v-else-if="view === 'status'" class="page-shell cyber-page status-page">
    <section class="page-title">
      <p class="eyebrow">Application Status</p>
      <h1>报名状态查询</h1>
      <p>输入报名成功后生成的编号和手机号，可以查看当前前端演示数据里的审核进度。</p>
    </section>

    <section class="status-layout">
      <form class="status-panel" @submit.prevent="searchApplicationStatus">
        <label>报名编号<input v-model.trim="statusQuery.id" placeholder="例如 ZR-2026-0001" /></label>
        <label>手机号<input v-model.trim="statusQuery.phone" inputmode="tel" maxlength="11" /></label>
        <button class="primary-action" type="submit">查询进度</button>
        <p class="notice error">{{ statusMessage }}</p>
      </form>

      <article v-if="statusResult" class="status-result">
        <span>{{ statusResult.id }}</span>
        <h2>{{ statusResult.name }} / {{ statusResult.preferredDepartment }}</h2>
        <p>当前状态：{{ statusResult.status }}</p>
        <p>班级：{{ statusResult.className }}</p>
        <p>提交时间：{{ statusResult.createdAt }}</p>
      </article>
      <article v-else class="status-result placeholder">
        <span>WAITING</span>
        <h2>等待查询</h2>
        <p>提交报名后请保存编号；后端接入后这里可以直接查询真实审核状态。</p>
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
        <div class="form-step-guide">
          <article v-for="step in formGuideSteps" :key="step.code">
            <span>{{ step.code }}</span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.text }}</p>
          </article>
        </div>
        <p class="draft-status">{{ draftSavedAt || "填写内容会自动保存为本机草稿" }}</p>
        <button class="secondary-action dark-action" type="button" @click="go('status')">查询报名状态</button>
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
            <label
              >姓名<input name="name" v-model.trim="form.name" /><small>{{ errors.name }}</small></label
            >
            <label
              >性别<select name="gender" v-model="form.gender">
                <option value="">请选择</option>
                <option>男</option>
                <option>女</option></select
              ><small>{{ errors.gender }}</small></label
            >
            <label
              >出生年月<input name="birthDate" type="month" v-model="form.birthDate" /><small>{{
                errors.birthDate
              }}</small></label
            >
            <label
              >民族<input name="ethnicity" v-model.trim="form.ethnicity" placeholder="例如：汉族" /><small>{{
                errors.ethnicity
              }}</small></label
            >
            <label
              >政治面貌<input
                name="politicalStatus"
                v-model.trim="form.politicalStatus"
                placeholder="例如：共青团员"
              /><small>{{ errors.politicalStatus }}</small></label
            >
            <label
              >二级学院<input name="college" v-model.trim="form.college" placeholder="例如：科文学院" /><small>{{
                errors.college
              }}</small></label
            >
            <label
              >系别<input
                name="departmentMajor"
                v-model.trim="form.departmentMajor"
                placeholder="例如：软件工程系"
              /><small>{{ errors.departmentMajor }}</small></label
            >
            <label
              >班级<input name="className" v-model.trim="form.className" placeholder="例如：软件工程 2401" /><small>{{
                errors.className
              }}</small></label
            >
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
            <label
              >联系电话<input name="phone" v-model.trim="form.phone" inputmode="tel" maxlength="11" /><small>{{
                errors.phone
              }}</small></label
            >
            <label
              >QQ<input name="qq" v-model.trim="form.qq" inputmode="numeric" /><small>{{ errors.qq }}</small></label
            >
            <label
              >意向部门<select name="preferredDepartment" v-model="form.preferredDepartment">
                <option value="">请选择</option>
                <option v-for="item in departments" :key="item">{{ item }}</option></select
              ><small>{{ errors.preferredDepartment }}</small></label
            >
            <label
              >是否服从调剂<select name="acceptAdjustment" v-model="form.acceptAdjustment">
                <option value="">请选择</option>
                <option>是</option>
                <option>否</option></select
              ><small>{{ errors.acceptAdjustment }}</small></label
            >
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
          <label class="full"
            >爱好及特长<textarea name="strengths" rows="4" v-model.trim="form.strengths"></textarea
            ><small>{{ errors.strengths }}</small></label
          >
          <label class="full">曾获奖项<textarea name="awards" rows="3" v-model.trim="form.awards"></textarea></label>
          <label class="full"
            >任职经历<textarea name="experience" rows="3" v-model.trim="form.experience"></textarea>
          </label>
          <label class="full"
            >职业规划<textarea name="careerPlan" rows="4" v-model.trim="form.careerPlan"></textarea
            ><small>{{ errors.careerPlan }}</small></label
          >
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
      <label
        >部门<select data-filter-department v-model="filters.department">
          <option value="">全部部门</option>
          <option v-for="item in departments" :key="item">{{ item }}</option>
        </select></label
      >
      <label
        >状态<select data-filter-status v-model="filters.status">
          <option value="">全部状态</option>
          <option v-for="item in statuses" :key="item">{{ item }}</option>
        </select></label
      >
      <label>搜索<input data-filter-keyword v-model.trim="filters.keyword" placeholder="姓名、电话、QQ、班级" /></label>
      <p>{{ adminStats }}</p>
    </section>

    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>姓名</th>
            <th>班级</th>
            <th>意向部门</th>
            <th>状态</th>
            <th>联系电话</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody data-application-list>
          <tr v-if="!filteredApplications.length">
            <td colspan="6" class="empty">暂无符合条件的报名记录</td>
          </tr>
          <tr v-for="record in filteredApplications" :key="record.id">
            <td>{{ record.name }}</td>
            <td>{{ record.className }}</td>
            <td>{{ record.preferredDepartment }}</td>
            <td>
              <span class="status">{{ record.status }}</span>
            </td>
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
        <dt>报名编号</dt>
        <dd>{{ selectedApplication.id }}</dd>
        <dt>姓名</dt>
        <dd>{{ selectedApplication.name }}</dd>
        <dt>性别</dt>
        <dd>{{ selectedApplication.gender }}</dd>
        <dt>出生年月</dt>
        <dd>{{ selectedApplication.birthDate }}</dd>
        <dt>民族</dt>
        <dd>{{ selectedApplication.ethnicity }}</dd>
        <dt>政治面貌</dt>
        <dd>{{ selectedApplication.politicalStatus }}</dd>
        <dt>二级学院</dt>
        <dd>{{ selectedApplication.college }}</dd>
        <dt>系别</dt>
        <dd>{{ selectedApplication.departmentMajor }}</dd>
        <dt>班级</dt>
        <dd>{{ selectedApplication.className }}</dd>
        <dt>联系电话</dt>
        <dd>{{ selectedApplication.phone }}</dd>
        <dt>QQ</dt>
        <dd>{{ selectedApplication.qq }}</dd>
        <dt>意向部门</dt>
        <dd>{{ selectedApplication.preferredDepartment }}</dd>
        <dt>服从调剂</dt>
        <dd>{{ selectedApplication.acceptAdjustment }}</dd>
        <dt>照片文件</dt>
        <dd>{{ selectedApplication.photoName || "未上传" }}</dd>
        <dt>爱好及特长</dt>
        <dd>{{ selectedApplication.strengths }}</dd>
        <dt>曾获奖项</dt>
        <dd>{{ selectedApplication.awards || "未填写" }}</dd>
        <dt>任职经历</dt>
        <dd>{{ selectedApplication.experience || "未填写" }}</dd>
        <dt>职业规划</dt>
        <dd>{{ selectedApplication.careerPlan }}</dd>
      </dl>
    </section>
  </main>
</template>
