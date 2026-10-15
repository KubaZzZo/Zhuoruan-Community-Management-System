const assert = require("assert");
const fs = require("fs");
function read(file) {
  return fs.readFileSync(file, "utf8");
}
function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}
const html = read("src/App.vue");
const api = read("src/recruitmentApi.js");
const css = read("styles.css");
const pkg = read("package.json");
runTest("freshman pages guide preparation, review, receipt recovery and next steps", () => {
  for (const feature of [
    "data-application-review",
    "data-confirm-application",
    "FreshmanJourney",
    "RecruitmentReceipt",
    "fieldHints",
    "data-status-guidance",
    "lookup-help",
  ])
    assert.ok(html.includes(feature), `missing freshman flow ${feature}`);
  assert.ok(read("src/RecruitmentReceipt.vue").includes("data-download-receipt"));
  assert.ok(read("src/FreshmanJourney.vue").includes("aria-current"));
  assert.ok(css.includes("prefers-reduced-motion"));
});
runTest("registration form contains every server field", () => {
  const fields = [
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
    "preferredDepartment",
    "acceptAdjustment",
    "strengths",
    "awards",
    "experience",
    "careerPlan",
  ];
  for (const field of fields) assert.ok(html.includes(field), `missing field ${field}`);
  assert.ok(html.includes('type="file"'));
  assert.ok(html.includes("submitRecruitment"));
  assert.ok(html.includes("policy.isOpen"));
});
runTest("public recruitment routes use server policy and lookup", () => {
  assert.ok(html.includes("fetchRecruitmentPolicy"));
  assert.ok(html.includes("lookupRecruitment"));
  assert.ok(html.includes("statusLoading"));
  assert.ok(html.includes("clearDraft"));
  assert.ok(api.includes("/api/recruitment"));
  assert.ok(api.includes("/api/applications/lookup"));
});
runTest("registration and staff corrections share the current college choices", () => {
  assert.ok(html.includes("const colleges = COLLEGES"));
  assert.match(html, /v-model="form\.college"[\s\S]*?<option v-for="item in colleges"/);
  assert.match(html, /v-model="correction\[key\]" :name="key">\s*<option v-for="item in colleges"/);
});
runTest("season cleanup requires a separate complete backup and saved-file confirmation", () => {
  assert.ok(html.includes("data-backup-season"));
  assert.ok(html.includes("backupDownloaded"));
  assert.ok(html.includes("seasonBackup?.season !== filters.season"));
  assert.ok(!html.includes("exportedSeason"));
  assert.ok(api.includes("backupRecruitmentSeason"));
});
runTest("admin supports authorization, pagination, detail, correction, transfer and export", () => {
  for (const item of [
    "submitLogin",
    "fetchRecruitmentList",
    "fetchRecruitmentDetail",
    "data-page-next",
    "data-page-prev",
    "data-refresh-applications",
    "data-export-applications",
    "data-correct-application",
    "data-transfer-application",
    "data-review-history",
    "data-replace-photo",
    "data-delete-application",
    "data-staff-status",
  ])
    assert.ok(html.includes(item), `missing ${item}`);
  for (const item of [
    "correctRecruitment",
    "transferRecruitment",
    "changeRecruitmentStatus",
    "exportRecruitmentList",
    "replaceRecruitmentPhoto",
    "deleteRecruitment",
    "setStaffDisabled",
  ])
    assert.ok(api.includes(item), `missing API ${item}`);
});
runTest("direct recruitment excludes internal department", () => {
  assert.ok(html.includes("const departments = DEPARTMENTS"));
  assert.ok(html.includes("实干青年部"));
  assert.match(html, /currentAccount\.role\s*===\s*['"]president['"]/);
});
runTest("department pages show positioning and all responsibilities with separate historical filters", () => {
  assert.ok(html.includes("data-department-positioning"));
  assert.ok(html.includes("data-department-responsibilities"));
  assert.ok(html.includes("departmentProfile.responsibilities"));
  assert.ok(!html.includes("departmentProfile.fit"));
  assert.ok(!html.includes("departmentProfile.work"));
  assert.ok(html.includes("历史部门（未迁移）"));
});
runTest("security and quality configuration remain present", () => {
  assert.ok(!html.includes("zhuoruan2026"));
  assert.ok(!html.includes("zhuoruan_recruitment_applications"));
  assert.ok(pkg.includes("lint"));
  assert.ok(pkg.includes("test:mysql"));
  assert.ok(css.includes("@media (max-width: 640px)"));
});
runTest("registration goes directly to progress without questions or score controls", () => {
  for (const legacy of ["data-quiz-form", "data-quiz-score", "data-filter-quiz", "submitRecruitmentQuiz", "基础题"])
    assert.ok(!html.includes(legacy), `removed feature remains: ${legacy}`);
  assert.ok(!api.includes("/quiz"));
  assert.ok(!read("src/FreshmanJourney.vue").includes('view: "quiz"'));
  assert.ok(html.includes('go("status");'));
  assert.ok(html.includes("rememberReceipt"));
  assert.ok(html.includes("RECEIPT_SESSION_KEY"));
});
runTest("legacy routes and site assets remain available", () => {
  assert.ok(read("register.html").includes("index.html#register"));
  assert.ok(read("admin.html").includes("index.html#admin"));
  assert.ok(fs.existsSync("public/zhuoruan.png"));
  assert.ok(!read("index.html").includes("fonts.googleapis.com"));
  assert.ok(read("server/index.cjs").includes("Content-Security-Policy"));
  assert.ok(read("server/index.cjs").includes("default-src 'self'"));
  assert.ok(read("server/index.cjs").includes("img-src 'self' data: blob:"));
});
runTest("frontend protects focus, inline validation, drafts and unsaved editing", () => {
  for (const control of [
    "data-unsaved-changes",
    "data-discard-changes",
    "aria-describedby",
    "onFormBlur",
    "loginDialog",
    "refreshPolicy",
    "readReceipt",
    "confirmDiscardChanges",
  ])
    assert.ok(html.includes(control), `missing frontend protection ${control}`);
  assert.ok(html.includes("@click.prevent=\"focusContent('field-' + key)\""));
  assert.ok(css.includes("scroll-margin-top"));
  assert.ok(css.includes(".admin-notice.notice-success"));
  assert.ok(css.includes(".admin-notice.notice-error"));
});

runTest("registration hints and interview editing are removed", () => {
  assert.ok(!html.includes('name: "填写学生证上的真实姓名。"'));
  assert.ok(!html.includes('studentId: "8–20 位数字；'));
  for (const field of ["interviewAt", "interviewLocation", "interviewer", "interviewSummary"])
    assert.ok(!html.includes(`v-model="interview.${field}"`));
  assert.ok(!html.includes("validateInterview"));
  assert.ok(!html.includes("资料用途与填写说明"));
  assert.ok(html.includes("保存审核"));
});
