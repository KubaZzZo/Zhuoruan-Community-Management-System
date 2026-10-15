const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const vm = require("node:vm");
const jpeg = require("jpeg-js");
const vue = require("vue");
const { createHttpHandler } = require("../server/index.cjs");
const { createRecruitmentService } = require("../server/api.cjs");
const { createApplicationStore } = require("../server/store.cjs");
const { createMysqlPool } = require("../server/mysqlStore.cjs");
const { loadRecruitmentConfig } = require("../server/config.cjs");
const {
  createAccountBook,
  changeAccountPassword,
  addStaffAccount,
  setAccountDisabled,
  verifyPassword,
} = require("../server/accounts.cjs");
const logic = require("../src/recruitment.cjs");

const accounts = [
  { username: "scan-admin", password: "test-admin-long-password", role: "president", name: "测试社长" },
  {
    username: "scan-minister",
    password: "test-minister-long-password",
    role: "minister",
    department: "数据算法部",
    name: "测试部长",
  },
];
const photo =
  "data:image/jpeg;base64," + jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }).data.toString("base64");
const fixture = {
  id: "ZR-FIXTURE-001",
  name: "虚构测试",
  gender: "男",
  birthDate: "2005-03",
  ethnicity: "汉族",
  politicalStatus: "群众",
  college: "人工智能与软件学院",
  departmentMajor: "软件工程",
  className: "测试班",
  studentId: "202600000001",
  phone: "13800000001",
  qq: "100000001",
  preferredDepartment: "数据算法部",
  acceptAdjustment: "是",
  strengths: "测试",
  careerPlan: "测试",
  availableTime: "周六",
  photoName: "test.jpg",
  photoData: photo,
  status: "待审核",
  season: "2025",
};

function rawRequest(port, pathname, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: "127.0.0.1", port, path: pathname, method }, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve({ status: response.statusCode, body, headers: response.headers }));
    });
    request.on("error", reject);
    request.end();
  });
}

async function submissionChecks(directory) {
  const store = createApplicationStore(path.join(directory, "submission-retries.json"));
  const config = loadRecruitmentConfig({});
  const service = createRecruitmentService({ store, accounts, config });
  const input = { ...fixture, submissionKey: "a".repeat(64) };
  const receipts = await Promise.all([service.submit(input, "campus"), service.submit(input, "campus")]);
  assert.equal(receipts[0].phone, receipts[1].phone);
  assert.equal(receipts[0].id, receipts[1].id);
  assert.equal(store.read().length, 1, "concurrent retries create only one record");
  const restarted = createRecruitmentService({ store, accounts, config: { ...config, enabled: false } });
  assert.equal(
    (await restarted.submit(input, "campus")).phone,
    receipts[0].phone,
    "lost receipts recover after restart and after recruitment closes",
  );
  for (const changes of [{ submissionKey: "b".repeat(64) }, { name: "不同的内容" }, { submissionKey: undefined }]) {
    await assert.rejects(
      () => service.submit({ ...input, ...changes }, "other-ip"),
      (error) => error.status === 409,
    );
  }
  await assert.rejects(
    () => service.submit({ ...input, submissionKey: "guess" }, "other-ip"),
    (error) => error.status === 400,
  );
  const recovered = await restarted.submit(input, "campus");
  assert.equal(recovered.quiz, undefined);
  for (let i = 2; i <= 40; i++) {
    const applicant = {
      ...fixture,
      studentId: String(202600000000 + i),
      phone: String(13900000000 + i),
      qq: String(900000000 + i),
    };
    const receipt = await service.submit(applicant, "campus");
    assert.equal((await service.lookup(applicant.studentId, receipt.phone, "campus")).status, "待审核");
  }
  for (let i = 0; i < 30; i++) {
    await assert.rejects(
      () => service.lookup("202688888888", "13988888888", `rotating-ip-${i}`),
      (error) => error.status === 404,
    );
  }
  await assert.rejects(
    () => service.lookup("202688888888", "13988888888", "new-ip"),
    (error) => error.status === 429,
  );
  const capped = createRecruitmentService({ store, accounts, config: { ...config, submissionIpLimit: 10 } });
  for (let i = 0; i < 10; i++) await capped.submit(input, "capped-ip");
  await assert.rejects(
    () => capped.submit(input, "capped-ip"),
    (error) => error.status === 429,
  );
  console.log(
    "PASS durable submission recovery, concurrent retries, secret/content binding, direct progress lookup and shared-campus limits",
  );
}

async function departmentChecks(directory) {
  const store = createApplicationStore(path.join(directory, "historical-departments.json"));
  await store.insert({
    ...fixture,
    season: "2026",
    preferredDepartment: "研发部",
    originalDepartment: "研发部",
    version: 0,
  });
  const legacyMinister = {
    username: "legacy-minister",
    password: "legacy-test-long-password",
    role: "minister",
    department: "研发部",
  };
  const service = createRecruitmentService({ store, accounts: [...accounts, legacyMinister] });
  const president = service.login(accounts[0].username, accounts[0].password, "admin");
  const current = service.login(accounts[1].username, accounts[1].password, "current");
  const legacy = service.login(legacyMinister.username, legacyMinister.password, "legacy");
  assert.equal((await service.list(president.token, { department: "研发部" })).total, 1);
  assert.equal((await service.list(legacy.token, {})).total, 1);
  assert.equal((await service.list(current.token, {})).total, 0);
  await assert.rejects(
    () => service.detail(current.token, fixture.id),
    (error) => error.status === 403,
  );
  const corrected = await service.correct(legacy.token, fixture.id, { strengths: "更新历史资料" }, 0);
  assert.equal(corrected.preferredDepartment, "研发部");
  assert.equal(corrected.originalDepartment, "研发部");
  assert.equal((await service.lookup(fixture.studentId, fixture.phone, "lookup")).preferredDepartment, "研发部");
  const archivedService = createRecruitmentService({
    store,
    accounts,
    config: loadRecruitmentConfig({ RECRUITMENT_SEASON: "2027" }),
  });
  const archiveAdmin = archivedService.login(accounts[0].username, accounts[0].password, "archive");
  assert.equal(
    (await archivedService.backupSeason(archiveAdmin.token, "2026")).backup.records[0].preferredDepartment,
    "研发部",
  );
  await assert.rejects(
    () => service.transfer(president.token, fixture.id, "外联部", 1),
    (error) => error.status === 400,
  );
  await assert.rejects(
    () => service.submit({ ...fixture, preferredDepartment: "研发部" }, "signup"),
    (error) => error.status === 400,
  );
  assert.throws(
    () => service.createStaff(president.token, { username: "old-new", role: "minister", department: "研发部" }),
    (error) => error.status === 400,
  );
  for (const [index, department] of logic.ALL_DEPARTMENTS.entries()) {
    assert.equal(
      service.createStaff(president.token, { username: `current-${index}`, role: "minister", department }).account
        .department,
      department,
    );
  }
  const moved = await service.transfer(president.token, fixture.id, "工程项目部", 1);
  assert.equal(moved.originalDepartment, "研发部");
  assert.equal(moved.preferredDepartment, "工程项目部");
  assert.equal((await service.list(legacy.token, {})).total, 0);
  console.log(
    "PASS current department signup/accounts and historical lookup, correction, permissions and backup compatibility",
  );
}

async function staticChecks(directory) {
  const root = path.join(directory, "dist");
  fs.mkdirSync(root);
  fs.mkdirSync(path.join(directory, "dist-private"));
  fs.writeFileSync(path.join(root, "index.html"), "<p>fixture</p>");
  fs.writeFileSync(path.join(root, "app.js"), "fixture-script");
  fs.writeFileSync(path.join(directory, "dist-private", "fixture.txt"), "private-fixture");
  const server = http.createServer(createHttpHandler({ root, api: (req, res, next) => next() }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    for (const pathname of [
      "/%ZZ",
      "/%E0%A4%A",
      "/..%5cdist-private%5cfixture.txt",
      "/%2e%2e%2fdist-private/fixture.txt",
      "/app.js%3Asecret",
      "/%00",
    ]) {
      assert.equal((await rawRequest(port, pathname)).status, 400, pathname);
    }
    const good = await rawRequest(port, "/app.js");
    assert.equal(good.status, 200);
    assert.equal(good.body, "fixture-script");
    assert.ok(good.headers["content-security-policy"]);
    assert.equal((await rawRequest(port, "/app.js", "HEAD")).body, "");
    assert.equal((await rawRequest(port, "/", "POST")).status, 405);
    assert.equal((await rawRequest(port, "/")).status, 200, "server still responds after bad requests");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("PASS production HTTP handler rejects malformed URLs and path escapes without exiting");
}

async function serviceChecks(directory) {
  const store = createApplicationStore(path.join(directory, "records.json"));
  await store.insert(fixture);
  const other = {
    ...fixture,
    id: "ZR-FIXTURE-002",
    studentId: "202600000002",
    phone: "13800000002",
    qq: "100000002",
    preferredDepartment: "工程项目部",
    status: "未通过",
  };
  await store.insert({ ...other, quizQuestionIds: "[1,2,3,4,5]", quizAnswers: '["A"]', quizCorrectCount: "1" });
  await store.revise(fixture.id, { reviewNote: "历史记录" }, { expectedVersion: 0, actor: { username: "test" } });
  let time = Date.now();
  const service = createRecruitmentService({ store, accounts, now: () => time, config: loadRecruitmentConfig({}) });
  const admin = service.login(accounts[0].username, accounts[0].password, "admin");
  const secondSession = service.login(accounts[0].username, accounts[0].password, "other");
  const minister = service.login(accounts[1].username, accounts[1].password, "minister");
  await assert.rejects(
    () => service.backupSeason(minister.token, "2025"),
    (error) => error.status === 403,
  );
  await assert.rejects(
    () => service.purgeSeason(admin.token, "2025", "2025"),
    (error) => error.status === 409,
  );
  await service.exportRecords(admin.token, { season: "2025", department: "数据算法部" });
  await assert.rejects(
    () => service.purgeSeason(admin.token, "2025", "2025"),
    (error) => error.status === 409,
    "filtered export never unlocks purge",
  );
  const backup = await service.backupSeason(admin.token, "2025");
  assert.equal(backup.count, 2);
  assert.equal(backup.backup.records.find((item) => item.id === other.id).quizCorrectCount, "1");
  assert.equal((await service.detail(admin.token, other.id)).quizCorrectCount, undefined);
  assert.equal(
    (await service.exportRecords(admin.token, { season: "2025" })).find((item) => item.id === other.id)
      .quizCorrectCount,
    undefined,
  );

  assert.equal(backup.backup.records.find((item) => item.id === fixture.id).photoData, photo);
  assert.equal(backup.backup.records.find((item) => item.id === fixture.id).reviewHistory.length, 1);
  await assert.rejects(
    () => service.purgeSeason(secondSession.token, "2025", "2025", backup.backupToken, true),
    (error) => error.status === 409,
  );
  await assert.rejects(
    () => service.purgeSeason(admin.token, "2025", "2025", backup.backupToken, false),
    (error) => error.status === 400,
  );
  await store.revise(fixture.id, { reviewNote: "备份后更正" });
  await assert.rejects(
    () => service.purgeSeason(admin.token, "2025", "2025", backup.backupToken, true),
    (error) => error.status === 409,
    "record changes invalidate backup too",
  );
  const expired = await service.backupSeason(admin.token, "2025");
  time += 16 * 60_000;
  await assert.rejects(
    () => service.purgeSeason(admin.token, "2025", "2025", expired.backupToken, true),
    (error) => error.status === 409,
  );
  const fresh = await service.backupSeason(admin.token, "2025");
  assert.equal((await service.purgeSeason(admin.token, "2025", "2025", fresh.backupToken, true)).removed, 2);
  assert.equal(await store.get(fixture.id), null);
  service.changePassword(admin.token, accounts[0].password, "updated-long-admin-password");
  assert.ok(service.requireAccount(admin.token));
  assert.throws(
    () => service.requireAccount(secondSession.token),
    (error) => error.status === 401,
  );

  await store.insert({ ...fixture, season: "2026" });
  await assert.rejects(
    () => service.removeApplication(minister.token, fixture.id, fixture.studentId),
    (error) => error.status === 400,
  );
  await store.revise(fixture.id, { preferredDepartment: "工程项目部" }, { expectedVersion: 0 });
  await assert.rejects(
    () => store.remove(fixture.id, { expectedVersion: 0, confirm: fixture.studentId, allowedDepartment: "数据算法部" }),
    (error) => error.status === 403,
  );
  await assert.rejects(
    () => store.remove(fixture.id, { expectedVersion: 0, confirm: fixture.studentId }),
    (error) => error.status === 409,
  );
  await assert.rejects(
    () => store.remove(fixture.id, { expectedVersion: 1, confirm: "wrong" }),
    (error) => error.status === 400,
  );
  assert.ok(await store.get(fixture.id));
  assert.equal((await service.removeApplication(admin.token, fixture.id, fixture.studentId, 1)).removed, 1);

  await assert.rejects(
    () => service.submit({ ...fixture, photoData: "data:image/jpeg;base64,/9j/2Q==" }, "fake-image"),
    (error) => error.status === 400,
  );
  await assert.rejects(
    () => service.submit({ ...fixture, photoData: photo.slice(0, 70) + "/9k=" }, "damaged-image"),
    (error) => error.status === 400,
  );
  assert.ok((await service.submit(fixture, "real-image")).id);
  for (const value of [
    "2026-99-99T99:99",
    "2026-02-29T12:00",
    "2026-04-31T12:00",
    "2026-10-02T24:00",
    "2026-10-02T12:60",
  ]) {
    assert.equal(logic.validateInterview({ interviewAt: value }).valid, false, value);
  }
  for (const value of ["", "2028-02-29T12:00", "2026-10-02T23:59"])
    assert.equal(logic.validateInterview({ interviewAt: value }).valid, true);
  console.log(
    "PASS backup scope, stale/expired receipts, versioned deletion, session revocation, JPEG decoding and real calendar dates",
  );
}

function accountChecks(directory) {
  const book = createAccountBook(accounts);
  const before = JSON.stringify(book);
  book.persist = () => {
    throw new Error("forced write failure");
  };
  assert.throws(
    () => changeAccountPassword(book, accounts[0].username, accounts[0].password, "new-password-strong"),
    /forced write failure/,
  );
  assert.throws(() => setAccountDisabled(book, accounts[1].username, true), /forced write failure/);
  assert.throws(
    () => addStaffAccount(book, { username: "new-minister", role: "minister", department: "数据算法部" }),
    /forced write failure/,
  );
  assert.equal(JSON.stringify(book), before);
  assert.ok(verifyPassword(book[0], accounts[0].password));
  const file = path.join(directory, "test-staff.json");
  fs.writeFileSync(file, JSON.stringify(createAccountBook(accounts)));
  const previousFile = process.env.STAFF_ACCOUNTS_FILE;
  const previousRename = fs.renameSync;
  process.env.STAFF_ACCOUNTS_FILE = file;
  try {
    const persisted = createAccountBook();
    const diskBefore = fs.readFileSync(file, "utf8");
    const memoryBefore = JSON.stringify(persisted);
    fs.renameSync = () => {
      throw new Error("forced atomic rename failure");
    };
    assert.throws(
      () => changeAccountPassword(persisted, accounts[0].username, accounts[0].password, "new-password-strong"),
      /forced atomic rename failure/,
    );
    assert.equal(fs.readFileSync(file, "utf8"), diskBefore);
    assert.equal(JSON.stringify(persisted), memoryBefore);
    assert.ok(!fs.readdirSync(directory).some((name) => name.startsWith("test-staff.json.") && name.endsWith(".tmp")));
  } finally {
    fs.renameSync = previousRename;
    if (previousFile === undefined) delete process.env.STAFF_ACCOUNTS_FILE;
    else process.env.STAFF_ACCOUNTS_FILE = previousFile;
  }
  console.log("PASS account persistence failures preserve in-memory credentials and account status");
}

async function frontendChecks() {
  const script = fs
    .readFileSync(path.join(__dirname, "../src/App.vue"), "utf8")
    .split("<script setup>")[1]
    .split("</script>")[0]
    .replace(/import[\s\S]*?from "[^"]+";/g, "");
  const detailRequests = new Map();
  const listRequests = [];
  let finishExport;
  let finishAccount;
  const context = {
    ...logic,
    ...vue,
    crypto: require("node:crypto").webcrypto,
    onMounted() {},
    onUnmounted() {},
    watch() {},
    fetchRecruitmentDetail: (id) => new Promise((resolve) => detailRequests.set(id, resolve)),
    fetchRecruitmentList: () => new Promise((resolve) => listRequests.push(resolve)),
    fetchSeasons: async () => ({ seasons: [], season: "2026" }),
    exportRecruitmentList: () =>
      new Promise((resolve) => {
        finishExport = resolve;
      }),
    createStaffAccount: () =>
      new Promise((resolve) => {
        finishAccount = resolve;
      }),
    logoutAccount() {},
    window: {
      location: { hash: "", pathname: "/", search: "" },
      matchMedia: () => ({ matches: false }),
      scrollTo() {},
    },
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(
    script +
      "\nglobalThis.testState = { selected, currentAccount, applications, detailLoading, saving, removing, photoReplacing, adminNotice };",
    context,
  );
  const state = context.testState;
  state.currentAccount.value = { username: "test-staff" };
  const a = context.openApplication({ id: "A", status: "待审核" });
  const b = context.openApplication({ id: "B", status: "待审核" });
  detailRequests.get("B")({ id: "B", status: "待审核" });
  await b;
  detailRequests.get("A")({ id: "A", status: "待审核" });
  await a;
  assert.equal(state.selected.value.id, "B");
  state.saving.value = true;
  await context.openApplication({ id: "C", status: "待审核" });
  assert.equal(state.selected.value.id, "B", "selection stays stable during save");
  state.saving.value = false;
  const oldList = context.loadApplications(1);
  const newList = context.loadApplications(2);
  listRequests[1]({ records: [{ id: "new" }], total: 21, page: 2, counts: {} });
  await newList;
  listRequests[0]({ records: [{ id: "old" }], total: 1, page: 1, counts: {} });
  await oldList;
  assert.equal(state.applications.value[0].id, "new");
  const late = context.openApplication({ id: "late", status: "待审核" });
  context.logout();
  detailRequests.get("late")({ id: "late", status: "待审核" });
  await late;
  assert.equal(state.selected.value, null);
  assert.equal(state.applications.value.length, 0);
  state.currentAccount.value = { username: "previous-admin" };
  const lateExport = context.exportList();
  const lateAccount = context.addStaff();
  context.logout();
  state.currentAccount.value = { username: "next-user" };
  finishExport([{ id: "private-record" }]);
  finishAccount({ account: { name: "private-staff" }, password: "private-onboarding-password" });
  await Promise.all([lateExport, lateAccount]);
  assert.equal(state.adminNotice.value, "", "previous account responses never expose credentials in the next login");
  console.log("PASS actual Vue actions reject out-of-order detail/list responses and responses after logout");
}

async function clientChecks() {
  const source = fs.readFileSync(path.join(__dirname, "../src/recruitmentApi.js"), "utf8") + "\nexport { request };";
  const client = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const previousFetch = global.fetch;
  const previousStorage = global.sessionStorage;
  const tokens = new Map([["zhuoruan_session_token", "test-session-token"]]);
  global.sessionStorage = {
    getItem: (key) => tokens.get(key),
    setItem: (key, value) => tokens.set(key, value),
    removeItem: (key) => tokens.delete(key),
  };
  try {
    global.fetch = async () => {
      throw new Error("temporary network failure");
    };
    await assert.rejects(
      () => client.fetchSession(),
      (error) => error.status === 0,
    );
    assert.equal(client.getSessionToken(), "test-session-token");
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: "expired" }) });
    assert.equal(await client.fetchSession(), null);
    assert.equal(client.getSessionToken(), "");
    global.fetch = (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    await assert.rejects(() => client.request("/fixture-timeout", { timeoutMs: 5 }), /请求超时/);
    const requests = [];
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ record: {}, questions: [] }) };
    };
    await client.lookupRecruitment("202600000001", "13800000001");
    assert.ok(
      requests.every(
        ({ url, options }) =>
          !url.includes("13800000001") && options.method === "POST" && JSON.parse(options.body).phone === "13800000001",
      ),
    );
  } finally {
    global.fetch = previousFetch;
    if (previousStorage === undefined) delete global.sessionStorage;
    else global.sessionStorage = previousStorage;
  }
  console.log("PASS client timeouts, session preservation on network failures and lookup credentials in POST bodies");
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zhuoruan-regression-"));
  try {
    await staticChecks(directory);
    await serviceChecks(directory);
    await submissionChecks(directory);
    await departmentChecks(directory);
    accountChecks(directory);
    await frontendChecks();
    await clientChecks();
    const calls = [];
    await createMysqlPool({
      password: "fixture-password",
      pool: {
        query: async (sql) => {
          calls.push(sql);
          return [[]];
        },
      },
    });
    assert.ok(
      calls.length > 0 && calls.every((sql) => sql.startsWith("SELECT ")),
      "runtime connection never executes migration writes",
    );
    console.log("PASS runtime database connection uses only read-only schema checks");
  } finally {
    const target = path.resolve(directory);
    assert.ok(target.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(target).startsWith("zhuoruan-regression-"));
    fs.rmSync(target, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
