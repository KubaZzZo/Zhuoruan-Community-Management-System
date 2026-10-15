const assert = require("assert");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { attachRecruitmentApi, clientAddress, createRecruitmentService } = require("../server/api.cjs");
const { createApplicationStore } = require("../server/store.cjs");
const { createAccountBook, hashPassword, setAccountDisabled } = require("../server/accounts.cjs");
const { loadRecruitmentConfig, publicPolicy } = require("../server/config.cjs");

const accounts = [
  {
    username: "yanfa",
    password: "test-dev-password-strong",
    role: "minister",
    name: "数据算法部长",
    department: "数据算法部",
  },
  {
    username: "xiangmu",
    password: "test-project-password-strong",
    role: "minister",
    name: "工程项目部长",
    department: "工程项目部",
  },
  { username: "shezhang", password: "test-president-password-strong", role: "president", name: "社长", department: "" },
];
const config = loadRecruitmentConfig({ SESSION_TTL_MINUTES: "5" });
const validApplication = {
  name: "张三",
  gender: "男",
  birthDate: "2005-03",
  ethnicity: "汉族",
  politicalStatus: "共青团员",
  college: "科文学院",
  departmentMajor: "软件工程系",
  className: "软件工程 2401",
  studentId: "202401010001",
  phone: "13812345678",
  qq: "123456789",
  preferredDepartment: "数据算法部",
  acceptAdjustment: "是",
  strengths: "熟悉 JavaScript",
  awards: "网页比赛",
  experience: "学习委员",
  careerPlan: "提升开发能力",
  availableTime: "周三晚上、周六下午",
  photoName: "avatar.jpg",
  photoData:
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
};
async function request(port, url, { method = "GET", body, token } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, payload: await response.json(), headers: response.headers };
}
async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zhuoruan-api-test-"));
  const middleware = attachRecruitmentApi(path.join(directory, "applications.json"), { accounts, config });
  const server = http.createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const api = (url, options) => request(port, url, options);
  try {
    const policy = await api("/api/recruitment");
    assert.strictEqual(policy.payload.policy.isOpen, true);
    assert.deepStrictEqual(policy.payload.departments, ["综合运营部", "数据算法部", "工程项目部"]);
    assert.ok(!policy.payload.departments.includes("实干青年部"));
    const tokens = {};
    for (const account of accounts) {
      const login = await api("/api/login", {
        method: "POST",
        body: { username: account.username, password: account.password },
      });
      assert.strictEqual(login.status, 200);
      tokens[account.username] = login.payload.token;
      assert.ok(login.payload.expiresAt);
    }
    const created = await api("/api/applications", { method: "POST", body: { ...validApplication, status: "通过" } });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.payload.record.status, "待审核");
    assert.strictEqual(created.payload.record.preferredDepartment, validApplication.preferredDepartment);
    assert.strictEqual(created.payload.record.season, "2026");
    assert.strictEqual(created.payload.record.photoData, undefined);
    assert.strictEqual(created.headers.get("cache-control"), "no-store");
    const id = created.payload.record.id;
    const code = created.payload.record.phone;
    assert.strictEqual(code, validApplication.phone);
    assert.strictEqual(created.payload.record.queryCode, undefined);
    const route = `/api/applications/${id}`;
    assert.strictEqual(created.payload.record.quiz, undefined);
    const pendingLook = await api(`/api/applications/lookup?studentId=${validApplication.studentId}&phone=${code}`);
    assert.strictEqual(pendingLook.payload.record.status, "待审核");
    assert.strictEqual(pendingLook.payload.record.quizPending, undefined);
    for (const pathname of ["/api/applications/quiz", "/api/applications/quiz/load"]) {
      for (const method of ["GET", "POST"]) {
        const removed = await api(pathname, { method, ...(method === "POST" ? { body: {} } : {}) });
        assert.strictEqual(removed.status, 410);
      }
    }
    const detail = await api(route, { token: tokens.yanfa });
    assert.strictEqual(detail.payload.record.photoData, validApplication.photoData);
    assert.strictEqual(detail.payload.record.version, 0);
    assert.strictEqual(detail.payload.record.quizCorrectCount, undefined);
    assert.strictEqual(detail.payload.record.quizCompleted, undefined);
    assert.strictEqual(detail.payload.record.quizAnswers, undefined);
    assert.strictEqual(detail.payload.record.quizQuestionIds, undefined);
    assert.strictEqual((await api(route)).status, 401);
    assert.strictEqual((await api(route, { token: tokens.xiangmu })).status, 403);
    const otherList = await api("/api/applications?department=数据算法部", { token: tokens.xiangmu });
    assert.strictEqual(otherList.payload.total, 0, "minister cannot override department");
    const list = await api("/api/applications?pageSize=1", { token: tokens.shezhang });
    assert.strictEqual(list.payload.total, 1);
    assert.strictEqual(list.payload.records[0].photoData, undefined);
    assert.strictEqual(list.payload.records[0].strengths, undefined);
    assert.strictEqual(list.payload.records[0].quizCorrectCount, undefined);
    assert.strictEqual(list.payload.records[0].quizAnswers, undefined);
    assert.strictEqual((await api("/api/applications?pageSize=1000", { token: tokens.shezhang })).status, 400);
    const blocked = await api(route, {
      method: "PATCH",
      token: tokens.xiangmu,
      body: { status: "通过", expectedVersion: 0 },
    });
    assert.strictEqual(blocked.status, 403);
    assert.strictEqual(
      (await api(route, { method: "PATCH", token: tokens.yanfa, body: { status: "通过" } })).status,
      400,
    );
    const update = await api(route, {
      method: "PATCH",
      token: tokens.yanfa,
      body: {
        status: "已面试",
        reviewNote: "安排周三面试",
        interviewAt: "2026-10-08T19:00",
        interviewLocation: "实训楼 301",
        expectedVersion: 0,
      },
    });
    assert.strictEqual(update.status, 200);
    assert.strictEqual(update.payload.record.version, 1);
    assert.strictEqual(update.payload.record.quizCorrectCount, undefined);
    assert.strictEqual(update.payload.record.reviewHistory[0].actor, "yanfa");
    const stale = await api(route, {
      method: "PATCH",
      token: tokens.yanfa,
      body: { status: "通过", expectedVersion: 0 },
    });
    assert.strictEqual(stale.status, 409);
    const look = await api(`/api/applications/lookup?studentId=202401010001&phone=${code}`);
    assert.strictEqual(look.payload.record.status, "已面试");
    assert.strictEqual(look.payload.record.quizCompleted, undefined);
    assert.strictEqual(look.payload.record.quizPending, undefined);
    assert.strictEqual(look.payload.record.interviewAt, "2026-10-08T19:00");
    assert.strictEqual(look.payload.record.interviewLocation, "实训楼 301");
    assert.ok(look.payload.record.notice.includes("实训楼 301"));
    assert.ok(!look.payload.record.notice.includes("安排周三面试"));
    assert.strictEqual(
      (await api(`/api/applications/lookup?studentId=202401010001&phone=${code.toLowerCase()}`)).status,
      200,
    );
    for (const field of ["phone", "photoData", "reviewHistory", "reviewNote", "queryCode", "quizCorrectCount", "quiz"])
      assert.strictEqual(look.payload.record[field], undefined);
    assert.strictEqual(
      (await api(`/api/applications/lookup?studentId=202401010001&phone=13988888888`)).status,
      404,
      "lookup rejects the wrong phone",
    );
    assert.strictEqual((await api(`/api/applications/lookup?studentId=202401010001&phone=13812345678`)).status, 200);
    assert.strictEqual((await api(`/api/applications/lookup?id=${id}&phone=${code}`)).status, 400);
    const duplicate = await api("/api/applications", { method: "POST", body: validApplication });
    assert.strictEqual(duplicate.status, 409);
    const duplicatePhone = await api("/api/applications", {
      method: "POST",
      body: { ...validApplication, studentId: "202401010002", qq: "223456789" },
    });
    assert.strictEqual(duplicatePhone.status, 409);
    const internal = await api("/api/applications", {
      method: "POST",
      body: { ...validApplication, preferredDepartment: "实干青年部" },
    });
    assert.strictEqual(internal.status, 400);
    const badType = await api("/api/applications", {
      method: "POST",
      body: { ...validApplication, name: { fake: true } },
    });
    assert.strictEqual(badType.status, 400);
    assert.strictEqual((await api("/api/applications", { method: "POST", body: [] })).status, 400);
    const correction = await api(`${route}/correction`, {
      method: "PATCH",
      token: tokens.yanfa,
      body: { changes: { name: "李三", phone: "13912345678" }, expectedVersion: 1 },
    });
    assert.strictEqual(correction.status, 200);
    assert.strictEqual(correction.payload.record.version, 2);
    assert.strictEqual(correction.payload.record.reviewHistory.length, 2);
    const immutable = await api(`${route}/correction`, {
      method: "PATCH",
      token: tokens.yanfa,
      body: { changes: { preferredDepartment: "工程项目部" }, expectedVersion: 2 },
    });
    assert.strictEqual(immutable.status, 400);
    assert.strictEqual(
      (
        await api(`${route}/transfer`, {
          method: "PATCH",
          token: tokens.yanfa,
          body: { department: "工程项目部", expectedVersion: 2 },
        })
      ).status,
      403,
    );
    const transfer = await api(`${route}/transfer`, {
      method: "PATCH",
      token: tokens.shezhang,
      body: { department: "工程项目部", expectedVersion: 2 },
    });
    assert.strictEqual(transfer.status, 200);
    assert.strictEqual(transfer.payload.record.originalDepartment, "数据算法部");
    assert.strictEqual(transfer.payload.record.version, 3);
    assert.strictEqual((await api(route, { token: tokens.yanfa })).status, 403);
    assert.strictEqual((await api(route, { token: tokens.xiangmu })).status, 200);
    const exported = await api("/api/applications/export?department=工程项目部", { token: tokens.shezhang });
    assert.strictEqual(exported.payload.records.length, 1);
    assert.strictEqual(exported.payload.records[0].strengths, validApplication.strengths);
    assert.strictEqual(exported.payload.records[0].hasPhoto, true);
    assert.strictEqual(exported.payload.records[0].photoData, undefined);
    assert.strictEqual(exported.payload.records[0].reviewHistory, undefined);
    assert.strictEqual(exported.payload.records[0].quizCorrectCount, undefined);
    assert.strictEqual(exported.payload.records[0].quizAnswers, undefined);
    assert.strictEqual(exported.payload.records[0].quizQuestionIds, undefined);
    const noConsent = await api(`${route}/correction`, {
      method: "PATCH",
      token: tokens.xiangmu,
      body: { changes: { acceptAdjustment: "否" }, expectedVersion: 3 },
    });
    assert.strictEqual(noConsent.status, 200);
    assert.strictEqual(
      (
        await api(`${route}/transfer`, {
          method: "PATCH",
          token: tokens.shezhang,
          body: { department: "数据算法部", expectedVersion: 4 },
        })
      ).status,
      409,
    );
    const photoBody = {
      ...validApplication,
      name: "照片同学",
      studentId: "202401010088",
      phone: "13712345678",
      qq: "323456789",
    };
    const photoApp = await api("/api/applications", { method: "POST", body: photoBody });
    assert.strictEqual(photoApp.status, 201);
    const photoRoute = `/api/applications/${photoApp.payload.record.id}`;
    const otherPhoto = validApplication.photoData.replace("4AAQ", "4AAR");
    const replaced = await api(`${photoRoute}/photo`, {
      method: "PATCH",
      token: tokens.yanfa,
      body: { photoData: otherPhoto, photoName: "new.jpg", expectedVersion: 0 },
    });
    assert.strictEqual(replaced.status, 200);
    assert.strictEqual(replaced.payload.record.photoData, otherPhoto);
    assert.strictEqual(replaced.payload.record.photoName, "new.jpg");
    const photoHistory = JSON.stringify(replaced.payload.record.reviewHistory);
    assert.ok(photoHistory.includes("已更换"));
    assert.ok(!photoHistory.includes("base64"));
    assert.strictEqual(
      (
        await api(`${photoRoute}/photo`, {
          method: "PATCH",
          token: tokens.xiangmu,
          body: { photoData: otherPhoto, photoName: "x.jpg", expectedVersion: 1 },
        })
      ).status,
      403,
    );
    assert.strictEqual(
      (
        await api(`${photoRoute}/photo`, {
          method: "PATCH",
          token: tokens.yanfa,
          body: { photoData: "data:image/png;base64,aaaa", photoName: "x.png", expectedVersion: 1 },
        })
      ).status,
      400,
    );
    assert.strictEqual(
      (
        await api(photoRoute, {
          method: "DELETE",
          token: tokens.xiangmu,
          body: { confirm: photoBody.studentId, expectedVersion: 1 },
        })
      ).status,
      403,
    );
    assert.strictEqual(
      (
        await api(photoRoute, {
          method: "DELETE",
          token: tokens.yanfa,
          body: { confirm: "00000000", expectedVersion: 1 },
        })
      ).status,
      400,
    );
    const removed = await api(photoRoute, {
      method: "DELETE",
      token: tokens.yanfa,
      body: { confirm: photoBody.studentId, expectedVersion: 1 },
    });
    assert.strictEqual(removed.status, 200);
    assert.strictEqual(removed.payload.removed, 1);
    assert.strictEqual((await api(photoRoute, { token: tokens.shezhang })).status, 404);
    assert.strictEqual((await api("/api/applications", { method: "POST", body: photoBody })).status, 201);
    assert.strictEqual(
      (
        await api("/api/accounts/xiangmu/status", {
          method: "POST",
          token: tokens.yanfa,
          body: { disabled: true },
        })
      ).status,
      403,
    );
    assert.strictEqual(
      (
        await api("/api/accounts/shezhang/status", {
          method: "POST",
          token: tokens.shezhang,
          body: { disabled: true },
        })
      ).status,
      400,
    );
    const disabled = await api("/api/accounts/yanfa/status", {
      method: "POST",
      token: tokens.shezhang,
      body: { disabled: true },
    });
    assert.strictEqual(disabled.status, 200);
    assert.strictEqual(disabled.payload.account.disabled, true);
    assert.strictEqual((await api("/api/session", { token: tokens.yanfa })).status, 401);
    assert.strictEqual(
      (await api("/api/login", { method: "POST", body: { username: "yanfa", password: accounts[0].password } })).status,
      403,
    );
    const staffList = await api("/api/accounts", { token: tokens.shezhang });
    assert.strictEqual(staffList.payload.accounts.find((item) => item.username === "yanfa").disabled, true);
    assert.strictEqual(
      (await api("/api/accounts/yanfa/status", { method: "POST", token: tokens.shezhang, body: { disabled: false } }))
        .status,
      200,
    );
    await api("/api/logout", { method: "POST", token: tokens.shezhang });
    assert.strictEqual((await api("/api/session", { token: tokens.shezhang })).status, 401);
    for (let i = 0; i < 8; i++)
      assert.strictEqual(
        (await api("/api/login", { method: "POST", body: { username: "unknown", password: "wrong-password" } })).status,
        401,
      );
    assert.strictEqual(
      (await api("/api/login", { method: "POST", body: { username: "unknown", password: "wrong-password" } })).status,
      429,
    );
    console.log(
      "PASS HTTP API: permissions, paging, safe receipts, duplicate/type checks, versions, audit, correction, transfer, export, logout and rate limit",
    );

    let time = Date.parse("2026-10-01T00:00:00Z");
    const service = createRecruitmentService({
      dataFile: path.join(directory, "clock.json"),
      accounts,
      config,
      now: () => time,
    });
    const login = service.login(accounts[0].username, accounts[0].password, "clock");
    assert.ok(service.requireAccount(login.token));
    time += config.sessionTtlMs;
    assert.throws(
      () => service.requireAccount(login.token),
      (error) => error.status === 401,
    );
    const closed = createRecruitmentService({
      dataFile: path.join(directory, "closed.json"),
      accounts,
      config: { ...config, enabled: false },
    });
    await assert.rejects(
      () => closed.submit(validApplication, "closed"),
      (error) => error.status === 403,
    );
    const window = loadRecruitmentConfig({
      RECRUITMENT_OPENS_AT: "2026-10-01T08:00:00+08:00",
      RECRUITMENT_CLOSES_AT: "2026-10-02T08:00:00+08:00",
    });
    assert.strictEqual(publicPolicy(window, Date.parse(window.opensAt) - 1).isOpen, false);
    assert.strictEqual(publicPolicy(window, Date.parse(window.opensAt)).isOpen, true);
    assert.strictEqual(publicPolicy(window, Date.parse(window.closesAt)).isOpen, false);
    assert.throws(() => loadRecruitmentConfig({ RECRUITMENT_ENABLED: "no" }));
    assert.throws(() => loadRecruitmentConfig({ TRUST_PROXY: "yes" }));
    assert.strictEqual(loadRecruitmentConfig({ TRUST_PROXY: "true" }).trustProxy, true);
    const forwarded = {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    };
    assert.strictEqual(clientAddress(forwarded, false), "127.0.0.1");
    assert.strictEqual(clientAddress(forwarded, true), "203.0.113.8");
    assert.strictEqual(
      clientAddress({ headers: { "x-forwarded-for": "not an ip" }, socket: { remoteAddress: "127.0.0.1" } }, true),
      "127.0.0.1",
    );
    const saltedA = createAccountBook(accounts);
    const saltedB = createAccountBook(accounts);
    assert.notStrictEqual(saltedA[0].salt, saltedB[0].salt);
    assert.strictEqual(saltedA[0].password, undefined);
    const parallel = createApplicationStore(path.join(directory, "parallel.json"));
    const results = await Promise.allSettled([
      parallel.insert({ ...validApplication, id: "1" }),
      parallel.insert({ ...validApplication, id: "2" }),
    ]);
    assert.strictEqual(results.filter((result) => result.status === "fulfilled").length, 1);
    const shared = createApplicationStore(path.join(directory, "seasons.json"));
    const seasonA = createRecruitmentService({ store: shared, accounts, config: { ...config, season: "2026" } });
    const seasonB = createRecruitmentService({ store: shared, accounts, config: { ...config, season: "2027" } });
    const first = await seasonA.submit(validApplication, "season-a");
    const second = await seasonB.submit(validApplication, "season-b");
    assert.strictEqual(first.phone, second.phone);
    assert.strictEqual(
      (await seasonA.lookup(validApplication.studentId, validApplication.phone, "lookup-a")).id,
      first.id,
    );
    assert.strictEqual(
      (await seasonB.lookup(validApplication.studentId, validApplication.phone, "lookup-b")).id,
      second.id,
    );
    const seasonLogin = seasonB.login(accounts[2].username, accounts[2].password, "season-login");
    assert.strictEqual((await seasonB.list(seasonLogin.token, {})).total, 1);
    assert.strictEqual((await seasonB.list(seasonLogin.token, { season: "all" })).total, 2);
    await assert.rejects(
      () => seasonB.updateStatus(seasonLogin.token, first.id, { status: "通过", expectedVersion: 0 }),
      (error) => error.status === 409,
    );
    await assert.rejects(
      () => seasonB.purgeSeason(seasonLogin.token, "2027", "2027"),
      (error) => error.status === 409,
    );
    const backup = await seasonB.backupSeason(seasonLogin.token, "2026");
    assert.strictEqual(
      (await seasonB.purgeSeason(seasonLogin.token, "2026", "2026", backup.backupToken, true)).removed,
      1,
    );
    const createdStaff = seasonB.createStaff(seasonLogin.token, {
      username: "yanfa2",
      name: "数据算法部张三",
      role: "minister",
      department: "数据算法部",
    });
    assert.ok(createdStaff.password.length >= 12);
    seasonB.changePassword(seasonLogin.token, accounts[2].password, "new-president-password");
    assert.throws(
      () => seasonB.login(accounts[2].username, accounts[2].password, "season-old"),
      (error) => error.status === 401,
    );
    const reset = seasonB.resetPassword(seasonLogin.token, "yanfa2");
    assert.ok(reset.password);
    const active = seasonB.login("yanfa2", reset.password, "before-disable");
    seasonB.setStaffDisabled(seasonLogin.token, "yanfa2", true);
    assert.throws(
      () => seasonB.requireAccount(active.token),
      (error) => error.status === 401,
    );
    assert.throws(
      () => seasonB.login("yanfa2", reset.password, "after-disable"),
      (error) => error.status === 403,
    );
    assert.throws(
      () => seasonB.login("yanfa2", "wrong-password-value", "wrong-after-disable"),
      (error) => error.status === 401,
    );
    seasonB.setStaffDisabled(seasonLogin.token, "yanfa2", false);
    assert.ok(seasonB.login("yanfa2", reset.password, "restored").token);
    const projectLogin = seasonB.login(accounts[1].username, accounts[1].password, "project-delete");
    await assert.rejects(
      () => seasonB.removeApplication(projectLogin.token, second.id, second.studentId, 0),
      (error) => error.status === 403,
    );
    assert.strictEqual((await seasonB.removeApplication(seasonLogin.token, second.id, second.studentId, 0)).removed, 1);
    await assert.rejects(
      () => seasonB.detail(seasonLogin.token, second.id),
      (error) => error.status === 404,
    );
    const sole = createAccountBook(accounts);
    assert.throws(
      () => setAccountDisabled(sole, "shezhang", true),
      (error) => error.status === 409,
    );
    const staffFile = path.join(directory, "staff.json");
    const salt = "ab".repeat(16);
    fs.writeFileSync(
      staffFile,
      JSON.stringify([
        {
          username: "shezhang",
          role: "president",
          name: "社长",
          department: "",
          salt,
          passwordHash: hashPassword("test-president-password-strong", salt),
        },
        {
          username: "yanfa",
          role: "minister",
          name: "数据算法部长",
          department: "数据算法部",
          salt,
          passwordHash: hashPassword("test-dev-password-strong", salt),
        },
      ]),
    );
    const previousFile = process.env.STAFF_ACCOUNTS_FILE;
    process.env.STAFF_ACCOUNTS_FILE = staffFile;
    try {
      const persisted = createAccountBook();
      setAccountDisabled(persisted, "yanfa", true);
      const saved = JSON.parse(fs.readFileSync(staffFile, "utf8"));
      assert.strictEqual(saved.find((item) => item.username === "yanfa").disabled, true);
      assert.strictEqual(saved[0].password, undefined);
    } finally {
      if (previousFile === undefined) delete process.env.STAFF_ACCOUNTS_FILE;
      else process.env.STAFF_ACCOUNTS_FILE = previousFile;
    }
    console.log(
      "PASS session expiry, recruitment deadline boundaries, random salts, seasons, accounts and concurrent duplicate protection",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    const target = path.resolve(directory);
    assert.ok(
      target.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(target).startsWith("zhuoruan-api-test-"),
    );
    fs.rmSync(target, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
