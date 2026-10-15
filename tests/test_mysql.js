const assert = require("assert");
const fs = require("node:fs");
const { createMysqlApplicationStore } = require("../server/mysqlStore.cjs");

async function main() {
  const source = fs.readFileSync(require.resolve("../server/mysqlStore.cjs"), "utf8");
  assert.match(source, /DELETE FROM recruitment_application WHERE season = \?/);
  assert.match(source, /DELETE FROM recruitment_application WHERE id = \?/);
  assert.match(source, /DELETE FROM recruitment_application_history WHERE applicant_id = \?/);
  assert.ok(
    !/DELETE\s+FROM\s+recruitment_application\s*;/i.test(source),
    "MySQL store must not unqualified-delete records",
  );
  assert.ok(source.includes("FOR UPDATE"), "revise must lock the row");
  assert.ok(
    source.includes("photo_data IS NOT NULL AND photo_data <> ''"),
    "exports must compute hasPhoto without selecting photo payload",
  );
  assert.ok(source.includes("class_name") && source.includes("preferred_department"), "search must include UI fields");

  const lookupCalls = [];
  const lookupStore = createMysqlApplicationStore({
    query: async (sql, params) => {
      lookupCalls.push({ sql, params });
      return [[], []];
    },
  });
  assert.strictEqual(await lookupStore.lookup("student-1", "WRONGCODE"), null);
  assert.match(lookupCalls[0].sql, /phone = \?/);
  assert.deepStrictEqual(lookupCalls[0].params, ["student-1", "student-1", "WRONGCODE"]);

  const conflictCalls = [];
  const conflictConnection = {
    async beginTransaction() {
      conflictCalls.push("begin");
    },
    async rollback() {
      conflictCalls.push("rollback");
    },
    async commit() {},
    release() {
      conflictCalls.push("release");
    },
    async query(sql) {
      if (/FOR UPDATE/.test(sql))
        return [
          [
            {
              id: "a",
              version: 4,
              preferred_department: "D",
              student_id: "s",
              phone: "p",
              qq: "q",
              created_at: "2024-01-01",
            },
          ],
        ];
      return [[]];
    },
  };
  await assert.rejects(
    () =>
      createMysqlApplicationStore({ getConnection: async () => conflictConnection }).revise(
        "a",
        { status: "通过" },
        { expectedVersion: 3 },
      ),
    (error) => error.status === 409 && error.statusCode === 409,
  );
  assert.ok(
    conflictCalls.includes("rollback") && conflictCalls.includes("release"),
    "conflicts must rollback and release",
  );

  let insertQueries = [];
  const duplicatePool = {
    query: async (...args) => {
      insertQueries.push(args[0]);
      const error = new Error("duplicate");
      error.code = "ER_DUP_ENTRY";
      throw error;
    },
  };
  const duplicateStore = createMysqlApplicationStore(duplicatePool);
  await assert.rejects(
    () => duplicateStore.insert({ studentId: "same" }),
    (error) => error.statusCode === 409 && error.code === "DUPLICATE",
  );
  assert.strictEqual(insertQueries.length, 1);

  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push("begin");
    },
    async commit() {
      calls.push("commit");
    },
    async rollback() {
      calls.push("rollback");
    },
    release() {
      calls.push("release");
    },
    async query(sql) {
      calls.push(sql);
      if (/SELECT .*FROM recruitment_application WHERE id = \? FOR UPDATE/.test(sql))
        return [
          [
            {
              id: "a",
              name: "A",
              version: 0,
              preferredDepartment: "D",
              preferred_department: "D",
              studentId: "s",
              student_id: "s",
              phone: "p",
              qq: "q",
              createdAt: "2024-01-01",
              created_at: "2024-01-01",
            },
          ],
        ];
      if (/recruitment_application_history/.test(sql)) return [[]];
      if (/SELECT id FROM recruitment_application/.test(sql)) return [[]];
      if (/^UPDATE recruitment_application/.test(sql)) throw new Error("forced update failure");
      return [[]];
    },
  };
  const pool = { getConnection: async () => connection };
  const store = createMysqlApplicationStore(pool);
  await assert.rejects(
    () =>
      store.revise(
        "a",
        { status: "通过" },
        { expectedVersion: 0, actor: { username: "u", name: "U" }, action: "review" },
      ),
    /forced update failure/,
  );
  assert.ok(calls.includes("rollback"), "failed revise must rollback");
  assert.ok(calls.includes("release"), "failed revise must release connection");
  assert.ok(!calls.some((sql) => typeof sql === "string" && /DELETE FROM/i.test(sql)), "revise must not delete rows");

  let historyJson = "";
  const photoConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params) {
      if (/FOR UPDATE/.test(sql)) {
        return [
          [
            {
              id: "a",
              version: 0,
              photoData: "old-photo",
              photo_data: "old-photo",
              preferredDepartment: "D",
              preferred_department: "D",
              student_id: "s",
              phone: "p",
              qq: "q",
              created_at: "2024-01-01",
            },
          ],
        ];
      }
      if (/INSERT INTO recruitment_application_history/.test(sql)) {
        historyJson = params[6];
        return [{ affectedRows: 1 }];
      }
      if (/FROM recruitment_application_history/.test(sql)) return [[]];
      if (/^UPDATE recruitment_application/.test(sql)) return [{ affectedRows: 1 }];
      if (/FROM recruitment_application WHERE id = \?/.test(sql)) {
        return [
          [{ id: "a", version: 1, photo_data: "new-photo", preferred_department: "D", created_at: "2024-01-01" }],
        ];
      }
      return [[]];
    },
  };
  await createMysqlApplicationStore({ getConnection: async () => photoConnection }).revise(
    "a",
    { photoData: "data:image/jpeg;base64,NEWPHOTO" },
    { expectedVersion: 0, action: "photo", actor: { username: "u", name: "U" } },
  );
  assert.ok(String(historyJson).includes("已更换"), "photo history must not keep image bytes");
  assert.ok(!String(historyJson).includes("NEWPHOTO"));
  console.log("PASS MySQL storage contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
