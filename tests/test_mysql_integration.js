const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mysql = require("mysql2/promise");
const { loadLocalEnv } = require("../server/env.cjs");
const { createMysqlPool, createMysqlApplicationStore } = require("../server/mysqlStore.cjs");
const jpeg = require("jpeg-js");
const { createRecruitmentService } = require("../server/api.cjs");
const { loadRecruitmentConfig } = require("../server/config.cjs");
const { backupDigest } = require("../server/seasonBackup.cjs");

// Explicit opt-in command. Always create our own random database; never write to MYSQL_DATABASE.
async function main() {
  loadLocalEnv();
  const database = `zhuoruan_test_${randomBytes(10).toString("hex")}`;
  assert.match(database, /^zhuoruan_test_[a-f0-9]{20}$/);
  assert.notEqual(database, process.env.MYSQL_DATABASE || "zhuoruan_recruitment");
  const connectionOptions = {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD,
  };
  if (!connectionOptions.password) throw new Error("MySQL 集成测试需要本机 .env 数据库口令");
  const admin = await mysql.createConnection(connectionOptions);
  let pool;
  try {
    pool = await createMysqlPool({ ...connectionOptions, database, migrate: true });
    const store = createMysqlApplicationStore(pool);
    const record = {
      id: "test-1",
      studentId: "202600000001",
      phone: "13800000001",
      qq: "100000001",
      name: "测试甲",
      preferredDepartment: "数据算法部",
      acceptAdjustment: "是",
      photoData: "test-photo",
      strengths: "test-only",
      status: "待审核",
      createdAt: "2026-10-01T00:00:00.000Z",
    };
    await store.insert(record);
    await store.insert({
      ...record,
      id: "test-2",
      studentId: "202600000002",
      phone: "13800000002",
      qq: "100000002",
      name: "测试乙",
      createdAt: "2026-10-02T00:00:00.000Z",
    });
    const firstPage = await store.list({ page: 1, pageSize: 1 });
    assert.equal(firstPage.total, 2);
    assert.equal(firstPage.records[0].id, "test-2");
    assert.equal(firstPage.records[0].photoData, undefined);
    assert.equal((await store.list({ keyword: "test-1" })).total, 1);
    assert.equal((await store.list({ keyword: "%" })).total, 0, "LIKE wildcard must be literal");
    const saved = await store.get("test-1");
    assert.equal(await store.lookup("test-1", "WRONGCODE"), null);
    assert.equal((await store.lookup("test-1", saved.phone)).id, "test-1");
    const duplicateResults = await Promise.allSettled(
      [1, 2].map((suffix) =>
        store.insert({
          ...record,
          id: `concurrent-${suffix}`,
          studentId: "202600000003",
          phone: `1390000000${suffix}`,
          qq: `20000000${suffix}`,
        }),
      ),
    );
    assert.equal(duplicateResults.filter((result) => result.status === "fulfilled").length, 1);
    const context = {
      actor: { username: "test-admin", name: "测试管理员" },
      expectedVersion: 0,
      action: "review",
      allowedDepartment: "数据算法部",
    };
    const changes = await Promise.allSettled([
      store.revise("test-1", { status: "通过" }, context),
      store.revise("test-1", { status: "未通过" }, context),
    ]);
    assert.equal(changes.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(changes.find((result) => result.status === "rejected").reason.status, 409);
    const after = await store.get("test-1");
    assert.equal(after.version, 1);
    assert.equal(after.reviewHistory.length, 1);
    await assert.rejects(
      () => store.revise("test-1", { phone: "13800000002" }, { ...context, expectedVersion: 1, action: "correct" }),
      (error) => error.status === 409,
    );
    assert.equal((await store.get("test-1")).version, 1, "rollback must preserve version/history");
    await assert.rejects(
      () =>
        store.revise("test-1", { status: "通过" }, { ...context, expectedVersion: 1, allowedDepartment: "工程项目部" }),
      (error) => error.status === 403,
    );
    const moved = await store.revise(
      "test-1",
      { preferredDepartment: "工程项目部" },
      { ...context, expectedVersion: 1, action: "transfer" },
    );
    assert.equal(moved.originalDepartment, "数据算法部");
    assert.equal(moved.reviewHistory.length, 2);
    const exported = await store.list({ includeDetails: true });
    assert.equal(exported.records[0].photoData, undefined);
    assert.equal(exported.records[0].reviewHistory, undefined);
    assert.equal(exported.records[0].hasPhoto, true);
    const guarded = await store.insert({ ...record, id: "guarded-record", season: "2024" });
    await store.revise(guarded.id, { preferredDepartment: "工程项目部" }, { expectedVersion: 0, actor: context.actor });
    await assert.rejects(
      () =>
        store.remove(guarded.id, { expectedVersion: 0, confirm: guarded.studentId, allowedDepartment: "数据算法部" }),
      (error) => error.status === 403,
    );
    await assert.rejects(
      () => store.remove(guarded.id, { expectedVersion: 0, confirm: guarded.studentId }),
      (error) => error.status === 409,
    );
    assert.ok(await store.get(guarded.id), "rejected deletes preserve the record and audit");
    const backup = await store.backupSeason("2024");
    assert.equal(backup.length, 1);
    assert.equal(backup[0].photoData, record.photoData);
    assert.equal(backup[0].reviewHistory.length, 1);
    await store.revise(guarded.id, { reviewNote: "备份后更正" });
    await assert.rejects(
      () => store.purgeSeason("2024", backupDigest(backup)),
      (error) => error.status === 409,
    );
    assert.ok(await store.get(guarded.id), "stale backup must rollback before any deletion");
    const freshBackup = await store.backupSeason("2024");
    assert.equal((await store.purgeSeason("2024", backupDigest(freshBackup))).removed, 1);
    assert.equal(await store.get(guarded.id), null);
    const [[historyCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM recruitment_application_history WHERE applicant_id = ?",
      [guarded.id],
    );
    assert.equal(historyCount.total, 0);
    await Promise.all(
      Array.from({ length: 53 }, (_, index) =>
        store.insert({
          ...record,
          id: `backup-batch-${String(index).padStart(3, "0")}`,
          season: "2023",
          studentId: String(202300000000 + index),
          phone: String(13700000000 + index),
          qq: String(300000000 + index),
        }),
      ),
    );
    const pagedBackup = await store.backupSeason("2023");
    assert.equal(pagedBackup.length, 53, "complete backup includes every cursor page");
    assert.equal(new Set(pagedBackup.map((item) => item.id)).size, 53);
    assert.equal((await store.purgeSeason("2023", backupDigest(pagedBackup))).removed, 53);
    const [historyPlan] = await pool.query(
      "EXPLAIN SELECT history_id FROM recruitment_application_history WHERE applicant_id = ? ORDER BY created_at, history_id",
      ["test-1"],
    );
    assert.ok(String(historyPlan[0].possible_keys).includes("idx_history_applicant_time"));
    const runtimePool = await createMysqlPool({ ...connectionOptions, database });
    try {
      assert.equal(
        (await createMysqlApplicationStore(runtimePool).get("test-1")).season,
        "",
        "runtime startup never backfills seasons",
      );
    } finally {
      await runtimePool.end();
    }
    console.log(
      "PASS real MySQL: delete permission/version guards, full backup, stale-backup rollback, atomic purge and read-only startup",
    );
    console.log(
      "PASS real MySQL: pagination, literal keyword search, unique races, row locking, rollback, permission, history and photo-free export",
    );

    const retryInput = {
      ...record,
      name: "回执恢复测试",
      gender: "男",
      birthDate: "2005-03",
      ethnicity: "汉族",
      politicalStatus: "群众",
      college: "人工智能与软件学院",
      departmentMajor: "软件工程",
      className: "测试班",
      careerPlan: "学习编程",
      availableTime: "周六",
      studentId: "202677777777",
      phone: "13977777777",
      qq: "977777777",
      photoData:
        "data:image/jpeg;base64," +
        jpeg.encode({ width: 1, height: 1, data: Buffer.alloc(4, 255) }).data.toString("base64"),
      photoName: "test.jpg",
      submissionKey: "c".repeat(64),
    };
    const retryAccounts = [{ username: "retry-admin", password: "synthetic-long-password", role: "president" }];
    const retryConfig = loadRecruitmentConfig({});
    const firstService = createRecruitmentService({ store, accounts: retryAccounts, config: retryConfig });
    const secondService = createRecruitmentService({ store, accounts: retryAccounts, config: retryConfig });
    const retried = await Promise.all([
      firstService.submit(retryInput, "campus"),
      secondService.submit(retryInput, "campus"),
    ]);
    assert.equal(retried[0].id, retried[1].id);
    assert.equal(retried[0].phone, retried[1].phone);
    const [[retryCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM recruitment_application WHERE student_id = ?",
      [retryInput.studentId],
    );
    assert.equal(retryCount.total, 1);
    const restartedService = createRecruitmentService({
      store: createMysqlApplicationStore(pool),
      accounts: retryAccounts,
      config: { ...retryConfig, enabled: false },
    });
    assert.equal((await restartedService.submit(retryInput, "campus")).phone, retried[0].phone);
    await assert.rejects(
      () => firstService.submit({ ...retryInput, submissionKey: "d".repeat(64) }, "other-ip"),
      (error) => error.status === 409,
    );
    console.log("PASS real MySQL: concurrent submission retries and receipt recovery after service restart");

    // Exercise upgrades from existing tables, then duplicate detection, only inside our isolated DB.
    await pool.query("ALTER TABLE recruitment_application DROP COLUMN version, DROP COLUMN original_department");
    const upgraded = await createMysqlPool({ ...connectionOptions, database, migrate: true });
    try {
      const restored = await createMysqlApplicationStore(upgraded).get("test-2");
      assert.equal(restored.version, 0);
      assert.equal(restored.originalDepartment, "数据算法部");
      const [[before]] = await upgraded.query("SELECT COUNT(*) AS total FROM recruitment_application");
      await upgraded.query("ALTER TABLE recruitment_application DROP INDEX uq_recruitment_season_student_id");
      await upgraded.query("UPDATE recruitment_application SET student_id = ? WHERE id = ?", [
        "202600000001",
        "test-2",
      ]);
      await assert.rejects(() => createMysqlPool({ ...connectionOptions, database, migrate: true }), /重复|duplicate/i);
      const [[remaining]] = await upgraded.query("SELECT COUNT(*) AS total FROM recruitment_application");
      assert.equal(remaining.total, before.total);
      console.log(
        "PASS real MySQL migration: existing records retained, missing columns restored, duplicate rows refuse unique migration without deletion",
      );
    } finally {
      await upgraded.end();
    }
  } finally {
    if (pool) await pool.end();
    // Verify the exact randomly allocated target before deleting only this test database.
    assert.match(database, /^zhuoruan_test_[a-f0-9]{20}$/);
    assert.notEqual(database, process.env.MYSQL_DATABASE || "zhuoruan_recruitment");
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(
    error.code === "ERR_ASSERTION"
      ? error.stack
      : error.code
        ? `MySQL integration failed: ${error.code}`
        : error.message,
  );
  process.exitCode = 1;
});
