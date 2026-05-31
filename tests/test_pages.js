const assert = require("assert");
const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
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

runTest("Vue app contains every field from the source recruitment form", () => {
  const html = read("src/App.vue");
  const fieldNames = [
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
    "photo",
    "strengths",
    "awards",
    "experience",
    "careerPlan",
  ];

  for (const fieldName of fieldNames) {
    assert.ok(html.includes(`name="${fieldName}"`), `missing field ${fieldName}`);
  }
});

runTest("main page uses Vite Vue entry instead of CDN scripts", () => {
  const html = read("index.html");
  const main = read("src/main.js");
  const pkg = read("package.json");

  assert.ok(html.includes('id="app"'));
  assert.ok(html.includes('type="module" src="/src/main.js"'));
  assert.ok(!html.includes("unpkg.com"));
  assert.ok(main.includes("createApp"));
  assert.ok(pkg.includes('"vue"'));
  assert.ok(pkg.includes('"vite"'));
});

runTest("legacy pages route users back into the Vue single page app", () => {
  assert.ok(read("register.html").includes("index.html#register"));
  assert.ok(read("admin.html").includes("index.html#admin"));
});

runTest("Vue admin view exposes management filters and application list", () => {
  const html = read("src/App.vue");

  assert.ok(html.includes("data-filter-department"));
  assert.ok(html.includes("data-filter-status"));
  assert.ok(html.includes("data-filter-keyword"));
  assert.ok(html.includes("data-application-list"));
  assert.ok(html.includes("data-application-detail"));
});

runTest("public navigation hides direct personnel management entry", () => {
  const html = read("src/App.vue");

  assert.ok(!html.includes('data-public-admin-link'));
  assert.ok(html.includes('data-admin-gate'));
  assert.ok(html.includes("管理员入口"));
});

runTest("registration view uses polished grouped application layout", () => {
  const html = read("src/App.vue");

  assert.ok(html.includes("form-side-panel"));
  assert.ok(html.includes("form-section"));
  assert.ok(html.includes("form-progress"));
  assert.ok(html.includes("基本信息"));
  assert.ok(html.includes("联系与志愿"));
  assert.ok(html.includes("个人经历"));
});

runTest("Vue app exposes cyber recruitment routes from the design document", () => {
  const html = read("src/App.vue");

  assert.ok(html.includes('"matrix"'), "missing matrix view route");
  assert.ok(html.includes('"mentor"'), "missing mentor view route");
  assert.ok(html.includes('"arsenal"'), "missing arsenal view route");
  assert.ok(html.includes("算力矩阵"));
  assert.ok(html.includes("导师资源"));
  assert.ok(html.includes("技术兵器谱"));
  assert.ok(html.includes("api.zhuoruan.xyz"));
});

runTest("compute matrix includes public API gateway details", () => {
  const html = read("src/App.vue");

  assert.ok(html.includes("https://api.zhuoruan.xyz/v1"));
  assert.ok(html.includes("OpenAI、Claude、Gemini"));
  assert.ok(html.includes("Cherry Studio"));
  assert.ok(html.includes("Lobe Chat"));
  assert.ok(html.includes("绘图能力和任务能力"));
  assert.ok(html.includes("GitHub OAuth"));
  assert.ok(html.includes("Passkey"));
});

runTest("compute matrix is focused on API resources while mentor content has its own page", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");
  const matrixStart = html.indexOf("const matrixCards");
  const matrixEnd = html.indexOf("const mentorTracks");
  const matrixData = html.slice(matrixStart, matrixEnd);

  assert.ok(!matrixData.includes("硬核导师镇场"), "mentor card should not stay in matrix data");
  assert.ok(!matrixData.includes("项目训练场"), "project training card should not stay in matrix data");
  assert.ok(html.includes("const mentorTracks"));
  assert.ok(html.includes("Mentor System"));
  assert.ok(html.includes("后端与架构"));
  assert.ok(html.includes("竞赛与交付"));
  assert.ok(html.includes("AI 工程实践"));
  assert.ok(css.includes(".mentor-page"));
  assert.ok(css.includes(".mentor-card"));
  assert.ok(css.includes(".mentor-path"));
});

runTest("compute matrix visualizes model access with restrained logo grid", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");

  assert.ok(html.includes("modelLogos"));
  assert.ok(html.includes("DeepSeek"));
  assert.ok(html.includes("Qwen"));
  assert.ok(html.includes("Kimi"));
  assert.ok(html.includes("GLM"));
  assert.ok(html.includes("model-logo"));
  assert.ok(html.includes("logo.path"));
  assert.ok(html.includes("<path :d=\"logo.path\">"));
  assert.ok(css.includes(".model-logo"));
  assert.ok(css.includes(".model-logo svg"));
  assert.ok(css.includes("fill: currentColor"));
  assert.ok(css.includes("--logo-delay"));
  assert.ok(css.includes(".matrix-card:hover .model-logo"));
});

runTest("registration view keeps the full form inside a terminal themed shell", () => {
  const html = read("src/App.vue");

  assert.ok(html.includes("terminal-register"));
  assert.ok(html.includes("join_zhuoruan.sh"));
  assert.ok(html.includes("Root Access"));
  assert.ok(html.includes("Welcome to Zhuoruan"));
});

runTest("visual polish includes interactive cyber and terminal details", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");

  assert.ok(html.includes("cyber-core-stage"), "missing draggable cyber core stage");
  assert.ok(html.includes("typewriter-line"), "missing typewriter terminal lines");
  assert.ok(html.includes("department-icon"), "missing department tech icons");
  assert.ok(html.includes("compute-visual"), "missing compute matrix visualization");
  assert.ok(html.includes("tech-logo"), "missing tech logo buttons");
  assert.ok(css.includes(".terminal-register label::after"), "missing terminal input prompt styling");
});

runTest("showcase route presents project outcomes as a standalone gallery", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");

  assert.ok(html.includes('"showcase"'), "missing showcase route");
  assert.ok(html.includes("开源展厅"));
  assert.ok(html.includes("showcase-grid"));
  assert.ok(html.includes("Multi-Agent"));
  assert.ok(html.includes("project-tags"));
  assert.ok(css.includes(".showcase-card"));
  assert.ok(css.includes(".terminal-register label:focus-within::after"));
});

runTest("department detail pages help applicants choose a fitting team", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");

  assert.ok(html.includes('"department"'), "missing department detail route");
  assert.ok(html.includes("departmentProfiles"), "missing shared department profile data");
  assert.ok(html.includes("goDepartment"), "missing department card navigation");
  assert.ok(html.includes("Department Profile"), "missing department detail hero");
  assert.ok(html.includes("适合人群"));
  assert.ok(html.includes("能学到什么"));
  assert.ok(html.includes("主要任务"));
  assert.ok(html.includes("报名建议"));
  assert.ok(html.includes("选择该部门并报名"));
  assert.ok(html.includes("form.preferredDepartment = departmentName"), "missing register prefill");
  assert.ok(css.includes(".department-detail-page"));
  assert.ok(css.includes(".department-switcher"));
  assert.ok(css.includes(".department-profile-card"));
});

runTest("UI polish includes navigation, showcase tags, and focus micro-interactions", () => {
  const html = read("src/App.vue");
  const css = read("styles.css");

  assert.ok(html.includes(":data-tag=\"tag\""), "missing project tag data hook");
  assert.ok(css.includes(".nav a.active::after"), "missing active navigation cursor");
  assert.ok(css.includes("backdrop-filter: blur(10px)"), "missing glass navigation blur");
  assert.ok(css.includes(".showcase-card::before"), "missing showcase hover sheen");
  assert.ok(css.includes('.project-tags em[data-tag="Vue3"]'), "missing Vue tag color");
  assert.ok(css.includes('.project-tags em[data-tag="Docker"]'), "missing Docker tag color");
  assert.ok(css.includes("inset 0 0 18px rgba(78, 244, 208, 0.06)"), "missing terminal focus glow");
});
