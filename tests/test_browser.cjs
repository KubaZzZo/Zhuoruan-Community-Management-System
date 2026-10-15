const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { attachRecruitmentApi } = require("../server/api.cjs");
const { createApplicationStore } = require("../server/store.cjs");
const { createHttpHandler } = require("../server/index.cjs");
const { loadRecruitmentConfig } = require("../server/config.cjs");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const accounts = [
  {
    username: "browser-admin",
    password: "browser-test-strong-password",
    role: "president",
    name: "测试社长",
    department: "",
  },
];
const portrait =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";
async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zhuoruan-browser-test-"));
  const store = createApplicationStore(path.join(directory, "applications.json"));
  for (let i = 1; i <= 25; i++)
    await store.insert({
      id: `ZR-BROWSER-${String(i).padStart(3, "0")}`,
      name: `测试新生${i}`,
      gender: "男",
      birthDate: "2005-03",
      ethnicity: "汉族",
      politicalStatus: "共青团员",
      college: "人工智能与软件学院",
      departmentMajor: "软件工程系",
      className: "软件工程测试班",
      studentId: String(202600000000 + i),
      phone: String(13800000000 + i),
      qq: String(100000000 + i),
      preferredDepartment: "数据算法部",
      acceptAdjustment: "是",
      strengths: "浏览器测试特长",
      awards: "",
      experience: "",
      careerPlan: "浏览器测试规划",
      photoName: "test.jpg",
      photoData: portrait,
      status: "待审核",
      season: "2026",
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
    });
  const original = await store.get("ZR-BROWSER-001");
  await store.insert({ ...original, id: "ZR-BROWSER-OLD-001", queryCode: "", season: "2025", status: "通过" });
  await store.insert({
    ...original,
    id: "ZR-BROWSER-OLD-002",
    queryCode: "",
    season: "2025",
    status: "未通过",
    preferredDepartment: "工程项目部",
    studentId: "202500000002",
    phone: "13900000002",
    qq: "200000002",
  });
  const middleware = attachRecruitmentApi(null, { store, accounts, config: loadRecruitmentConfig({}) });
  const assetsRoot = path.resolve(__dirname, "../dist");
  assert.ok(fs.existsSync(path.join(assetsRoot, "index.html")), "build frontend before browser tests");
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, path: new URL(req.url, "http://test").pathname });
    createHttpHandler({ api: middleware, root: assetsRoot })(req, res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let socket;
  let targetId;
  const output = path.resolve(__dirname, "../.verification");
  fs.mkdirSync(output, { recursive: true });
  try {
    const debugOrigin = process.env.CHROME_DEBUG_ORIGIN || "http://127.0.0.1:9222";
    const version = await (await fetch(`${debugOrigin}/json/version`)).json();
    socket = new WebSocket(version.webSocketDebuggerUrl);
    const pending = new Map();
    const exceptions = [];
    let sequence = 0;
    let sessionId;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(task.timer);
        message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      }
      if (message.sessionId === sessionId && message.method === "Runtime.exceptionThrown")
        exceptions.push(message.params.exceptionDetails.text);
      if (message.sessionId === sessionId && message.method === "Page.javascriptDialogOpening")
        send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
    });
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    function send(method, params = {}, browser = false) {
      const id = ++sequence;
      const promise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }, 15_000);
        pending.set(id, { resolve, reject, timer });
      });
      socket.send(JSON.stringify({ id, method, params, ...(!browser && sessionId ? { sessionId } : {}) }));
      return promise;
    }
    targetId = (await send("Target.createTarget", { url: "about:blank" }, true)).targetId;
    sessionId = (await send("Target.attachToTarget", { targetId, flatten: true }, true)).sessionId;
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails)
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result?.value;
    }
    async function waitFor(expression, description) {
      const end = Date.now() + 12_000;
      while (Date.now() < end) {
        if (await evaluate(expression)) return;
        await delay(100);
      }
      throw new Error(
        `Browser timeout: ${description}; url=${await evaluate("location.href")}; body=${String(await evaluate("document.body.innerText")).slice(0, 500)}; requests=${JSON.stringify(requests.slice(-12))}`,
      );
    }
    async function click(selector) {
      await evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing control: '+${JSON.stringify(selector)}); el.click(); })()`,
      );
    }
    async function fill(selector, value) {
      await evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing input'); const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
      );
      await delay(30);
    }
    await send("Page.navigate", { url: `${origin}/#register` });
    await waitFor(
      "!!document.querySelector('input[name=name]') && document.body.textContent.includes('填写招新报名表')",
      "registration ready",
    );
    assert.equal(
      await evaluate(
        "[...document.querySelector('select[name=preferredDepartment]').options].some(o=>o.value==='实干青年部')",
      ),
      false,
    );
    await fill("input[name=name]", "临时草稿");
    await waitFor("!!localStorage.getItem('zhuoruan_recruitment_form_draft')", "draft saved");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('清除本机草稿')).click()");
    await waitFor(
      "!localStorage.getItem('zhuoruan_recruitment_form_draft') && document.querySelector('input[name=name]').value === ''",
      "draft cleared",
    );
    await evaluate("location.hash = 'admin'");
    await waitFor("!!document.querySelector('[data-admin-gate]')", "login dialog");
    await fill("input[name=username]", accounts[0].username);
    await fill("input[name=password]", accounts[0].password);
    await evaluate("document.querySelector('[data-admin-gate] form').requestSubmit()");
    await waitFor(
      "document.querySelectorAll('[data-application-list] tr').length === 20 && !!document.querySelector('[data-page-next]')",
      "paginated admin list",
    );
    assert.ok(await evaluate("document.querySelector('.admin-summary')?.textContent.includes('25')"));
    await click("[data-page-next]");
    await waitFor("document.querySelectorAll('[data-application-list] tr').length === 5", "page two");
    await click("[data-page-prev]");
    await waitFor("document.querySelectorAll('[data-application-list] tr').length === 20", "page one");
    await click("[data-application-list] tr button");
    await waitFor(
      "!!document.querySelector('.applicant-photo') && !!document.querySelector('[data-correct-application]')",
      "full details loaded",
    );
    const selectedId = await evaluate("document.querySelector('.detail-heading p').textContent.split(' · ')[0]");
    assert.ok(requests.some((request) => request.path === `/api/applications/${selectedId}`));
    await fill(".status-editor textarea", "浏览器审核备注");
    await fill(".status-editor select", "已面试");
    await evaluate("document.querySelector('.status-editor').requestSubmit()");
    await waitFor(
      "document.querySelector('[data-review-history]')?.textContent.includes('浏览器审核备注')",
      "audit after status save",
    );
    await click("[data-refresh-applications]");
    await waitFor("!document.querySelector('[data-refresh-applications]').disabled", "refresh complete");
    assert.equal(
      await evaluate("document.querySelector('.status-editor textarea')?.value"),
      "浏览器审核备注",
      "refresh must not discard full detail",
    );
    await click("[data-correct-application]");
    await waitFor("!!document.querySelector('[data-correction-form]')", "correction form");
    await fill("[data-correction-form] input[name=name]", "更正测试新生");
    await evaluate("document.querySelector('[data-correction-form]').requestSubmit()");
    await waitFor("document.querySelector('.detail-heading h3')?.textContent === '更正测试新生'", "corrected detail");
    await fill("[data-transfer-department]", "工程项目部");
    await click("[data-transfer-application]");
    await waitFor(
      "document.querySelector('[data-review-history]')?.textContent.includes('工程项目部')",
      "transfer history",
    );
    const saved = await store.get(selectedId);
    assert.equal(saved.name, "更正测试新生");
    assert.equal(saved.preferredDepartment, "工程项目部");
    assert.equal(saved.originalDepartment, "数据算法部");
    assert.equal(saved.reviewHistory.length, 3);
    await fill("[data-filter-season]", "2025");
    await fill(".toolbar-filters label:nth-child(3) select", "通过");
    await waitFor(
      "document.querySelector('.admin-summary')?.textContent.includes('共 1 条')",
      "filtered previous season",
    );
    assert.equal(await evaluate("document.querySelector('[data-purge-season]').disabled"), true);
    // Inspect the generated Blob without writing downloads to the user's computer.
    await evaluate(`(() => {
      const originalUrl = URL.createObjectURL;
      URL.createObjectURL = function(blob) {
        blob.text().then(text => { window.testBackup = JSON.parse(text); });
        return originalUrl.call(URL, blob);
      };
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download.startsWith('卓软整季备份-')) return;
        return originalClick.call(this);
      };
    })()`);
    await click("[data-backup-season]");
    await waitFor(
      "window.testBackup?.records?.length === 2 && !!document.querySelector('.form-panel input[type=checkbox]')",
      "full season backup ignores filters",
    );
    assert.ok(
      await evaluate("testBackup.records.every(record => record.photoData && Array.isArray(record.reviewHistory))"),
    );
    await store.revise("ZR-BROWSER-OLD-001", { reviewNote: "备份后更正" });
    await click(".form-panel input[type=checkbox]");
    await fill("[data-purge-confirm]", "2025");
    await click("[data-purge-season]");
    await waitFor(
      "document.querySelector('.admin-notice')?.textContent.includes('重新备份')",
      "stale backup blocks cleanup",
    );
    assert.ok(await store.get("ZR-BROWSER-OLD-001"));
    await click("[data-backup-season]");
    await waitFor(
      "!!document.querySelector('.form-panel input[type=checkbox]') && document.querySelector('.admin-notice')?.textContent.includes('整季备份包含 2')",
      "fresh season backup",
    );
    await click(".form-panel input[type=checkbox]");
    const seasonShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, "admin-season-backup.png"), Buffer.from(seasonShot.data, "base64"));
    await click("[data-purge-season]");
    await waitFor(
      "document.querySelector('.admin-notice')?.textContent.includes('已清理 2 条')",
      "atomic whole-season cleanup",
    );
    assert.equal(await store.get("ZR-BROWSER-OLD-002"), null);
    await fill(".toolbar-filters label:nth-child(3) select", "");
    await waitFor("document.querySelectorAll('[data-application-list] tr').length === 20", "current season restored");
    await click("[data-application-list] tr button");
    await waitFor("!!document.querySelector('.applicant-photo')", "detail after cleanup");
    const desktop = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, "admin-desktop.png"), Buffer.from(desktop.data, "base64"));

    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await fill("[data-filter-keyword]", "202600000001");
    await waitFor(
      "document.querySelectorAll('[data-application-list] tr').length === 1 && document.querySelector('[data-application-list]')?.textContent.includes('测试新生1')",
      "mobile filtered list",
    );
    await click("[data-application-list] tr button");
    await waitFor(
      "!!document.querySelector('.applicant-photo') && document.querySelector('.detail-heading h3')?.textContent === '测试新生1'",
      "mobile detail",
    );
    await delay(400);
    const rect = await evaluate(
      "({top: document.querySelector('[data-application-detail]').getBoundingClientRect().top, overflow: document.documentElement.scrollWidth - innerWidth})",
    );
    assert.ok(rect.top < 300 && rect.top >= -100, "mobile must scroll to detail panel");
    assert.ok(rect.overflow <= 2, "mobile should not overflow horizontally");
    const mobile = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, "admin-mobile.png"), Buffer.from(mobile.data, "base64"));
    await click("[data-header-logout]");
    await waitFor("!document.querySelector('[data-header-logout]')", "logout");
    assert.equal(await evaluate("sessionStorage.getItem('zhuoruan_session_token')"), null);
    await evaluate("location.hash = 'status'");
    await waitFor("!!document.querySelector('.status-panel')", "public lookup");
    const lookedUp = await store.get("ZR-BROWSER-001");
    await fill(".status-panel input[inputmode=numeric]", "202600000001");
    await fill(".status-panel input[name=phone]", lookedUp.phone);
    await evaluate("document.querySelector('.status-panel').requestSubmit()");
    await waitFor("document.querySelector('.status-result')?.textContent.includes('测试新生1')", "lookup result");
    assert.equal(exceptions.length, 0, "no uncaught browser errors");
    console.log(
      "PASS browser: signup fields, drafts, login, paging, audit, correction, transfer, full season backup, stale-backup rejection, atomic cleanup, mobile and logout/lookup",
    );
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(
        {
          passed: true,
          testedAt: new Date().toISOString(),
          syntheticRecords: 27,
          browserErrors: exceptions,
          screenshots: ["admin-desktop.png", "admin-mobile.png", "admin-season-backup.png"],
        },
        null,
        2,
      ),
    );
    await send("Target.closeTarget", { targetId }, true);
    targetId = null;
  } finally {
    if (targetId && socket?.readyState === WebSocket.OPEN) {
      // Close only the tab allocated by this test; do not touch existing user tabs.
      socket.send(JSON.stringify({ id: 999999, method: "Target.closeTarget", params: { targetId } }));
      await delay(100);
    }
    socket?.close();
    await new Promise((resolve) => server.close(resolve));
    const target = path.resolve(directory);
    assert.ok(
      target.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
        path.basename(target).startsWith("zhuoruan-browser-test-"),
    );
    fs.rmSync(target, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
