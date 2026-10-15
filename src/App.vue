<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import RecruitmentReceipt from "./RecruitmentReceipt.vue";
import FreshmanJourney from "./FreshmanJourney.vue";
import {
  ALL_DEPARTMENTS,
  COLLEGES,
  DEPARTMENT_PROFILES,
  DEPARTMENTS,
  FIELD_LABELS,
  FIELD_LIMITS,
  GENDERS,
  LEGACY_DEPARTMENTS,
  POLITICAL_STATUSES,
  STATUSES,
  applicationReceiptText,
  csvCell,
  isPortraitPhoto,
  recruitmentNotice,
  validateApplication,
} from "./recruitment.js";
import {
  backupRecruitmentSeason,
  changeOwnPassword,
  changeRecruitmentStatus,
  correctRecruitment,
  createStaffAccount,
  exportRecruitmentList,
  fetchRecruitmentDetail,
  fetchRecruitmentList,
  fetchRecruitmentPolicy,
  fetchSeasons,
  fetchSession,
  fetchStaffAccounts,
  loginAccount,
  logoutAccount,
  lookupRecruitment,
  deleteRecruitment,
  purgeSeason,
  replaceRecruitmentPhoto,
  resetStaffPassword,
  setStaffDisabled,
  submitRecruitment,
  transferRecruitment,
} from "./recruitmentApi.js";

function newSubmissionKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
let submissionKey = newSubmissionKey();
const RECEIPT_SESSION_KEY = "zhuoruan_recruitment_receipt";
const FORM_DRAFT_KEY = "zhuoruan_recruitment_form_draft";
const views = ["home", "department", "register", "status", "admin"];
const view = ref("home");
const currentAccount = ref(null);
const showLogin = ref(false);
const username = ref("");
const password = ref("");
const loginError = ref("");
const loginLoading = ref(false);
const policy = ref({ isOpen: false, message: "正在读取报名政策。", retentionDays: 180, season: "2026" });
const form = reactive({
  name: "",
  gender: "",
  birthDate: "",
  ethnicity: "",
  politicalStatus: "",
  college: "",
  departmentMajor: "",
  className: "",
  studentId: "",
  phone: "",
  qq: "",
  preferredDepartment: "",
  acceptAdjustment: "",
  photoName: "",
  photoData: "",
  strengths: "",
  awards: "",
  experience: "",
  careerPlan: "",
});
const errors = ref({});
const message = ref("");
const receipt = ref(null);
const reviewOpen = ref(false);
const isOnline = ref(typeof navigator === "undefined" || navigator.onLine);
const submitting = ref(false);
const draftSavedAt = ref("");
const draftRestored = ref(false);
const photoInput = ref(null);
const usernameInput = ref(null);
const loginDialog = ref(null);
let loginReturnFocus;
const errorSummary = ref(null);
const statusQuery = reactive({ studentId: "", phone: "" });
const statusResult = ref(null);
const statusMessage = ref("");
const statusLoading = ref(false);
let statusRequestId = 0;
const applications = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const filters = reactive({ department: "", status: "", keyword: "", season: "" });
const counts = ref({});
const seasons = ref([]);
const listLoading = ref(false);
const listError = ref("");
const listUpdatedAt = ref("");
const selected = ref(null);
const detailLoading = ref(false);
const saving = ref(false);
const pendingStatus = ref("");
const pendingNote = ref("");
const adminNotice = ref("");
const adminNoticeType = ref("info");
const exportLoading = ref(false);
const seasonBackup = ref(null);
const backupDownloaded = ref(false);
const backupLoading = ref(false);
const purging = ref(false);
let listRequestId = 0;
let detailRequestId = 0;
const correctionOpen = ref(false);
const correction = reactive({});
const transferDepartment = ref("");
const rosterMode = ref(false);
const purgeConfirm = ref("");
const deleteConfirm = ref("");
const removing = ref(false);
const photoReplacing = ref(false);
const showPassword = ref(false);
const passwordForm = reactive({ currentPassword: "", newPassword: "" });
const showStaff = ref(false);
const staff = ref([]);
const staffForm = reactive({ username: "", name: "", role: "minister", department: "综合运营部" });
const departments = DEPARTMENTS;
const allDepartments = ALL_DEPARTMENTS;
const legacyDepartments = LEGACY_DEPARTMENTS;
const profiles = DEPARTMENT_PROFILES;
const statuses = STATUSES;
const colleges = COLLEGES;
const genders = GENDERS;
const politicalStatuses = POLITICAL_STATUSES;
const activeDepartment = ref(profiles[0].name);
const formKeys = Object.keys(form);
const identityKeys = [
  "name",
  "gender",
  "birthDate",
  "ethnicity",
  "politicalStatus",
  "college",
  "departmentMajor",
  "className",
  "studentId",
  "phone",
  "qq",
];
const correctionKeys = [
  "name",
  "gender",
  "birthDate",
  "ethnicity",
  "politicalStatus",
  "college",
  "departmentMajor",
  "className",
  "studentId",
  "phone",
  "qq",
  "acceptAdjustment",
  "strengths",
  "awards",
  "experience",
  "careerPlan",
];
const basicKeys = [
  "name",
  "gender",
  "birthDate",
  "ethnicity",
  "politicalStatus",
  "college",
  "departmentMajor",
  "className",
];
const contactKeys = ["studentId", "phone", "qq"];
const shortDetailKeys = [
  "studentId",
  "phone",
  "qq",
  "gender",
  "birthDate",
  "ethnicity",
  "politicalStatus",
  "college",
  "departmentMajor",
  "className",
  "preferredDepartment",
  "originalDepartment",
  "acceptAdjustment",
  "season",
];
const longDetailKeys = ["strengths", "awards", "experience", "careerPlan"];
const requiredKeys = [
  ...identityKeys,
  "preferredDepartment",
  "acceptAdjustment",
  "strengths",
  "careerPlan",
  "photoData",
];
const filledCount = computed(() => {
  const validation = validateApplication(form);
  return requiredKeys.filter((key) => String(form[key] || "").trim() && !validation.errors[key]).length;
});
const progress = computed(() => Math.round((filledCount.value / requiredKeys.length) * 100));
const errorList = computed(() => Object.entries(errors.value));
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const adminStats = computed(() => `共 ${total.value} 条报名，当前显示 ${applications.value.length} 条`);
const scopeTotal = computed(() => Object.values(counts.value).reduce((sum, count) => sum + Number(count), 0));
const reviewPosition = computed(() => applications.value.findIndex((record) => record.id === selected.value?.id));
const reviewGuidance = computed(() =>
  selected.value ? "确认报名资料，填写备注后保存。审核状态会同步到新生进度查询页。" : "",
);
const reviewActionLabels = { review: "审核", correct: "更正资料", transfer: "调剂部门", photo: "更换照片" };
const departmentProfile = computed(() => profiles.find((item) => item.name === activeDepartment.value) || profiles[0]);
const selectedLocked = computed(() =>
  Boolean(selected.value?.season && policy.value.season && selected.value.season !== policy.value.season),
);
const pastSeasons = computed(() => seasons.value.filter((item) => item.season && item.season !== policy.value.season));
const fieldLabels = FIELD_LABELS;
const fieldHints = {
  departmentMajor: "例如软件工程系，请与学院信息保持一致。",
  className: "例如 26 软件工程 1 班。",
  phone: "填写本人常用的 11 位手机号，方便面试联系。",
  qq: "填写可联系到你的 QQ 号，请留意好友申请。",
};
const formPlaceholders = {
  name: "你的姓名",
  ethnicity: "例如汉族",
  departmentMajor: "例如软件工程系",
  className: "例如 26 软件工程 1 班",
  studentId: "学生证上的数字学号",
  phone: "11 位手机号",
  qq: "你的 QQ 号",
};
const reviewKeys = formKeys.filter((key) => !["photoData", "photoName"].includes(key));
const registrationGroups = [
  { label: "基本信息", target: "field-name", keys: basicKeys },
  {
    label: "联系与志愿",
    target: "field-studentId",
    keys: [...contactKeys, "preferredDepartment", "acceptAdjustment", "photoData"],
  },
  { label: "兴趣与经历", target: "field-strengths", keys: ["strengths", "careerPlan"] },
];
const faqs = [
  {
    question: "还没有项目或获奖经历，怎么填写？",
    answer:
      "曾获奖项和任职经历为选填，没有可以留空。爱好、特长和规划如实写下目前的兴趣与想学的方向即可，审核由工作人员完成。",
  },
  {
    question: "可以选择哪些部门？",
    answer:
      "综合运营部、数据算法部和工程项目部可直接报名。每次报名选择一个意向部门；实干青年部不直接报名，仅由社长内部调剂。",
  },
  {
    question: "提交之后还要做什么？",
    answer: "提交后请保存报名回执。用学号和手机号查看进度，留意 QQ 和电话。面试与后续安排以工作人员通知为准。",
  },
  {
    question: "报名资料填错了怎么办？",
    answer: "请用报名时填写的学号和手机号查询。资料需要更正时，请联系招新工作人员核实处理，不要重复报名。",
  },
];
const policyWindow = computed(() =>
  [
    policy.value.opensAt ? `开始：${formatTime(policy.value.opensAt)}` : "",
    policy.value.closesAt ? `截止：${formatTime(policy.value.closesAt)}` : "",
  ]
    .filter(Boolean)
    .join(" · "),
);
const statusGuidance = computed(
  () =>
    ({
      待审核: {
        title: "报名已收到，等待部门审核",
        text: "请留意审核进度更新和 QQ、电话联系，无需重复提交报名。",
      },
      待面试: { title: "进入面试阶段", text: "按下方时间和地点准备面试；暂未显示安排时，以工作人员通知为准。" },
      已面试: { title: "面试已完成，等待结果", text: "请留意后续审核结果和工作人员通知，无需重复提交报名。" },
      通过: { title: "你已通过审核", text: "后续加入部门和活动安排，以工作人员通知为准。" },
      未通过: { title: "本次审核未通过", text: "如需了解情况，请联系招新工作人员，以工作人员说明为准。" },
    })[statusResult.value?.status] || { title: "报名进度", text: "请留意工作人员通知。" },
);
function groupCompleted(group) {
  const validation = validateApplication(form);
  return group.keys.filter((key) => String(form[key] || "").trim() && !validation.errors[key]).length;
}
const reviewDirty = computed(
  () =>
    Boolean(selected.value) &&
    (pendingStatus.value !== selected.value.status || pendingNote.value !== (selected.value.reviewNote || "")),
);
const correctionDirty = computed(
  () =>
    Boolean(selected.value && correctionOpen.value) &&
    correctionKeys.some((key) => correction[key] !== (selected.value[key] || "")),
);
const detailDirty = computed(() => reviewDirty.value || correctionDirty.value);
const detailBusy = computed(() => saving.value || removing.value || photoReplacing.value);

function setAdminNotice(text, type = "success") {
  adminNotice.value = text;
  adminNoticeType.value = type;
}
function resetSelectedEdits() {
  if (selected.value) {
    pendingStatus.value = selected.value.status;
    pendingNote.value = selected.value.reviewNote || "";
  }
  correctionOpen.value = false;
}
function confirmDiscardChanges() {
  if (detailBusy.value) {
    setAdminNotice("正在处理这条报名，请等待完成后继续。", "info");
    return false;
  }
  if (!detailDirty.value) return true;
  if (!window.confirm("当前报名有未保存的修改。放弃修改并继续？")) return false;
  resetSelectedEdits();
  return true;
}
function onBeforeUnload(event) {
  saveDraft();
  if (!detailDirty.value && !detailBusy.value) return;
  event.preventDefault();
  event.returnValue = "";
}
function focusContent(id) {
  const container = document.getElementById(id);
  if (!container) return;
  const target = container.querySelector("input, select, textarea") || container;
  if (!target.matches("input, select, textarea")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  container.scrollIntoView({ block: "start", behavior: "auto" });
}
function validateField(key) {
  const error = validateApplication(form).errors[key];
  if (error) errors.value[key] = error;
  else delete errors.value[key];
}
function onFormBlur(event) {
  const key = event.target.name;
  if (formKeys.includes(key) && key !== "photoData") validateField(key);
}
let policyRequest;
let policyTimer;
let policyBoundaryTimer;
function refreshPolicy() {
  if (policyRequest) return policyRequest;
  policyRequest = (async () => {
    try {
      policy.value = (await fetchRecruitmentPolicy()).policy;
      clearTimeout(policyBoundaryTimer);
      const boundary = [policy.value.opensAt, policy.value.closesAt]
        .map((value) => Date.parse(value))
        .filter((value) => value > Date.now())
        .sort((a, b) => a - b)[0];
      if (boundary)
        policyBoundaryTimer = setTimeout(
          () => void refreshPolicy(),
          Math.min(boundary - Date.now() + 250, 2_147_483_647),
        );
    } catch {
      policy.value = { ...policy.value, isOpen: false, message: "报名政策暂时无法读取，请稍后重试。" };
    } finally {
      policyRequest = null;
    }
  })();
  return policyRequest;
}
function onVisibilityChange() {
  if (document.visibilityState === "visible") void refreshPolicy();
  else saveDraft();
}
function onNetworkChange() {
  isOnline.value = navigator.onLine;
  if (isOnline.value) void refreshPolicy();
}

function closeLogin() {
  showLogin.value = false;
  if (!currentAccount.value && window.location.hash === "#admin") {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}
function onKeydown(event) {
  if (event.key === "Escape" && showLogin.value) closeLogin();
  if (event.key !== "Tab" || !showLogin.value) return;
  const controls = [
    ...(loginDialog.value?.querySelectorAll("button, input, select, textarea, a[href], [tabindex='0']") || []),
  ].filter((element) => !element.disabled && element.getClientRects().length);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    loginDialog.value?.focus();
  } else if (
    !loginDialog.value.contains(document.activeElement) ||
    (event.shiftKey && document.activeElement === first) ||
    (!event.shiftKey && document.activeElement === last)
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
function go(next) {
  if (view.value === "admin" && next !== "admin" && !confirmDiscardChanges()) return;
  if (next === "admin" && !currentAccount.value) {
    showLogin.value = true;
    return;
  }
  view.value = next;
  window.location.hash = next === "home" ? "" : next;
  window.scrollTo(0, 0);
}
function openDepartment(name) {
  if (view.value === "admin" && !confirmDiscardChanges()) return;
  activeDepartment.value = name;
  view.value = "department";
  window.location.hash = `department-${encodeURIComponent(name)}`;
  window.scrollTo(0, 0);
}
function registerFor(name) {
  form.preferredDepartment = name;
  go("register");
}
function syncView() {
  let next;
  try {
    next = decodeURIComponent(window.location.hash.replace(/^#/, "") || "home");
  } catch {
    next = "home";
  }
  if (view.value === "admin" && next !== "admin" && !confirmDiscardChanges()) {
    history.replaceState(null, "", "#admin");
    return;
  }
  if (next === "department" || next.startsWith("department-")) {
    const name = next.startsWith("department-") ? next.slice("department-".length) : profiles[0].name;
    activeDepartment.value = profiles.some((item) => item.name === name) ? name : profiles[0].name;
    view.value = "department";
    return;
  }
  if (next === "admin" && !currentAccount.value) {
    view.value = "home";
    showLogin.value = true;
    return;
  }
  if (next === "quiz") {
    next = "status";
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#status`);
  }
  view.value = views.includes(next) ? next : "home";
  if (view.value === "admin") loadApplications();
}
function rememberReceipt() {
  try {
    sessionStorage.setItem(RECEIPT_SESSION_KEY, JSON.stringify(receipt.value));
  } catch {
    message.value = "本浏览器无法暂存回执，请及时下载保存。";
  }
}
function readReceipt() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RECEIPT_SESSION_KEY) || "null");
    if (
      saved?.season === policy.value.season &&
      /^\d{8,20}$/.test(saved.studentId) &&
      /^1[3-9]\d{9}$/.test(saved.phone)
    )
      return saved;
  } catch {
    /* 禁用存储或回执损坏时，仍可手动查询。 */
  }
  return null;
}
function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || ""
    : date.toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" });
}
function shortText(value) {
  const text = String(value ?? "");
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}
function resetForm(clearDraft = false) {
  submissionKey = newSubmissionKey();
  reviewOpen.value = false;
  Object.assign(form, Object.fromEntries(formKeys.map((key) => [key, ""])));
  errors.value = {};
  if (photoInput.value) photoInput.value.value = "";
  if (clearDraft) {
    try {
      localStorage.removeItem(FORM_DRAFT_KEY);
      draftSavedAt.value = "";
    } catch {
      draftSavedAt.value = "浏览器暂时无法清除草稿，请检查本机存储权限。";
    }
    draftRestored.value = false;
  }
}
function clearDraft() {
  if (window.confirm("清除这台电脑上的未提交草稿和照片？")) resetForm(true);
}
function saveDraft() {
  const data = Object.fromEntries(formKeys.map((key) => [key, form[key]]));
  if (!Object.values(data).some(Boolean)) return;
  try {
    const savedAt = new Date().toISOString();
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify({ data, savedAt, season: policy.value.season, submissionKey }));
    draftSavedAt.value = `草稿已保存 · ${new Date(savedAt).toLocaleTimeString("zh-CN", { hour12: false })}`;
  } catch {
    draftSavedAt.value = "本浏览器无法保存草稿，请在离开前提交或自行保存填写内容。";
  }
}
function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(FORM_DRAFT_KEY) || "null");
    if (/^[a-f0-9]{64}$/.test(saved?.submissionKey || "")) submissionKey = saved.submissionKey;
    const data = saved?.data || saved;
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    Object.assign(
      form,
      Object.fromEntries(formKeys.filter((key) => typeof data[key] === "string").map((key) => [key, data[key]])),
    );
    draftSavedAt.value = "已恢复本机草稿，请核对资料后提交。";
    draftRestored.value = Object.values(form).some(Boolean);
    if (form.preferredDepartment && !departments.includes(form.preferredDepartment)) {
      form.preferredDepartment = "";
      errors.value.preferredDepartment = "部门设置已更新，请重新选择意向部门。";
    }
  } catch {
    try {
      localStorage.removeItem(FORM_DRAFT_KEY);
    } catch {
      draftSavedAt.value = "本浏览器无法读取草稿，仍可直接填写和提交。";
    }
  }
}
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("证件照请使用 JPG、PNG 或 WEBP"));
      return;
    }
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL("image/jpeg", 0.82);
      if (!isPortraitPhoto(photoData)) reject(new Error("证件照太大，请换一张"));
      else resolve({ photoData, photoName: file.name.slice(0, FIELD_LIMITS.photoName) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("照片无法读取"));
    };
    image.src = url;
  });
}
async function onPhotoChange(event) {
  try {
    if (!event.target.files?.length) return;
    if (event.target.files[0].size > 15 * 1024 * 1024) throw new Error("照片请小于 15 MB，可先裁剪或压缩后再上传。");
    Object.assign(form, await readPhoto(event.target.files?.[0]));
    delete errors.value.photoData;
  } catch (error) {
    form.photoData = "";
    errors.value.photoData = error.message;
    event.target.value = "";
  }
}
async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("无法复制");
}
async function submitApplication() {
  if (submitting.value) return;
  const result = validateApplication(form);
  errors.value = result.errors;
  if (!result.valid) {
    message.value = "请先完善标红字段。";
    await nextTick();
    errorSummary.value?.focus();
    return;
  }
  message.value = "";
  reviewOpen.value = true;
  await nextTick();
  focusContent("review-title");
}
async function confirmApplication() {
  if (submitting.value || !reviewOpen.value) return;
  submitting.value = true;
  await refreshPolicy();
  if (!policy.value.isOpen || !isOnline.value) {
    message.value = isOnline.value ? policy.value.message : "网络已断开，资料仍在本机暂存。联网后可重试。";
    submitting.value = false;
    return;
  }
  const result = validateApplication(form);
  if (!result.valid) {
    submitting.value = false;
    reviewOpen.value = false;
    await submitApplication();
    return;
  }
  try {
    saveDraft();
    const record = await submitRecruitment({ ...form }, submissionKey);
    receipt.value = {
      name: record.name,
      studentId: record.studentId,
      phone: record.phone,
      preferredDepartment: record.preferredDepartment,
      season: record.season || policy.value.season,
    };
    statusQuery.studentId = record.studentId;
    statusQuery.phone = record.phone || "";
    resetForm(true);
    message.value = "";
    rememberReceipt();
    go("status");
    await searchStatus();
  } catch (error) {
    message.value = error.message;
    if (error.payload?.errors) {
      errors.value = error.payload.errors;
      reviewOpen.value = false;
      await nextTick();
      errorSummary.value?.focus();
    }
  } finally {
    submitting.value = false;
  }
}
async function searchStatus() {
  if (statusLoading.value) return;
  if (!/^\d{8,20}$/.test(statusQuery.studentId.trim()) || !/^1[3-9]\d{9}$/.test(statusQuery.phone.trim())) {
    statusMessage.value = "请填写 8–20 位数字学号和报名时填写的 11 位手机号。";
    statusResult.value = null;
    return;
  }
  const requestId = ++statusRequestId;
  statusLoading.value = true;
  statusResult.value = null;
  statusMessage.value = "";
  try {
    const result = await lookupRecruitment(statusQuery.studentId.trim(), statusQuery.phone.trim());
    if (requestId === statusRequestId) statusResult.value = result;
  } catch (error) {
    if (requestId === statusRequestId) statusMessage.value = error.message;
  } finally {
    if (requestId === statusRequestId) statusLoading.value = false;
  }
}
async function submitLogin() {
  if (loginLoading.value) return;
  loginLoading.value = true;
  try {
    currentAccount.value = await loginAccount(username.value, password.value);
    showLogin.value = false;
    username.value = "";
    password.value = "";
    loginError.value = "";
    go("admin");
    await loadApplications(1);
  } catch (error) {
    loginError.value = error.message;
  } finally {
    loginLoading.value = false;
  }
}
async function loadApplications(nextPage = page.value) {
  if (!currentAccount.value) return;
  const requestId = ++listRequestId;
  const account = currentAccount.value;
  const current = () => requestId === listRequestId && currentAccount.value === account;
  const selectedId = selected.value?.id;
  const detailId = detailRequestId;
  listLoading.value = true;
  listError.value = "";
  let listReceived = false;
  try {
    let result = await fetchRecruitmentList({ ...filters, page: nextPage, pageSize });
    if (!current()) return;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (result.page > lastPage) {
      result = await fetchRecruitmentList({ ...filters, page: lastPage, pageSize });
      if (!current()) return;
    }
    applications.value = result.records;
    total.value = result.total;
    page.value = result.page;
    counts.value = result.counts || {};
    listUpdatedAt.value = new Date().toISOString();
    listReceived = true;
    if (
      selectedId &&
      selected.value?.id === selectedId &&
      detailId === detailRequestId &&
      !detailDirty.value &&
      !saving.value &&
      !photoReplacing.value &&
      !removing.value
    ) {
      if (applications.value.some((item) => item.id === selectedId)) {
        const loaded = await fetchRecruitmentDetail(selectedId);
        if (!current()) return;
        if (
          selected.value?.id === selectedId &&
          detailId === detailRequestId &&
          !detailDirty.value &&
          !saving.value &&
          !photoReplacing.value &&
          !removing.value
        ) {
          selected.value = loaded;
          pendingStatus.value = loaded.status;
          pendingNote.value = loaded.reviewNote || "";
        }
      } else {
        ++detailRequestId;
        detailLoading.value = false;
        selected.value = null;
      }
    }
    const seasonPayload = await fetchSeasons();
    if (!current()) return;
    seasons.value = seasonPayload.seasons || [];
    if (seasonPayload.season) policy.value = { ...policy.value, season: seasonPayload.season };
  } catch (error) {
    if (!current()) return;
    if (!listReceived) listError.value = error.message;
    setAdminNotice(error.message, "error");
    if (error.status === 401) {
      logout(true);
      setAdminNotice(error.message, "error");
      showLogin.value = true;
    }
  } finally {
    if (current()) listLoading.value = false;
  }
}

async function openApplication(record) {
  if (saving.value || removing.value || photoReplacing.value) return;
  if (!confirmDiscardChanges()) return;
  const requestId = ++detailRequestId;
  const account = currentAccount.value;
  const current = () => requestId === detailRequestId && currentAccount.value === account;
  selected.value = record;
  correctionOpen.value = false;
  transferDepartment.value = "";
  deleteConfirm.value = "";
  pendingStatus.value = record.status;
  pendingNote.value = record.reviewNote || "";

  detailLoading.value = true;
  try {
    const loaded = await fetchRecruitmentDetail(record.id);
    if (!current()) return;
    selected.value = loaded;
    pendingStatus.value = selected.value.status;
    pendingNote.value = selected.value.reviewNote || "";
  } catch (error) {
    if (!current()) return;
    selected.value = null;
    setAdminNotice(error.message, "error");
  } finally {
    if (current()) detailLoading.value = false;
  }
  await nextTick();
  if (current() && window.matchMedia("(max-width: 900px)").matches) {
    document.querySelector("[data-application-detail]")?.scrollIntoView({ behavior: "smooth" });
  }
}
function applySavedRecord(record, account, preserveReview = true) {
  if (!account || currentAccount.value !== account) return false;
  ++listRequestId;
  listLoading.value = false;
  if (!currentAccount.value) return;
  if (selected.value?.id === record.id) {
    const keepReview = preserveReview && reviewDirty.value;
    selected.value = record;
    if (!keepReview) {
      pendingStatus.value = record.status;
      pendingNote.value = record.reviewNote || "";
    }
  }
  applications.value = applications.value.map((item) =>
    item.id === record.id ? Object.fromEntries(Object.keys(item).map((key) => [key, record[key] ?? item[key]])) : item,
  );
  return true;
}
async function saveStatus(advance = false) {
  if (
    !selected.value ||
    saving.value ||
    photoReplacing.value ||
    removing.value ||
    detailLoading.value ||
    selectedLocked.value
  )
    return;
  if (advance === true && correctionDirty.value) {
    setAdminNotice("请先保存或放弃资料更正，再继续审核下一位。", "info");
    return;
  }
  if (
    pendingStatus.value !== selected.value.status &&
    ["通过", "未通过"].includes(pendingStatus.value) &&
    !window.confirm(
      `确认将 ${selected.value.name} 的审核状态改为“${pendingStatus.value}”？保存后新生可在进度查询页看到结果。`,
    )
  )
    return;
  const account = currentAccount.value;
  const reviewedId = selected.value.id;
  const index = reviewPosition.value;
  const nextId = index >= 0 ? applications.value[index + 1]?.id : undefined;
  const hasMore = page.value < maxPage.value;
  let saved = false;
  saving.value = true;
  try {
    const updated = await changeRecruitmentStatus(
      selected.value.id,
      pendingStatus.value,
      pendingNote.value.trim(),
      selected.value.version,
    );
    if (!applySavedRecord(updated, account, false)) return;
    saved = true;
    setAdminNotice(`${updated.name} 的审核已保存`);
    await loadApplications(page.value);
  } catch (error) {
    if (currentAccount.value === account) setAdminNotice(error.message, "error");
  } finally {
    saving.value = false;
  }
  if (advance !== true || !saved || currentAccount.value !== account || listError.value || listLoading.value) return;
  let next = nextId ? applications.value.find((record) => record.id === nextId) : null;
  if (!next && index >= 0 && !applications.value.some((record) => record.id === reviewedId)) {
    next = applications.value[index];
  }
  if (!next && hasMore && page.value < maxPage.value) {
    await loadApplications(page.value + 1);
    if (currentAccount.value !== account || listError.value || listLoading.value) return;
    next = applications.value[0];
  }
  if (next && next.id !== reviewedId) await openApplication(next);
  else setAdminNotice("审核已保存，已到当前筛选名单末尾。可调整筛选继续审核。", "info");
}
function beginCorrection() {
  if (!selected.value) return;
  if (correctionOpen.value) return;
  Object.assign(correction, Object.fromEntries(correctionKeys.map((key) => [key, selected.value[key] || ""])));
  correctionOpen.value = true;
}
async function saveCorrection() {
  if (
    !selected.value ||
    selectedLocked.value ||
    saving.value ||
    photoReplacing.value ||
    removing.value ||
    detailLoading.value
  )
    return;
  const account = currentAccount.value;
  const changes = Object.fromEntries(
    Object.entries(correction).filter(([key, value]) => value !== selected.value[key]),
  );
  if (!Object.keys(changes).length) {
    setAdminNotice("没有需要保存的修改");
    return;
  }
  saving.value = true;
  try {
    if (!applySavedRecord(await correctRecruitment(selected.value.id, changes, selected.value.version), account))
      return;
    correctionOpen.value = false;
    setAdminNotice("资料更正已保存");
    await loadApplications(page.value);
  } catch (error) {
    setAdminNotice(error.message, "error");
  } finally {
    saving.value = false;
  }
}
async function transferSelected() {
  if (
    !selected.value ||
    currentAccount.value?.role !== "president" ||
    !transferDepartment.value ||
    selectedLocked.value ||
    saving.value ||
    photoReplacing.value ||
    removing.value ||
    detailLoading.value
  )
    return;
  const account = currentAccount.value;
  saving.value = true;
  try {
    if (
      !applySavedRecord(
        await transferRecruitment(selected.value.id, transferDepartment.value, selected.value.version),
        account,
      )
    )
      return;
    transferDepartment.value = "";
    setAdminNotice("部门调剂已保存");
    await loadApplications(page.value);
  } catch (error) {
    setAdminNotice(error.message, "error");
  } finally {
    saving.value = false;
  }
}
function downloadCsv(filename, headers, rows, numericIndexes) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value, index) => csvCell(value, { numericText: numericIndexes.includes(index) })).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
async function exportList() {
  const account = currentAccount.value;
  const roster = rosterMode.value;
  exportLoading.value = true;
  try {
    const records = await exportRecruitmentList({ ...filters });
    if (currentAccount.value !== account) return;
    if (roster) {
      const headers = ["姓名", "学号", "部门", "班级", "学院", "电话", "QQ", "状态", "招新季"];
      const rows = records
        .filter((record) => record.status === "通过")
        .map((record) => [
          record.name,
          record.studentId,
          record.preferredDepartment,
          record.className,
          record.college,
          record.phone,
          record.qq,
          record.status,
          record.season,
        ]);
      downloadCsv("卓软成员名册.csv", headers, rows, [1, 5, 6]);
    } else {
      const headers = [
        "报名编号",
        "学号",
        "姓名",
        "性别",
        "出生年月",
        "班级",
        "学院",
        "系别",
        "电话",
        "QQ",
        "意向部门",
        "原志愿",
        "服从调剂",
        "状态",
        "面试时间",
        "面试地点",
        "面试人",
        "面试结论",
        "爱好及特长",
        "奖项",
        "经历",
        "职业规划",
        "审核备注",
        "证件照",
        "提交时间",
        "招新季",
      ];
      const rows = records.map((record) => [
        record.id,
        record.studentId,
        record.name,
        record.gender,
        record.birthDate,
        record.className,
        record.college,
        record.departmentMajor,
        record.phone,
        record.qq,
        record.preferredDepartment,
        record.originalDepartment,
        record.acceptAdjustment,
        record.status,
        record.interviewAt,
        record.interviewLocation,
        record.interviewer,
        record.interviewSummary,
        record.strengths,
        record.awards,
        record.experience,
        record.careerPlan,
        record.reviewNote,
        record.hasPhoto ? "已上传" : "未上传",
        formatTime(record.createdAt),
        record.season,
      ]);
      downloadCsv("卓软报名名单.csv", headers, rows, [1, 8, 9]);
    }
    setAdminNotice(roster ? "成员名册已导出" : "报名名单已导出");
  } catch (error) {
    setAdminNotice(error.message, "error");
  } finally {
    exportLoading.value = false;
  }
}
async function copyNotice() {
  if (!selected.value || detailLoading.value || detailBusy.value) return;
  if (detailDirty.value) {
    setAdminNotice("请先保存或放弃未保存的修改，再复制通知。", "info");
    return;
  }
  try {
    await copyText(recruitmentNotice(selected.value));
    setAdminNotice("通知文本已复制，可粘贴到 QQ。");
  } catch {
    setAdminNotice("复制失败，请手动选择通知文本。", "error");
  }
}
async function copyReceipt() {
  if (!receipt.value?.phone) return;
  try {
    await copyText(`学号：${receipt.value.studentId}\n手机号：${receipt.value.phone}`);
    message.value = "查询信息已复制";
  } catch {
    message.value = "复制失败，请手动保存学号和手机号。";
  }
}
function downloadReceipt(record) {
  if (!record?.studentId || !record?.phone) return;
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + applicationReceiptText(record)], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `卓软报名回执-${record.studentId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function goToMyStatus() {
  const identity = readReceipt() || receipt.value;
  if (identity) Object.assign(statusQuery, { studentId: identity.studentId, phone: identity.phone });
  go("status");
}
function showRoster() {
  rosterMode.value = true;
  filters.status = "通过";
}
function showApplications() {
  rosterMode.value = false;
  if (filters.status === "通过") filters.status = "";
}
function resetReviewFilters() {
  rosterMode.value = false;
  Object.assign(filters, { department: "", status: "", keyword: "", season: "" });
}
async function downloadSeasonBackup() {
  if (backupLoading.value || purging.value) return;
  const season = filters.season;
  const account = currentAccount.value;
  backupLoading.value = true;
  seasonBackup.value = null;
  backupDownloaded.value = false;
  try {
    const payload = await backupRecruitmentSeason(season);
    if (filters.season !== season || currentAccount.value !== account) return;
    const blob = new Blob([JSON.stringify(payload.backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `卓软整季备份-${season}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    seasonBackup.value = { season, token: payload.backupToken, count: payload.count };
    setAdminNotice(`整季备份包含 ${payload.count} 条报名、照片和审核历史，请确认文件已保存。`);
  } catch (error) {
    if (currentAccount.value === account) setAdminNotice(error.message, "error");
  } finally {
    backupLoading.value = false;
  }
}
async function removeSeason() {
  if (
    currentAccount.value?.role !== "president" ||
    purging.value ||
    !backupDownloaded.value ||
    seasonBackup.value?.season !== filters.season
  )
    return;
  purging.value = true;
  const account = currentAccount.value;
  try {
    const result = await purgeSeason(
      filters.season,
      purgeConfirm.value.trim(),
      seasonBackup.value.token,
      backupDownloaded.value,
    );
    if (currentAccount.value !== account) return;
    purgeConfirm.value = "";
    seasonBackup.value = null;
    backupDownloaded.value = false;
    setAdminNotice(`已清理 ${result.removed} 条 ${result.season} 报名`);
    filters.season = "";
    await loadApplications(1);
  } catch (error) {
    setAdminNotice(error.message, "error");
    if (error.status === 409) {
      seasonBackup.value = null;
      backupDownloaded.value = false;
    }
  } finally {
    purging.value = false;
  }
}
async function savePassword() {
  try {
    await changeOwnPassword(passwordForm.currentPassword, passwordForm.newPassword);
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    showPassword.value = false;
    setAdminNotice("口令已更新");
  } catch (error) {
    setAdminNotice(error.message, "error");
  }
}
async function loadStaff() {
  const account = currentAccount.value;
  showStaff.value = true;
  try {
    const loaded = await fetchStaffAccounts();
    if (currentAccount.value !== account) return;
    staff.value = loaded;
  } catch (error) {
    setAdminNotice(error.message, "error");
  }
}
async function addStaff() {
  const account = currentAccount.value;
  try {
    const created = await createStaffAccount({ ...staffForm });
    if (currentAccount.value !== account) return;
    staffForm.username = "";
    staffForm.name = "";
    setAdminNotice(`${created.account.name} 的初始口令：${created.password}。请立即转交，本页刷新后不再显示。`);
    await loadStaff();
  } catch (error) {
    setAdminNotice(error.message, "error");
  }
}
async function onReplacePhoto(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (
    !file ||
    !selected.value ||
    selectedLocked.value ||
    photoReplacing.value ||
    saving.value ||
    removing.value ||
    detailLoading.value
  ) {
    input.value = "";
    return;
  }
  photoReplacing.value = true;
  const account = currentAccount.value;
  try {
    const photo = await readPhoto(file);
    if (currentAccount.value !== account || !selected.value) return;
    const previous = selected.value.version;
    if (!applySavedRecord(await replaceRecruitmentPhoto(selected.value.id, photo, selected.value.version), account))
      return;
    setAdminNotice(selected.value.version === previous ? "证件照没有变化" : "证件照已更换");
  } catch (error) {
    setAdminNotice(error.message, "error");
  } finally {
    photoReplacing.value = false;
    input.value = "";
  }
}
async function removeSelected() {
  if (
    !selected.value ||
    removing.value ||
    saving.value ||
    photoReplacing.value ||
    detailLoading.value ||
    deleteConfirm.value !== selected.value.studentId
  )
    return;
  const account = currentAccount.value;
  removing.value = true;
  try {
    const name = selected.value.name;
    await deleteRecruitment(selected.value.id, deleteConfirm.value, selected.value.version);
    if (currentAccount.value !== account) return;
    ++listRequestId;
    ++detailRequestId;
    setAdminNotice(`${name} 的报名和证件照已删除`);
    selected.value = null;
    deleteConfirm.value = "";
    await loadApplications(page.value);
  } catch (error) {
    setAdminNotice(error.message, "error");
  } finally {
    removing.value = false;
  }
}
async function toggleStaff(account) {
  const disabling = !account.disabled;
  const prompt = disabling
    ? `停用 ${account.name}？停用后不能登录，当前会话会立即失效。`
    : `恢复 ${account.name} 的登录？`;
  if (!window.confirm(prompt)) return;
  try {
    await setStaffDisabled(account.username, disabling);
    setAdminNotice(disabling ? `${account.name} 已停用` : `${account.name} 已恢复`);
    await loadStaff();
  } catch (error) {
    setAdminNotice(error.message, "error");
  }
}
async function resetStaff(account) {
  if (!window.confirm(`重置 ${account.name} 的口令？旧口令会立即失效。`)) return;
  const current = currentAccount.value;
  try {
    const result = await resetStaffPassword(account.username);
    if (currentAccount.value !== current) return;
    setAdminNotice(`${result.account.name} 的新口令：${result.password}。请立即转交，本页刷新后不再显示。`);
  } catch (error) {
    setAdminNotice(error.message, "error");
  }
}
function logout(force = false) {
  if (force !== true && !confirmDiscardChanges()) return;
  ++listRequestId;
  ++detailRequestId;
  listLoading.value = false;
  detailLoading.value = false;
  seasonBackup.value = null;
  backupDownloaded.value = false;
  showStaff.value = false;
  staff.value = [];
  setAdminNotice("");
  logoutAccount();
  currentAccount.value = null;
  selected.value = null;
  applications.value = [];
  go("home");
}

onMounted(async () => {
  await refreshPolicy();
  restoreDraft();
  const saved = readReceipt();
  if (saved) {
    receipt.value = saved;
    Object.assign(statusQuery, { studentId: saved.studentId, phone: saved.phone });
  }
  try {
    currentAccount.value = await fetchSession();
  } catch (error) {
    loginError.value = error.message;
  }
  syncView();
  window.addEventListener("hashchange", syncView);
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onVisibilityChange);
  window.addEventListener("online", onNetworkChange);
  window.addEventListener("offline", onNetworkChange);
  window.addEventListener("pagehide", saveDraft);
  policyTimer = setInterval(() => {
    if (document.visibilityState === "visible") void refreshPolicy();
  }, 30_000);
});
onUnmounted(() => {
  ++statusRequestId;
  ++listRequestId;
  ++detailRequestId;
  clearTimeout(keywordTimer);
  clearTimeout(draftTimer);
  clearInterval(policyTimer);
  clearTimeout(policyBoundaryTimer);
  window.removeEventListener("hashchange", syncView);
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("focus", onVisibilityChange);
  window.removeEventListener("online", onNetworkChange);
  window.removeEventListener("offline", onNetworkChange);
  window.removeEventListener("pagehide", saveDraft);
});
watch(showLogin, async (open) => {
  if (open) loginReturnFocus = document.activeElement;
  await nextTick();
  if (open) usernameInput.value?.focus();
  else if (loginReturnFocus?.isConnected && loginReturnFocus !== document.body) loginReturnFocus.focus();
  else focusContent("page-title");
});
let draftTimer;
watch(
  form,
  () => {
    reviewOpen.value = false;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 300);
  },
  { deep: true },
);
watch(
  form,
  () => {
    for (const key of Object.keys(errors.value)) {
      if (key !== "photoData") validateField(key);
    }
  },
  { deep: true },
);
watch(
  () => [statusQuery.studentId, statusQuery.phone],
  () => {
    ++statusRequestId;
    statusLoading.value = false;
    statusResult.value = null;
    statusMessage.value = "";
  },
  { flush: "sync" },
);
watch(view, () => void refreshPolicy());
watch([view, activeDepartment], async () => {
  const titles = {
    home: "新生招新",
    department: activeDepartment.value,
    register: "填写报名表",
    status: "查询进度",
    admin: "工作人员后台",
  };
  document.title = `${titles[view.value]} · 卓软信息工作室`;
  await nextTick();
  if (!showLogin.value) document.getElementById("page-title")?.focus({ preventScroll: true });
});
watch(
  () => filters.season,
  () => {
    seasonBackup.value = null;
    backupDownloaded.value = false;
    purgeConfirm.value = "";
  },
);
watch(
  () => [filters.department, filters.status, filters.season],
  () => {
    if (filters.status !== "通过") rosterMode.value = false;
    if (currentAccount.value && view.value === "admin") loadApplications(1);
  },
);
let keywordTimer;
watch(
  () => filters.keyword,
  () => {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => {
      if (currentAccount.value && view.value === "admin") loadApplications(1);
    }, 250);
  },
);
</script>

<template>
  <a class="skip-link" href="#page-title" :inert="showLogin" @click.prevent="focusContent('page-title')">跳到内容</a>
  <header class="site-header" :inert="showLogin">
    <a class="brand" href="#home" @click.prevent="go('home')"
      ><img src="/zhuoruan.png" alt="卓软信息工作室标志" width="52" height="52" /><span class="brand-copy"
        ><strong>卓软信息工作室</strong></span
      ></a
    >
    <nav class="nav" aria-label="网站导航">
      <a
        href="#home"
        :aria-current="view === 'home' ? 'page' : undefined"
        :class="{ active: view === 'home' || view === 'department' }"
        @click.prevent="go('home')"
        >了解卓软</a
      >
      <a
        href="#register"
        :aria-current="view === 'register' ? 'page' : undefined"
        :class="{ active: view === 'register' }"
        @click.prevent="go('register')"
        >填写报名</a
      >
      <a
        href="#status"
        :aria-current="view === 'status' ? 'page' : undefined"
        :class="{ active: view === 'status' }"
        @click.prevent="go('status')"
        >查进度</a
      >
    </nav>
    <button
      v-if="currentAccount && view !== 'admin'"
      class="admin-entry"
      type="button"
      data-review-entry
      @click="go('admin')"
    >
      返回审核
    </button>
    <button
      v-if="currentAccount && view === 'admin'"
      class="secondary-action header-logout"
      type="button"
      data-header-logout
      @click="logout"
    >
      退出登录
    </button>
  </header>
  <p v-if="!isOnline" class="network-notice" role="status" :inert="showLogin">
    当前网络已断开。报名草稿保存在本机，联网后再提交或查询。
  </p>
  <div v-if="showLogin" class="modal-backdrop" data-admin-gate @click.self="closeLogin">
    <section
      ref="loginDialog"
      class="admin-gate"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-login-title"
    >
      <button class="modal-close" type="button" aria-label="关闭登录" @click="closeLogin">×</button>
      <p class="eyebrow">工作人员</p>
      <h2 id="staff-login-title">部长 / 社长登录</h2>
      <form @submit.prevent="submitLogin">
        <label>账号<input ref="usernameInput" v-model.trim="username" name="username" autocomplete="username" /></label>
        <label>口令<input v-model="password" name="password" type="password" autocomplete="current-password" /></label>
        <small v-if="loginError" role="alert">{{ loginError }}</small>
        <button class="primary-action" type="submit" :disabled="loginLoading">
          {{ loginLoading ? "正在登录…" : "进入后台" }}
        </button>
      </form>
    </section>
  </div>
  <main :inert="showLogin" v-if="view === 'home'" class="freshman-home">
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">江苏师范大学科文学院 · 卓软信息工作室</p>
        <h1 id="page-title" tabindex="-1">大学的第一份作品，<br /><span>从你的兴趣开始。</span></h1>
        <p class="hero-copy">
          这里有代码、项目、设计，也有沟通和活动组织。先了解你感兴趣的部门，再告诉我们你是谁、想学什么。
        </p>
        <div class="hero-actions">
          <button class="primary-action" type="button" @click="go('register')">
            {{ policy.isOpen ? "开始填写报名" : "查看报名表" }}<span aria-hidden="true"> →</span>
          </button>
          <button class="secondary-action" type="button" @click="focusContent('departments-title')">先了解部门</button>
        </div>
        <p class="hero-returning">
          已经提交过？<a href="#status" @click.prevent="goToMyStatus">用学号和手机号查看进度 →</a>
        </p>
        <div class="hero-facts">
          <span>{{ departments.length }} 个直接招新部门</span><span>提交后可查询审核进度</span>
        </div>
      </div>
      <aside class="season-card">
        <span class="opening-badge" :class="{ closed: !policy.isOpen }">{{
          policy.isOpen ? "正在接受报名" : "当前未开放"
        }}</span>
        <p class="eyebrow">{{ policy.season }} 招新季</p>
        <h2>开始之前，<br />准备好这三样。</h2>
        <ol class="preparation-list">
          <li><strong>学号与联系方式</strong><span>填写本人资料，留意 QQ 和电话。</span></li>
          <li><strong>一张清晰证件照</strong><span>JPG、PNG 或 WEBP，上传后自动压缩。</span></li>
          <li><strong>你的意向与兴趣</strong><span>选一个部门，如实介绍想学的方向。</span></li>
        </ol>
        <p v-if="policyWindow" class="policy-schedule">{{ policyWindow }}（北京时间）</p>
        <p v-if="!policy.isOpen">{{ policy.message }} 你仍可先了解部门与报名要求。</p>
      </aside>
    </section>
    <section class="section recruitment-roadmap" aria-labelledby="roadmap-title">
      <div class="section-heading">
        <p class="eyebrow">报名怎么走</p>
        <h2 id="roadmap-title">每一步，都有下一步。</h2>
      </div>
      <div class="step-row">
        <article>
          <span>01</span>
          <h3>了解部门</h3>
          <p>看工作内容和适合的兴趣方向，选择一个意向部门。</p>
        </article>
        <article>
          <span>02</span>
          <h3>填写并核对</h3>
          <p>填写资料与证件照，核对无误后正式提交。</p>
        </article>
        <article>
          <span>03</span>
          <h3>保存报名回执</h3>
          <p>下载或复制报名回执，妥善保存查询信息。</p>
        </article>
        <article>
          <span>04</span>
          <h3>查询与等候通知</h3>
          <p>用学号和手机号查进度，面试安排以工作人员通知为准。</p>
        </article>
      </div>
    </section>
    <section class="section muted" aria-labelledby="departments-title">
      <div class="section-heading">
        <p class="eyebrow">找到你的方向</p>
        <h2 id="departments-title" tabindex="-1">从感兴趣的事情，认识一个部门。</h2>
        <p>每次报名选择一个意向部门。不确定时，先看看具体会做什么。</p>
      </div>
      <div class="department-grid">
        <article v-for="(department, index) in profiles" :key="department.name" class="department-card">
          <button type="button" @click="openDepartment(department.name)">
            <div class="department-card-top">
              <span class="department-index">0{{ index + 1 }}</span
              ><span class="department-access">{{ department.direct ? "可直接报名" : "仅内部调剂" }}</span>
            </div>
            <h3>{{ department.name }}</h3>
            <p class="department-direction">{{ department.direction }}</p>
            <p>{{ department.summary }}</p>
            <strong>了解部门<span aria-hidden="true"> →</span></strong>
          </button>
        </article>
      </div>
    </section>
    <section class="section freshman-faq" aria-labelledby="faq-title">
      <div class="section-heading">
        <p class="eyebrow">先解答你的疑问</p>
        <h2 id="faq-title">第一次报名，也能心里有数。</h2>
      </div>
      <div class="faq-list">
        <details v-for="faq in faqs" :key="faq.question">
          <summary>{{ faq.question }}</summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
      <div class="home-next-step">
        <p>准备好了，就从一张报名表开始。</p>
        <button class="primary-action" type="button" @click="go('register')">填写我的报名表 →</button>
      </div>
    </section>
  </main>
  <main :inert="showLogin" v-else-if="view === 'department'" class="page-shell">
    <section class="page-title">
      <a class="back-link" href="#home" @click.prevent="go('home')">← 返回部门介绍</a>
      <p class="eyebrow">{{ departmentProfile.direction }}</p>
      <h1 id="page-title" tabindex="-1">{{ departmentProfile.name }}</h1>
      <p class="department-positioning" data-department-positioning>
        <strong>核心定位：</strong>{{ departmentProfile.summary }}
      </p>
    </section>
    <div class="department-switch" role="group" aria-label="切换部门">
      <button
        v-for="department in profiles"
        :key="department.name"
        type="button"
        :class="{ active: department.name === departmentProfile.name }"
        :aria-pressed="department.name === departmentProfile.name"
        @click="openDepartment(department.name)"
      >
        {{ department.name }}
      </button>
    </div>
    <section
      class="department-responsibilities"
      aria-labelledby="department-responsibilities-title"
      data-department-responsibilities
    >
      <h2 id="department-responsibilities-title">主要职责</h2>
      <div class="profile-grid">
        <article v-for="responsibility in departmentProfile.responsibilities" :key="responsibility.title">
          <h3>{{ responsibility.title }}</h3>
          <p>{{ responsibility.description }}</p>
        </article>
      </div>
    </section>
    <p class="department-choice-note">报名时如实介绍自己的兴趣和现有经历。是否录取由工作人员审核决定。</p>
    <button
      v-if="departmentProfile.direct"
      class="primary-action"
      type="button"
      @click="registerFor(departmentProfile.name)"
    >
      选择该部门并报名
    </button>
    <p v-else class="wide-text">实干青年部不直接报名。请先选择其他部门，再由社长调剂。</p>
  </main>
  <main :inert="showLogin" v-else-if="view === 'register'" class="page-shell">
    <FreshmanJourney
      :current="view"
      @navigate="(destination) => (destination === 'status' ? goToMyStatus() : go(destination))"
    />
    <section class="page-title">
      <h1 id="page-title" tabindex="-1">填写招新报名表</h1>
      <p>先填基本信息，再选择部门、上传证件照。奖项和经历可留空；兴趣与规划写下真实想法即可。</p>
    </section>
    <p v-if="policyWindow" class="policy-schedule">{{ policyWindow }}（北京时间）</p>
    <p v-if="!policy.isOpen" class="notice error" role="status">{{ policy.message }} 可先填写草稿，开放后再提交。</p>
    <RecruitmentReceipt v-if="receipt" :record="receipt" @copy="copyReceipt" @download="downloadReceipt(receipt)" />
    <section v-if="reviewOpen" class="application-review" data-application-review aria-labelledby="review-title">
      <p class="eyebrow">正式提交前</p>
      <h2 id="review-title" tabindex="-1">再核对一次你的报名资料</h2>
      <p>重点检查学号、电话、QQ 和意向部门。提交成功后，请保存报名回执并留意审核通知。</p>
      <img :src="form.photoData" class="applicant-photo" alt="待提交的证件照" />
      <dl class="review-facts">
        <div v-for="key in reviewKeys" :key="key">
          <dt>{{ fieldLabels[key] }}</dt>
          <dd>{{ form[key] || "未填写（选填）" }}</dd>
        </div>
      </dl>
      <div class="review-actions">
        <button
          class="primary-action"
          type="button"
          data-confirm-application
          :disabled="submitting || !policy.isOpen || !isOnline"
          @click="confirmApplication"
        >
          {{ submitting ? "正在提交，请稍候…" : "确认提交并查看进度" }}
        </button>

        <button
          class="secondary-action"
          type="button"
          :disabled="submitting"
          @click="
            reviewOpen = false;
            focusContent('field-name');
          "
        >
          返回修改
        </button>
      </div>
      <p v-if="message" class="notice error" role="alert">{{ message }}</p>
    </section>
    <p v-if="draftRestored" class="draft-restored notice" role="status">
      已恢复这台设备上的报名草稿，请核对信息。若不是你的资料，可清除本机草稿后重新填写。
    </p>
    <div class="application-layout">
      <aside class="form-side-panel">
        <p class="eyebrow">填写进度</p>
        <h2>{{ progress }}%</h2>
        <div
          class="form-progress"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`必填完成度 ${progress}%`"
        >
          <div class="progress-track"><span :style="{ width: progress + '%' }"></span></div>
        </div>
        <p>已完成 {{ filledCount }} / {{ requiredKeys.length }} 项必填资料。</p>
        <nav class="form-section-links" aria-label="报名表章节">
          <button
            v-for="(group, index) in registrationGroups"
            :key="group.label"
            type="button"
            @click="focusContent(group.target)"
          >
            <span>{{ index + 1 }} {{ group.label }}</span
            ><small>{{ groupCompleted(group) }}/{{ group.keys.length }}</small>
          </button>
        </nav>
        <p class="draft-status" role="status">{{ draftSavedAt || "填写后会自动保存本机草稿" }}</p>
      </aside>
      <form
        class="application-form"
        :class="{ 'form-is-submitting': submitting }"
        :inert="submitting"
        @focusout="onFormBlur"
        @submit.prevent="submitApplication"
      >
        <div v-if="errorList.length" ref="errorSummary" class="error-summary" role="alert" tabindex="-1">
          <p>还有 {{ errorList.length }} 项需要修改</p>
          <ul>
            <li v-for="[key, text] in errorList" :key="key">
              <a :href="'#field-' + key" @click.prevent="focusContent('field-' + key)">{{ text }}</a>
            </li>
          </ul>
        </div>
        <section class="form-section">
          <div class="form-section-title">
            <span>1</span>
            <div>
              <h2>基本信息</h2>
              <p>与学生证保持一致。</p>
            </div>
          </div>
          <div class="form-grid">
            <label v-for="key in basicKeys" :id="'field-' + key" :key="key" :class="{ 'field-invalid': errors[key] }">
              <span class="field-name">{{ fieldLabels[key] }}<em class="required-label">必填</em></span>
              <select
                v-if="key === 'gender'"
                v-model="form.gender"
                name="gender"
                :aria-invalid="Boolean(errors['gender'])"
                :aria-describedby="errors['gender'] ? 'error-' + 'gender' : undefined"
                :aria-required="requiredKeys.includes('gender')"
              >
                <option value="">请选择</option>
                <option v-for="item in genders" :key="item">{{ item }}</option>
              </select>
              <select
                v-else-if="key === 'politicalStatus'"
                v-model="form.politicalStatus"
                name="politicalStatus"
                :aria-invalid="Boolean(errors['politicalStatus'])"
                :aria-describedby="errors['politicalStatus'] ? 'error-' + 'politicalStatus' : undefined"
                :aria-required="requiredKeys.includes('politicalStatus')"
              >
                <option value="">请选择</option>
                <option v-for="item in politicalStatuses" :key="item">{{ item }}</option>
              </select>
              <select
                v-else-if="key === 'college'"
                v-model="form.college"
                name="college"
                :aria-invalid="Boolean(errors['college'])"
                :aria-describedby="errors['college'] ? 'error-' + 'college' : undefined"
                :aria-required="requiredKeys.includes('college')"
              >
                <option value="">请选择</option>
                <option v-for="item in colleges" :key="item">{{ item }}</option>
              </select>
              <input
                v-else
                v-model.trim="form[key]"
                :name="key"
                :type="key === 'birthDate' ? 'month' : 'text'"
                :maxlength="FIELD_LIMITS[key]"
                :placeholder="formPlaceholders[key] || ''"
                :autocomplete="key === 'name' ? 'name' : undefined"
                :aria-invalid="Boolean(errors[key])"
                :aria-describedby="errors[key] ? 'error-' + key : fieldHints[key] ? 'hint-' + key : undefined"
                :aria-required="requiredKeys.includes(key)"
              />
              <small v-if="errors[key]" :id="'error-' + key">{{ errors[key] }}</small
              ><small v-else-if="fieldHints[key]" :id="'hint-' + key" class="field-hint">{{ fieldHints[key] }}</small>
            </label>
          </div>
        </section>
        <section class="form-section">
          <div class="form-section-title">
            <span>2</span>
            <div>
              <h2>联系与志愿</h2>
              <p>请填写报名时使用的手机号，用于联系和进度查询。</p>
            </div>
          </div>
          <div class="form-grid">
            <label v-for="key in contactKeys" :id="'field-' + key" :key="key" :class="{ 'field-invalid': errors[key] }">
              <span class="field-name">{{ fieldLabels[key] }}<em class="required-label">必填</em></span>
              <input
                v-model.trim="form[key]"
                :name="key"
                :maxlength="FIELD_LIMITS[key]"
                inputmode="numeric"
                :placeholder="formPlaceholders[key]"
                :type="key === 'phone' ? 'tel' : 'text'"
                :autocomplete="key === 'phone' ? 'tel' : 'off'"
                :aria-invalid="Boolean(errors[key])"
                :aria-describedby="errors[key] ? 'error-' + key : fieldHints[key] ? 'hint-' + key : undefined"
                :aria-required="requiredKeys.includes(key)"
              />
              <small v-if="errors[key]" :id="'error-' + key">{{ errors[key] }}</small
              ><small v-else-if="fieldHints[key]" :id="'hint-' + key" class="field-hint">{{ fieldHints[key] }}</small>
            </label>
            <label id="field-preferredDepartment" :class="{ 'field-invalid': errors.preferredDepartment }">
              <span class="field-name">意向部门<em class="required-label">必填</em></span>
              <select
                v-model="form.preferredDepartment"
                name="preferredDepartment"
                :aria-invalid="Boolean(errors['preferredDepartment'])"
                :aria-describedby="errors['preferredDepartment'] ? 'error-' + 'preferredDepartment' : undefined"
                :aria-required="requiredKeys.includes('preferredDepartment')"
              >
                <option value="">请选择</option>
                <option v-for="item in departments" :key="item">{{ item }}</option>
              </select>
              <small v-if="errors.preferredDepartment" id="error-preferredDepartment">{{
                errors.preferredDepartment
              }}</small>
            </label>
            <label id="field-acceptAdjustment" :class="{ 'field-invalid': errors.acceptAdjustment }">
              <span class="field-name">是否服从调剂<em class="required-label">必填</em></span>
              <select
                v-model="form.acceptAdjustment"
                name="acceptAdjustment"
                :aria-invalid="Boolean(errors['acceptAdjustment'])"
                :aria-describedby="errors['acceptAdjustment'] ? 'error-' + 'acceptAdjustment' : undefined"
                :aria-required="requiredKeys.includes('acceptAdjustment')"
              >
                <option value="">请选择</option>
                <option>是</option>
                <option>否</option>
              </select>
              <small v-if="errors.acceptAdjustment" id="error-acceptAdjustment">{{ errors.acceptAdjustment }}</small>
            </label>
            <label id="field-photoData" class="photo-upload" :class="{ 'field-invalid': errors.photoData }">
              <span class="field-name">证件照<em class="required-label">必填</em></span>
              <img
                v-if="isPortraitPhoto(form.photoData)"
                :src="form.photoData"
                alt="证件照预览"
                class="applicant-photo"
              />
              <input
                ref="photoInput"
                name="photoData"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="onPhotoChange"
                :aria-invalid="Boolean(errors['photoData'])"
                :aria-describedby="errors['photoData'] ? 'error-' + 'photoData' : undefined"
                :aria-required="requiredKeys.includes('photoData')"
              />
              <small id="error-photoData">{{
                errors.photoData || "JPG、PNG 或 WEBP，限 15 MB；上传后会自动压缩。"
              }}</small>
            </label>
          </div>
        </section>
        <section class="form-section">
          <div class="form-section-title">
            <span>3</span>
            <div>
              <h2>兴趣与经历</h2>
              <p>方便部长安排面试，不用写得很长。</p>
            </div>
          </div>
          <label id="field-strengths" class="full" :class="{ 'field-invalid': errors.strengths }"
            ><span class="field-name">爱好及特长<em class="required-label">必填</em></span
            ><textarea
              v-model.trim="form.strengths"
              placeholder="例如喜欢做网页、摄影或策划活动；也可以写下想尝试的事情。"
              name="strengths"
              :maxlength="FIELD_LIMITS.strengths"
              :aria-invalid="Boolean(errors['strengths'])"
              :aria-describedby="errors['strengths'] ? 'error-' + 'strengths' : undefined"
              :aria-required="requiredKeys.includes('strengths')"
            ></textarea
            ><small v-if="errors.strengths" id="error-strengths">{{ errors.strengths }}</small></label
          >
          <label id="field-careerPlan" class="full" :class="{ 'field-invalid': errors.careerPlan }"
            ><span class="field-name">职业规划 / 想学的方向<em class="required-label">必填</em></span
            ><textarea
              v-model.trim="form.careerPlan"
              placeholder="目前想学习什么？希望参与什么项目？不需要已经有完整的职业计划。"
              name="careerPlan"
              :maxlength="FIELD_LIMITS.careerPlan"
              :aria-invalid="Boolean(errors['careerPlan'])"
              :aria-describedby="errors['careerPlan'] ? 'error-' + 'careerPlan' : undefined"
              :aria-required="requiredKeys.includes('careerPlan')"
            ></textarea
            ><small v-if="errors.careerPlan" id="error-careerPlan">{{ errors.careerPlan }}</small></label
          >
          <label id="field-awards" class="full" :class="{ 'field-invalid': errors.awards }"
            ><span class="field-name">曾获奖项<em>选填</em></span
            ><textarea
              v-model.trim="form.awards"
              placeholder="没有可留空，如有请填写奖项和时间。"
              name="awards"
              :maxlength="FIELD_LIMITS.awards"
              :aria-invalid="Boolean(errors['awards'])"
              :aria-describedby="errors['awards'] ? 'error-' + 'awards' : undefined"
              :aria-required="requiredKeys.includes('awards')"
            ></textarea
            ><small v-if="errors.awards" id="error-awards">{{ errors.awards }}</small></label
          >
          <label id="field-experience" class="full" :class="{ 'field-invalid': errors.experience }"
            ><span class="field-name">任职经历<em>选填</em></span
            ><textarea
              v-model.trim="form.experience"
              placeholder="没有可留空，可填写班级、社团或项目中的经历。"
              name="experience"
              :maxlength="FIELD_LIMITS.experience"
              :aria-invalid="Boolean(errors['experience'])"
              :aria-describedby="errors['experience'] ? 'error-' + 'experience' : undefined"
              :aria-required="requiredKeys.includes('experience')"
            ></textarea
            ><small v-if="errors.experience" id="error-experience">{{ errors.experience }}</small></label
          >
        </section>
        <div class="form-actions sticky-actions">
          <button class="primary-action" type="submit" :disabled="submitting || !policy.isOpen || !isOnline">
            {{ submitting ? "正在提交…" : "核对并提交报名" }}
          </button>
          <button class="secondary-action" type="button" @click="clearDraft">清除本机草稿</button>
          <p v-if="message && !reviewOpen" class="notice error" role="alert">{{ message }}</p>
        </div>
      </form>
    </div>
  </main>
  <main :inert="showLogin" v-else-if="view === 'status'" class="page-shell status-page">
    <FreshmanJourney
      :current="view"
      @navigate="(destination) => (destination === 'status' ? goToMyStatus() : go(destination))"
    />
    <section class="page-title">
      <p class="eyebrow">进度查询</p>
      <h1 id="page-title" tabindex="-1">报名状态查询</h1>
      <p>输入报名回执里的学号和报名时填写的手机号，查看审核与面试进度。</p>
    </section>
    <RecruitmentReceipt v-if="receipt" :record="receipt" @copy="copyReceipt" @download="downloadReceipt(receipt)" />
    <p v-if="message" class="notice" role="status">{{ message }}</p>
    <form class="status-panel" data-status-lookup @submit.prevent="searchStatus">
      <label
        ><span>学号</span><input v-model.trim="statusQuery.studentId" name="studentId" inputmode="numeric"
      /></label>
      <label
        ><span>手机号</span
        ><input v-model.trim="statusQuery.phone" name="phone" maxlength="11" type="tel" inputmode="numeric"
      /></label>
      <button class="primary-action" type="submit" :disabled="statusLoading">
        {{ statusLoading ? "正在查询…" : "查询进度" }}
      </button>
      <p v-if="statusMessage" class="notice error" role="alert">{{ statusMessage }}</p>
    </form>
    <article v-if="statusResult" class="status-result">
      <span>{{ statusResult.studentId }}</span>
      <h2>{{ statusResult.name }} · {{ statusResult.preferredDepartment }}</h2>
      <p class="status-badge">{{ statusResult.status }}</p>
      <div class="status-guidance" data-status-guidance>
        <h3>{{ statusGuidance.title }}</h3>
        <p>{{ statusGuidance.text }}</p>
      </div>
      <p>班级：{{ statusResult.className }}</p>
      <p>提交时间：{{ formatTime(statusResult.createdAt) }}</p>
      <div v-if="statusResult.interviewAt || statusResult.interviewLocation" class="interview-arrangement">
        <h3>你的面试安排</h3>
        <p v-if="statusResult.interviewAt">时间：{{ formatTime(statusResult.interviewAt) }}（北京时间）</p>
        <p v-if="statusResult.interviewLocation">地点：{{ statusResult.interviewLocation }}</p>
      </div>
      <pre v-if="statusResult.notice" class="notice-preview" data-status-notice>{{ statusResult.notice }}</pre>
    </article>
    <details class="lookup-help">
      <summary>查询不到报名？</summary>
      <p>请核对学号和报名时填写的手机号。已提交资料需要更正时，请联系招新工作人员，不要重复报名。</p>
    </details>
  </main>
  <main :inert="showLogin" v-else-if="view === 'admin' && currentAccount" class="page-shell review-workspace">
    <section class="page-title">
      <h1 id="page-title" tabindex="-1">
        {{ currentAccount.role === "president" ? "全部部门报名" : currentAccount.department + "报名" }}
      </h1>
    </section>
    <p
      class="admin-notice"
      :class="'notice-' + adminNoticeType"
      :role="adminNoticeType === 'error' ? 'alert' : 'status'"
    >
      {{ adminNotice }}
    </p>
    <section class="admin-toolbar">
      <div class="toolbar-row">
        <button type="button" class="secondary-action" :class="{ active: !rosterMode }" @click="showApplications">
          报名名单
        </button>
        <button
          type="button"
          class="secondary-action"
          :class="{ active: rosterMode }"
          data-member-roster
          @click="showRoster"
        >
          成员名册
        </button>
        <button
          type="button"
          class="secondary-action"
          data-refresh-applications
          :disabled="listLoading || detailBusy"
          @click="loadApplications(page)"
        >
          {{ listLoading ? "正在刷新…" : "刷新名单" }}
        </button>
        <button
          type="button"
          class="secondary-action"
          data-export-applications
          :disabled="exportLoading"
          @click="exportList"
        >
          {{ exportLoading ? "正在导出…" : rosterMode ? "导出成员名册" : "导出当前名单" }}
        </button>
        <button type="button" class="secondary-action" @click="showPassword = !showPassword">修改口令</button>
        <button v-if="currentAccount.role === 'president'" type="button" class="secondary-action" @click="loadStaff">
          工作人员
        </button>
      </div>
      <div class="toolbar-filters">
        <label
          >招新季
          <select v-model="filters.season" data-filter-season :disabled="purging">
            <option value="">本季 {{ policy.season }}</option>
            <option value="all">全部招新季</option>
            <option v-for="item in pastSeasons" :key="item.season" :value="item.season">
              {{ item.season }}（{{ item.total }}）
            </option>
          </select>
        </label>
        <label
          >部门
          <select v-model="filters.department" data-filter-department :disabled="currentAccount.role === 'minister'">
            <option value="">{{ currentAccount.role === "minister" ? currentAccount.department : "全部部门" }}</option>
            <option v-for="item in currentAccount.role === 'president' ? allDepartments : []" :key="item">
              {{ item }}
            </option>
            <optgroup v-if="currentAccount.role === 'president'" label="历史部门（未迁移）">
              <option v-for="item in legacyDepartments" :key="item">{{ item }}</option>
            </optgroup>
          </select>
        </label>
        <label
          >状态
          <select v-model="filters.status">
            <option value="">全部状态</option>
            <option v-for="item in statuses" :key="item">{{ item }}</option>
          </select>
        </label>
        <label
          >搜索<input v-model.trim="filters.keyword" data-filter-keyword placeholder="姓名、学号、编号、电话"
        /></label>
      </div>
    </section>
    <form v-if="showPassword" class="form-panel" @submit.prevent="savePassword">
      <label
        >原口令<input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password"
      /></label>
      <label
        >新口令<input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" minlength="12"
      /></label>
      <button class="primary-action" type="submit">保存新口令</button>
    </form>
    <section v-if="showStaff && currentAccount.role === 'president'" class="form-panel">
      <h2>工作人员账号</h2>
      <form @submit.prevent="addStaff">
        <label>账号<input v-model.trim="staffForm.username" pattern="[A-Za-z0-9_-]{1,64}" required /></label>
        <label>姓名<input v-model.trim="staffForm.name" required /></label>
        <label
          >角色
          <select v-model="staffForm.role">
            <option value="minister">部长</option>
            <option value="president">社长</option>
          </select>
        </label>
        <label
          >部门
          <select v-model="staffForm.department" :disabled="staffForm.role === 'president'">
            <option v-for="item in allDepartments" :key="item">{{ item }}</option>
          </select>
        </label>
        <button class="secondary-action" type="submit">添加账号</button>
      </form>
      <ul>
        <li v-for="account in staff" :key="account.username">
          {{ account.name }} · {{ account.username }} · {{ account.role === "president" ? "社长" : account.department }}
          <span v-if="account.disabled">已停用</span>
          <button v-if="account.username !== currentAccount.username" type="button" @click="resetStaff(account)">
            重置口令
          </button>
          <button
            v-if="account.username !== currentAccount.username"
            type="button"
            data-staff-status
            @click="toggleStaff(account)"
          >
            {{ account.disabled ? "恢复" : "停用" }}
          </button>
        </li>
      </ul>
    </section>
    <div class="review-count-heading">
      <h2>
        审核进度 <span>{{ scopeTotal }} 人</span>
      </h2>
      <p>统计随招新季、部门和搜索条件变化，不受状态筛选影响。点击状态查看名单。</p>
    </div>
    <div class="status-counts" aria-label="按审核状态筛选">
      <button
        v-for="item in statuses"
        :key="item"
        type="button"
        class="status-count"
        :class="{ active: filters.status === item }"
        :aria-pressed="filters.status === item"
        @click="filters.status = filters.status === item ? '' : item"
      >
        <span>{{ item }}</span>
        <strong>{{ counts[item] || 0 }}</strong>
      </button>
    </div>
    <div class="admin-summary">
      <p>
        {{ adminStats }} <span v-if="listLoading" role="status">正在加载…</span
        ><span v-else-if="listUpdatedAt" class="review-updated">更新于 {{ formatTime(listUpdatedAt) }}</span>
      </p>
      <button type="button" class="secondary-action" data-reset-filters @click="resetReviewFilters">重置筛选</button>
    </div>
    <div v-if="listError" class="review-load-error" role="alert" data-list-error>
      <p>名单加载失败：{{ listError }}。已显示的名单可能不是最新，请重试。</p>
      <button type="button" class="secondary-action" :disabled="listLoading" @click="loadApplications(page)">
        重新加载
      </button>
    </div>
    <section
      v-if="
        currentAccount.role === 'president' &&
        filters.season &&
        filters.season !== 'all' &&
        filters.season !== policy.season
      "
      class="form-panel"
    >
      <h2>清理 {{ filters.season }}</h2>
      <p>
        先下载整季备份（包含全部部门、全部状态的报名、照片和审核历史），确认文件保存后再清理。名单筛选不影响整季备份范围。
      </p>
      <button
        type="button"
        class="secondary-action"
        data-backup-season
        :disabled="backupLoading || purging"
        @click="downloadSeasonBackup"
      >
        {{ backupLoading ? "正在备份…" : "下载整季备份" }}
      </button>
      <p v-if="seasonBackup?.season === filters.season">
        将清理整季 {{ seasonBackup.count }} 条报名。备份凭据有效期 15 分钟。
      </p>
      <label v-if="seasonBackup?.season === filters.season" class="backup-confirmation"
        ><input v-model="backupDownloaded" type="checkbox" />已确认整季备份文件保存成功</label
      >
      <input v-model.trim="purgeConfirm" data-purge-confirm :placeholder="filters.season" :disabled="purging" />
      <button
        type="button"
        class="secondary-action"
        data-purge-season
        :disabled="
          seasonBackup?.season !== filters.season || !backupDownloaded || purgeConfirm !== filters.season || purging
        "
        @click="removeSeason"
      >
        {{ purging ? "正在清理…" : "清理该季" }}
      </button>
    </section>
    <section class="admin-layout">
      <div class="table-wrap review-roster-panel">
        <table class="review-list-table" :aria-busy="listLoading">
          <caption>
            <span>{{ rosterMode ? "通过审核的成员名册" : "当前筛选的报名名单" }}</span>
            <span class="review-roster-count">{{ total }} 人</span>
          </caption>
          <thead>
            <tr>
              <th scope="col">姓名 / 学号</th>
              <th scope="col">部门 / 班级</th>
              <th scope="col">状态</th>
              <th scope="col">提交时间</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody data-application-list>
            <tr v-if="!applications.length">
              <td colspan="5" class="empty">
                {{
                  listLoading
                    ? "正在加载名单…"
                    : listError
                      ? "加载失败，请点击重新加载。"
                      : "当前筛选下没有报名记录。可重置筛选或稍后刷新。"
                }}
              </td>
            </tr>
            <tr
              v-for="record in applications"
              :key="record.id"
              :class="{ 'is-selected': selected?.id === record.id }"
              @click="openApplication(record)"
            >
              <td data-label="姓名 / 学号" class="review-applicant-cell">
                <strong class="review-applicant-name">{{ record.name }}</strong>
                <span class="review-student-id">{{ record.studentId }}</span>
              </td>
              <td data-label="部门 / 班级">
                <span>{{ record.preferredDepartment }}</span
                ><small class="review-list-meta">{{ record.className }}</small>
              </td>
              <td data-label="状态">
                <span class="status-badge" :data-status="record.status">{{ record.status }}</span>
              </td>
              <td data-label="提交时间">
                <time class="review-submitted-at" :datetime="record.createdAt"
                  ><span>{{ formatTime(record.createdAt).split(" ")[0] }}</span
                  ><small>{{ formatTime(record.createdAt).split(" ").slice(1).join(" ") }}</small></time
                >
              </td>
              <td data-label="操作">
                <button
                  type="button"
                  :aria-label="`查看 ${record.name} 的报名`"
                  :aria-pressed="selected?.id === record.id"
                  :disabled="detailBusy"
                  @click.stop="openApplication(record)"
                >
                  {{ selected?.id === record.id ? "查看中" : "查看" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pager">
          <button
            v-if="page > 1"
            type="button"
            data-page-prev
            :disabled="listLoading || detailBusy"
            @click="loadApplications(page - 1)"
          >
            上一页
          </button>
          <span>第 {{ page }} / {{ maxPage }} 页</span>
          <button
            v-if="page < maxPage"
            type="button"
            data-page-next
            :disabled="listLoading || detailBusy"
            @click="loadApplications(page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
      <section class="detail-panel" data-application-detail>
        <h2>报名详情</h2>
        <p v-if="detailLoading">正在加载资料…</p>
        <div v-if="!selected" class="review-empty-detail">
          <h3>从名单中选择一位新生</h3>
          <p>这里会显示报名资料和审核记录。保存审核后，可以继续查看下一位。</p>
        </div>
        <template v-else>
          <p v-if="detailDirty" class="notice" data-unsaved-changes>
            有未保存的修改。刷新名单会保留这些内容，离开前请保存或放弃。
          </p>
          <button
            v-if="detailDirty"
            type="button"
            data-discard-changes
            :disabled="detailBusy"
            @click="confirmDiscardChanges"
          >
            放弃未保存的修改
          </button>
          <header class="detail-heading">
            <img
              v-if="isPortraitPhoto(selected.photoData)"
              :src="selected.photoData"
              class="applicant-photo"
              alt="证件照"
            />
            <div>
              <h3>{{ selected.name }}</h3>
              <p>{{ selected.id }} · {{ selected.className }}</p>
            </div>
            <span class="status-badge" :data-status="selected.status">{{ selected.status }}</span>
          </header>
          <div class="review-detail-navigation">
            <span v-if="reviewPosition >= 0">本页第 {{ reviewPosition + 1 }} / {{ applications.length }} 位</span>
            <button
              type="button"
              class="secondary-action"
              :disabled="detailBusy || detailLoading"
              @click="focusContent('review-editor-title')"
            >
              去审核
            </button>
          </div>
          <p v-if="selectedLocked" class="notice">该招新季已结束，不能再修改。仍可删除这条报名。</p>
          <dl class="detail-facts">
            <div v-for="key in shortDetailKeys" :key="key">
              <dt>{{ fieldLabels[key] || key }}</dt>
              <dd>{{ selected[key] || "—" }}</dd>
            </div>
          </dl>
          <article v-for="key in longDetailKeys" :key="key" class="detail-note">
            <h3>{{ fieldLabels[key] }}</h3>
            <p>{{ selected[key] || "未填" }}</p>
          </article>
          <form class="status-editor" @submit.prevent="saveStatus">
            <h3 id="review-editor-title" tabindex="-1">审核报名</h3>
            <p class="review-guidance" data-review-guidance>{{ reviewGuidance }}</p>
            <label class="review-note"
              >审核备注（工作人员可见）<textarea
                v-model="pendingNote"
                maxlength="500"
                placeholder="审核备注"
                :disabled="selectedLocked || detailLoading || saving || removing || photoReplacing"
              ></textarea
              ><small>{{ pendingNote.length }} / 500 字</small></label
            >
            <label
              >审核状态<select
                v-model="pendingStatus"
                :disabled="selectedLocked || detailLoading || saving || removing || photoReplacing"
              >
                <option v-for="item in statuses" :key="item">{{ item }}</option>
              </select></label
            >
            <button
              class="primary-action"
              type="submit"
              :disabled="saving || detailLoading || removing || photoReplacing || selectedLocked"
            >
              {{ saving ? "正在保存…" : "保存审核" }}
            </button>
            <button
              type="button"
              class="secondary-action"
              data-save-next
              :disabled="detailBusy || detailLoading || selectedLocked || correctionDirty"
              @click="saveStatus(true)"
            >
              保存并继续审核
            </button>
          </form>
          <section class="review-notification">
            <h3>联系新生</h3>
            <p>以下通知基于已保存资料。复制后请自行通过 QQ 或电话联系新生，系统不会自动发送。</p>
            <p v-if="detailDirty" class="notice">有未保存的修改，请先保存后再复制通知。</p>
            <button
              type="button"
              class="secondary-action"
              data-copy-notice
              :disabled="detailDirty || detailBusy || detailLoading"
              @click="copyNotice"
            >
              复制已保存的通知
            </button>
            <pre class="notice-preview">{{ recruitmentNotice(selected) }}</pre>
          </section>
          <h3>资料更正</h3>
          <p class="review-helper">信息有误时，与新生确认后再更正。更正与审核分别保存，修改会记录到操作历史。</p>
          <button
            type="button"
            data-correct-application
            :disabled="selectedLocked || detailLoading || saving || removing || photoReplacing"
            @click="beginCorrection"
          >
            更正资料
          </button>
          <form v-if="correctionOpen" data-correction-form @submit.prevent="saveCorrection">
            <fieldset class="correction-fields" :disabled="detailBusy || detailLoading || selectedLocked">
              <label v-for="key in correctionKeys" :key="key">
                {{ fieldLabels[key] }}
                <select v-if="key === 'gender'" v-model="correction[key]" :name="key">
                  <option v-for="item in genders" :key="item">{{ item }}</option>
                </select>
                <select v-else-if="key === 'politicalStatus'" v-model="correction[key]" :name="key">
                  <option v-for="item in politicalStatuses" :key="item">{{ item }}</option>
                </select>
                <select v-else-if="key === 'college'" v-model="correction[key]" :name="key">
                  <option v-for="item in colleges" :key="item">{{ item }}</option>
                </select>
                <select v-else-if="key === 'acceptAdjustment'" v-model="correction[key]" :name="key">
                  <option>是</option>
                  <option>否</option>
                </select>
                <textarea
                  v-else-if="['strengths', 'awards', 'experience', 'careerPlan'].includes(key)"
                  v-model="correction[key]"
                  :name="key"
                  :maxlength="FIELD_LIMITS[key]"
                ></textarea>
                <input v-else-if="key === 'birthDate'" v-model="correction[key]" :name="key" type="month" />
                <input v-else v-model="correction[key]" :name="key" :maxlength="FIELD_LIMITS[key]" />
              </label>
              <button type="submit" :disabled="saving">{{ saving ? "正在保存…" : "保存更正" }}</button>
            </fieldset>
          </form>
          <div v-if="currentAccount.role === 'president'">
            <select
              v-model="transferDepartment"
              data-transfer-department
              :disabled="selectedLocked || detailLoading || saving || removing || photoReplacing"
            >
              <option value="">选择调剂部门</option>
              <option v-for="item in allDepartments" :key="item">{{ item }}</option>
            </select>
            <button
              type="button"
              data-transfer-application
              :disabled="selectedLocked || detailLoading || saving || removing || photoReplacing"
              @click="transferSelected"
            >
              调剂
            </button>
          </div>
          <details class="review-maintenance" :key="selected.id">
            <summary>照片维护与删除报名</summary>
            <label class="photo-replace"
              >更换证件照
              <input
                data-replace-photo
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="selectedLocked || detailLoading || detailBusy"
                @change="onReplacePhoto"
              />
              <small>{{ photoReplacing ? "正在更换…" : "JPG、PNG 或 WEBP，上传后会压缩。" }}</small>
            </label>
            <div class="record-delete" data-delete-application>
              <p>删除后证件照和审核记录一并清除，该学号可以重新报名。请输入学号确认。</p>
              <input v-model.trim="deleteConfirm" :placeholder="selected.studentId" :disabled="removing" />
              <button
                type="button"
                data-delete-application-submit
                :disabled="
                  deleteConfirm !== selected.studentId || removing || detailLoading || saving || photoReplacing
                "
                @click="removeSelected"
              >
                {{ removing ? "正在删除…" : "删除这条报名" }}
              </button>
            </div>
          </details>
          <div data-review-history>
            <h3>操作历史</h3>
            <p v-if="!selected.reviewHistory?.length" class="review-helper">暂无操作记录。</p>
            <p v-for="item in selected.reviewHistory || []" :key="item.id">
              {{ item.actorName }} · {{ reviewActionLabels[item.action] || item.action }} ·
              {{ formatTime(item.createdAt) }} ·
              {{
                (item.changes || [])
                  .map(
                    (change) =>
                      `${fieldLabels[change.field] || change.field}: ${shortText(change.before)} → ${shortText(change.after)}`,
                  )
                  .join("；")
              }}
            </p>
          </div>
        </template>
      </section>
    </section>
  </main>
  <footer class="site-footer" :inert="showLogin">
    <strong>卓软信息工作室</strong>
    <p>新生报名 · 部门审核 · 面试安排</p>
    <p>请核对报名联系方式，留意 QQ 与电话联系。报名资料由工作人员按权限查看。</p>
  </footer>
</template>
