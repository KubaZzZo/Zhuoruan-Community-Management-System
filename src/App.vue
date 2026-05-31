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
const views = ["home", "register", "admin"];
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

const filters = reactive({
  department: "",
  status: "",
  keyword: "",
});

const departments = DEPARTMENTS;
const statuses = STATUSES;
const departmentCards = [
  ["研发部", "承担开发任务与框架设计，是社团核心技术部门，关注计划、设计、执行、测试和维护完整流程。"],
  ["项目部", "负责项目开发与竞赛培训，覆盖数学建模、数据分析、AI、物联网、软件开发和创新创业。"],
  ["外联部", "负责赞助、经费、外事联络和礼仪安排，为社团活动争取资源并推动校内外合作。"],
  ["组织部", "负责组织活动、物资管理、宣传设计、会场布置和社团日常活动支持。"],
  ["产品部", "负责美工创意、需求分析、产品生命周期管理，协助技术团队打造有价值的项目成果。"],
  ["实干青年部", "拥有丰富竞赛资源，注重编码能力、沟通能力和团队协作能力培养，原则上不直接对外招新。"],
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
        <p class="eyebrow">江苏师范大学科文学院 · 院级特色社团</p>
        <h1>卓软信息工作室</h1>
        <p class="hero-copy">
          以科技创新为主线，连接软件工程、数据、人工智能与产品实践，为同学提供项目开发、竞赛训练和团队协作的平台。
        </p>
        <div class="hero-actions">
          <button class="primary-action" type="button" @click="go('register')">立即报名</button>
          <a class="secondary-action" href="#departments">了解部门</a>
        </div>
        <div class="hero-metrics" aria-label="社团能力方向">
          <div><strong>6</strong><span>核心部门</span></div>
          <div><strong>5</strong><span>研发流程</span></div>
          <div><strong>1</strong><span>招新入口</span></div>
        </div>
      </div>
      <div class="hero-panel" aria-label="社团关键词">
        <span>科技</span><span>前沿</span><span>创作</span><span>项目实战</span>
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
        <article class="department-card" v-for="[name, text] in departmentCards" :key="name">
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

  <main v-else-if="view === 'register'" class="page-shell">
    <section class="page-title">
      <p class="eyebrow">Vue3 Recruitment Form</p>
      <h1>卓软信息工作室招新报名表</h1>
      <p>当前只实现 Vue3 前端，后端 Spring Boot 与 MySQL 数据库在下一阶段接入。</p>
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
