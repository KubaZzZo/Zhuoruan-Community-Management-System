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
