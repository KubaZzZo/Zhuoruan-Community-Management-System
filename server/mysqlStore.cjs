const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const { assertBackup, assertDeletion } = require("./seasonBackup.cjs");

const FIELDS = [
  ["id", "id"],
  ["name", "name"],
  ["gender", "gender"],
  ["birthDate", "birth_date"],
  ["ethnicity", "ethnicity"],
  ["politicalStatus", "political_status"],
  ["college", "college"],
  ["departmentMajor", "department_major"],
  ["className", "class_name"],
  ["studentId", "student_id"],
  ["phone", "phone"],
  ["qq", "qq"],
  ["preferredDepartment", "preferred_department"],
  ["acceptAdjustment", "accept_adjustment"],
  ["strengths", "strengths"],
  ["awards", "awards"],
  ["experience", "experience"],
  ["careerPlan", "career_plan"],
  ["photoName", "photo_name"],
  ["photoData", "photo_data"],
  ["availableTime", "available_time"],
  ["interviewAt", "interview_at"],
  ["interviewLocation", "interview_location"],
  ["interviewer", "interviewer"],
  ["interviewSummary", "interview_summary"],
  ["queryCode", "query_code"],
  ["season", "season"],
  ["reviewNote", "review_note"],
  ["status", "status"],
  ["createdAt", "created_at"],
  ["version", "version"],
  ["originalDepartment", "original_department"],
  ["quizQuestionIds", "quiz_question_ids"],
  ["quizAnswers", "quiz_answers"],
  ["quizCorrectCount", "quiz_correct_count"],
];
const FIELD_MAP = new Map(FIELDS);
const SUMMARY_FIELDS = FIELDS.filter(
  ([key]) =>
    ![
      "photoData",
      "queryCode",
      "strengths",
      "awards",
      "experience",
      "careerPlan",
      "reviewNote",
      "interviewSummary",
      "quizQuestionIds",
      "quizAnswers",
    ].includes(key),
);
const EDITABLE = new Set([
  "status",
  "reviewNote",
  "name",
  "birthDate",
  "gender",
  "ethnicity",
  "politicalStatus",
  "studentId",
  "phone",
  "qq",
  "college",
  "departmentMajor",
  "className",
  "preferredDepartment",
  "acceptAdjustment",
  "strengths",
  "awards",
  "experience",
  "careerPlan",
  "availableTime",
  "interviewAt",
  "interviewLocation",
  "interviewer",
  "interviewSummary",
  "photoName",
  "photoData",
]);

function errorWithStatus(message, statusCode, code) {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
function duplicateError(field) {
  const labels = { studentId: "学号", phone: "手机号", qq: "QQ", student_id: "学号" };
  return errorWithStatus(`本季已有相同${labels[field] || field}的报名`, 409, "DUPLICATE");
}

function aliasColumns(entries) {
  return entries.map(([key, column]) => `${column} AS \`${key}\``).join(", ");
}
function id() {
  return crypto.randomUUID().replaceAll("-", "");
}
function assertIdentifier(value, label) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`${label} 只能包含字母、数字和下划线`);
}
function translateError(error) {
  if (error && error.code === "ER_DUP_ENTRY") {
    const text = String(error.message || "");
    const field = text.includes("student_id")
      ? "studentId"
      : text.includes("phone")
        ? "phone"
        : text.includes("qq")
          ? "qq"
          : text.includes("query_code")
            ? "queryCode"
            : "record";
    return field === "record"
      ? errorWithStatus("记录已存在，请检查学号、手机号或QQ", 409, "DUPLICATE")
      : duplicateError(field);
  }
  return error;
}
function mapRow(row) {
  const result = {};
  for (const [key] of FIELDS) {
    const value = row[key] ?? row[key.toLowerCase()];
    result[key] =
      key === "version"
        ? Number(value || 0)
        : value instanceof Date
          ? value.toISOString()
          : value == null
            ? ""
            : String(value);
  }
  result.reviewHistory = Array.isArray(row.reviewHistory) ? row.reviewHistory : [];
  return result;
}
function summary(record) {
  const output = {};
  for (const [key] of SUMMARY_FIELDS) output[key] = record[key];
  return output;
}
function like(value) {
  return `%${String(value).replace(/[\\%_]/g, "\\$&")}%`;
}

function createMysqlApplicationStore(pool) {
  const columns = aliasColumns(FIELDS);
  const summaryColumns = aliasColumns(
    SUMMARY_FIELDS.filter(
      ([key]) => !["photoData", "strengths", "awards", "experience", "careerPlan", "reviewNote"].includes(key),
    ),
  );
  const exportColumns = aliasColumns(
    FIELDS.filter(([key]) => !["photoData", "quizQuestionIds", "quizAnswers"].includes(key)),
  );
  async function fetchHistory(connection, applicantId) {
    const [rows] = await connection.query(
      "SELECT history_id, actor, actor_name, action, created_at, changes_json FROM recruitment_application_history WHERE applicant_id = ? ORDER BY created_at ASC, history_id ASC",
      [applicantId],
    );
    return rows.map((row) => ({
      id: row.history_id,
      actor: row.actor || "",
      actorName: row.actor_name || "",
      action: row.action || "",
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      changes: typeof row.changes_json === "string" ? JSON.parse(row.changes_json) : row.changes_json || [],
    }));
  }
  async function queryOne(connection, applicantId, withHistory = false, lock = false) {
    const [rows] = await connection.query(
      `SELECT ${columns} FROM recruitment_application WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
      [applicantId],
    );
    if (!rows.length) return null;
    const record = mapRow(rows[0]);
    if (withHistory) record.reviewHistory = await fetchHistory(connection, applicantId);
    return record;
  }
  async function insert(input) {
    const record = {
      ...input,
      id: input.id || id(),
      createdAt: input.createdAt || new Date().toISOString(),
      version: 0,
      originalDepartment: input.originalDepartment || input.preferredDepartment,
      queryCode:
        input.queryCode ||
        crypto
          .createHash("sha256")
          .update(input.id || id())
          .digest("hex")
          .slice(0, 16),
      season: input.season || "",
    };
    const fields = FIELDS.map(([key]) => key);
    const sqlColumns = FIELDS.map(([, column]) => column).join(", ");
    try {
      await pool.query(
        `INSERT INTO recruitment_application (${sqlColumns}) VALUES (${fields.map(() => "?").join(",")})`,
        [...fields.map((field) => record[field] ?? "")],
      );
      return record;
    } catch (error) {
      throw translateError(error);
    }
  }
  async function list({
    department = "",
    status = "",
    keyword = "",
    season = "",
    includeUnassigned = false,
    page = 1,
    pageSize = 20,
    includeDetails = false,
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const baseConditions = [];
    const baseParams = [];
    const conditions = [];
    const params = [];
    if (season) {
      baseConditions.push(includeUnassigned ? "(season = ? OR season = '')" : "season = ?");
      baseParams.push(season);
    }
    if (department) {
      baseConditions.push("preferred_department = ?");
      baseParams.push(department);
    }
    if (keyword) {
      const clause = [
        "id",
        "name",
        "student_id",
        "phone",
        "qq",
        "college",
        "department_major",
        "class_name",
        "preferred_department",
      ]
        .map((field) => `${field} LIKE ? ESCAPE '\\\\'`)
        .join(" OR ");
      baseConditions.push(`(${clause})`);
      for (let i = 0; i < 9; i += 1) baseParams.push(like(keyword));
    }
    conditions.push(...baseConditions);
    params.push(...baseParams);
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const baseWhere = baseConditions.length ? ` WHERE ${baseConditions.join(" AND ")}` : "";
    const order = "ORDER BY created_at DESC, id ASC";
    const projection = includeDetails
      ? `${exportColumns}, (photo_data IS NOT NULL AND photo_data <> '') AS hasPhoto`
      : summaryColumns;
    const [rows] = await pool.query(
      `SELECT ${projection} FROM recruitment_application${where} ${order} LIMIT ? OFFSET ?`,
      [...params, safeSize, (safePage - 1) * safeSize],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM recruitment_application${where}`, params);
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM recruitment_application${baseWhere} GROUP BY status`,
      baseParams,
    );
    return {
      records: rows.map((row) => {
        const record = mapRow(row);
        if (includeDetails) {
          delete record.photoData;
          delete record.reviewHistory;
          record.hasPhoto = Boolean(row.hasPhoto);
        }
        return includeDetails ? record : summary(record);
      }),
      total: Number(countRows[0]?.total || 0),
      page: safePage,
      pageSize: safeSize,
      counts: Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count)])),
    };
  }
  async function get(applicantId) {
    const connection = await pool.getConnection();
    try {
      return await queryOne(connection, applicantId, true);
    } finally {
      connection.release();
    }
  }
  async function lookup(studentId, phone, season = "") {
    const [rows] = await pool.query(
      `SELECT ${columns} FROM recruitment_application WHERE (student_id = ? OR id = ?) AND phone = ?${season ? " AND season = ?" : ""} LIMIT 1`,
      [studentId, studentId, phone, ...(season ? [season] : [])],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }
  async function seasons() {
    const [rows] = await pool.query(
      "SELECT season, COUNT(*) AS total FROM recruitment_application GROUP BY season ORDER BY season DESC",
    );
    return rows.map((row) => ({ season: row.season || "", total: Number(row.total || 0) }));
  }
  async function seasonSnapshot(connection, season) {
    const records = [];
    let cursor;
    let size = 2;
    while (true) {
      const [rows] = await connection.query(
        `SELECT ${columns} FROM recruitment_application WHERE season = ?${cursor === undefined ? "" : " AND id > ?"} ORDER BY id LIMIT 50 FOR UPDATE`,
        cursor === undefined ? [season] : [season, cursor],
      );
      for (const row of rows) {
        const record = mapRow(row);
        record.reviewHistory = await fetchHistory(connection, record.id);
        size += Buffer.byteLength(JSON.stringify(record)) + 1;
        if (size > 64 * 1024 * 1024 - 2048) {
          throw errorWithStatus("备份超过 64MB，请联系服务器管理员使用数据库备份流程。", 400, "BACKUP_TOO_LARGE");
        }
        records.push(record);
      }
      if (rows.length < 50) break;
      cursor = records[records.length - 1].id;
    }
    return records;
  }
  async function backupSeason(season) {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      await connection.beginTransaction();
      const records = await seasonSnapshot(connection, season);
      await connection.commit();
      return records;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async function purgeSeason(season, digest) {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      await connection.beginTransaction();
      assertBackup(await seasonSnapshot(connection, season), digest);
      await connection.query(
        "DELETE h FROM recruitment_application_history h INNER JOIN recruitment_application a ON a.id = h.applicant_id WHERE a.season = ?",
        [season],
      );
      const [result] = await connection.query("DELETE FROM recruitment_application WHERE season = ?", [season]);
      await connection.commit();
      return { season, removed: Number(result.affectedRows || 0) };
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        void rollbackError;
      }
      throw error;
    } finally {
      connection.release();
    }
  }
  async function remove(applicantId, context = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const current = await queryOne(connection, applicantId, false, true);
      if (!current) {
        await connection.rollback();
        return null;
      }
      assertDeletion(current, context);
      await connection.query("DELETE FROM recruitment_application_history WHERE applicant_id = ?", [applicantId]);
      const [result] = await connection.query("DELETE FROM recruitment_application WHERE id = ?", [applicantId]);
      await connection.commit();
      return { id: applicantId, removed: Number(result.affectedRows || 0) };
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        void rollbackError;
      }
      throw error;
    } finally {
      connection.release();
    }
  }
  async function revise(applicantId, changes, context = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const current = await queryOne(connection, applicantId, true, true);
      if (!current) {
        await connection.rollback();
        return null;
      }
      if (context.allowedDepartment && current.preferredDepartment !== context.allowedDepartment)
        throw errorWithStatus("department permission denied", 403, "FORBIDDEN");
      if (context.expectedVersion !== undefined && Number(context.expectedVersion) !== current.version)
        throw errorWithStatus("record version conflict", 409, "CONFLICT");
      const updates = Object.entries(changes || {}).filter(([field]) => EDITABLE.has(field));
      const changed = updates.filter(([field, after]) => String(current[field] ?? "") !== String(after ?? ""));
      if (!changed.length) {
        await connection.commit();
        return current;
      }
      for (const field of ["studentId", "phone", "qq"]) {
        const update = changed.find(([name]) => name === field);
        if (update) {
          const [collision] = await connection.query(
            `SELECT id FROM recruitment_application WHERE ${FIELD_MAP.get(field)} = ? AND season = ? AND id <> ? LIMIT 1`,
            [update[1], current.season || "", applicantId],
          );
          if (collision.length) throw duplicateError(field);
        }
      }
      const sets = changed.map(([field]) => `${FIELD_MAP.get(field)} = ?`);
      const values = changed.map(([, value]) => (value == null ? "" : value));
      sets.push("version = version + 1");
      await connection.query(`UPDATE recruitment_application SET ${sets.join(", ")} WHERE id = ?`, [
        ...values,
        applicantId,
      ]);
      const actor = context.actor || {};
      const history = changed.map(([field, after]) =>
        field === "photoData"
          ? { field, before: "原证件照", after: "已更换" }
          : { field, before: current[field], after: after == null ? "" : after },
      );
      await connection.query(
        "INSERT INTO recruitment_application_history (history_id, applicant_id, actor, actor_name, action, created_at, changes_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          id(),
          applicantId,
          actor.username || "",
          actor.name || "",
          context.action || "correct",
          new Date(),
          JSON.stringify(history),
        ],
      );
      await connection.commit();
      return await queryOne(connection, applicantId, true);
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        void rollbackError;
      }
      throw translateError(error);
    } finally {
      connection.release();
    }
  }
  async function read() {
    const result = await list({ page: 1, pageSize: 100 });
    return result.records;
  }
  return { insert, list, get, lookup, revise, read, seasons, backupSeason, purgeSeason, remove };
}

async function createMysqlPool(options = {}) {
  const host = options.host || process.env.MYSQL_HOST || "127.0.0.1";
  const port = Number(options.port || process.env.MYSQL_PORT || 3306);
  const user = options.user || process.env.MYSQL_USER || "root";
  const password = options.password ?? process.env.MYSQL_PASSWORD;
  const database = options.database || process.env.MYSQL_DATABASE || "zhuoruan_recruitment";
  if (!password) throw new Error("缺少 MYSQL_PASSWORD。请在项目根目录的 .env 里填写本地 MySQL 口令。");
  assertIdentifier(database, "MYSQL_DATABASE");
  if (options.migrate === true) {
    const admin = await mysql.createConnection({ host, port, user, password });
    try {
      await admin.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await admin.end();
    }
  }
  const pool =
    options.pool ||
    mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  try {
    if (options.migrate !== true) {
      await pool.query(`SELECT ${FIELDS.map(([, column]) => column).join(", ")} FROM recruitment_application LIMIT 0`);
      await pool.query(
        "SELECT history_id, applicant_id, actor, actor_name, action, created_at, changes_json FROM recruitment_application_history LIMIT 0",
      );
      return pool;
    }
    await pool.query(
      `CREATE TABLE IF NOT EXISTS recruitment_application (id VARCHAR(64) NOT NULL PRIMARY KEY, name VARCHAR(64) NOT NULL, gender VARCHAR(16) NOT NULL, birth_date VARCHAR(16) NOT NULL, ethnicity VARCHAR(32) NOT NULL, political_status VARCHAR(32) NOT NULL, college VARCHAR(128) NOT NULL, department_major VARCHAR(128) NOT NULL, class_name VARCHAR(128) NOT NULL, student_id VARCHAR(64) NOT NULL, phone VARCHAR(32) NOT NULL, qq VARCHAR(32) NOT NULL, preferred_department VARCHAR(64) NOT NULL, accept_adjustment VARCHAR(8) NOT NULL, strengths TEXT NOT NULL, awards TEXT NOT NULL, experience TEXT NOT NULL, career_plan TEXT NOT NULL, photo_name VARCHAR(120) NOT NULL, photo_data MEDIUMTEXT NOT NULL, review_note TEXT NOT NULL, status VARCHAR(16) NOT NULL, created_at VARCHAR(40) NOT NULL, version INT NOT NULL DEFAULT 0, original_department VARCHAR(64) NOT NULL DEFAULT '' ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    const definitions = {
      id: "VARCHAR(64) NOT NULL",
      student_id: "VARCHAR(64) NOT NULL DEFAULT ''",
      phone: "VARCHAR(32) NOT NULL DEFAULT ''",
      qq: "VARCHAR(32) NOT NULL DEFAULT ''",
      review_note: "TEXT NULL",
      photo_data: "MEDIUMTEXT NULL",
      version: "INT NOT NULL DEFAULT 0",
      original_department: "VARCHAR(64) NOT NULL DEFAULT ''",
      season: "VARCHAR(32) NOT NULL DEFAULT ''",
      query_code: "VARCHAR(16) NOT NULL DEFAULT ''",
      available_time: "VARCHAR(200) NOT NULL DEFAULT ''",
      interview_at: "VARCHAR(40) NOT NULL DEFAULT ''",
      interview_location: "VARCHAR(80) NOT NULL DEFAULT ''",
      interviewer: "VARCHAR(64) NOT NULL DEFAULT ''",
      interview_summary: "VARCHAR(500) NOT NULL DEFAULT ''",
      quiz_question_ids: "TEXT NULL",
      quiz_answers: "TEXT NULL",
      quiz_correct_count: "VARCHAR(8) NOT NULL DEFAULT ''",
    };
    for (const [column, definition] of Object.entries(definitions)) {
      const [found] = await pool.query("SHOW COLUMNS FROM recruitment_application LIKE ?", [column]);
      if (!found.length) await pool.query(`ALTER TABLE recruitment_application ADD COLUMN ${column} ${definition}`);
    }
    const [idColumns] = await pool.query("SHOW COLUMNS FROM recruitment_application LIKE 'id'");
    const idWidth = /varchar\((\d+)\)/i.exec(String(idColumns[0]?.Type || idColumns[0]?.type || ""));
    if (!idWidth || Number(idWidth[1]) < 64)
      await pool.query("ALTER TABLE recruitment_application MODIFY COLUMN id VARCHAR(64) NOT NULL");
    const activeSeason = process.env.RECRUITMENT_SEASON || "2026";
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(activeSeason)) throw new Error("RECRUITMENT_SEASON 格式不正确");
    await pool.query("UPDATE recruitment_application SET season = ? WHERE season = '' OR season IS NULL", [
      activeSeason,
    ]);
    const [missingCodes] = await pool.query(
      "SELECT id FROM recruitment_application WHERE query_code = '' OR query_code IS NULL",
    );
    for (const row of missingCodes) {
      await pool.query("UPDATE recruitment_application SET query_code = ? WHERE id = ? AND query_code = ''", [
        crypto.createHash("sha256").update(row.id).digest("hex").slice(0, 16),
        row.id,
      ]);
    }
    for (const field of ["student_id", "phone", "qq"]) {
      const [duplicates] = await pool.query(
        `SELECT season, ${field} FROM recruitment_application GROUP BY season, ${field} HAVING COUNT(*) > 1`,
      );
      if (duplicates.length)
        throw new Error(
          `Cannot create unique ${field} index: existing duplicate values detected; resolve duplicates manually without deleting records.`,
        );
    }
    const [indexes] = await pool.query("SHOW INDEX FROM recruitment_application");
    for (const field of ["student_id", "phone", "qq"]) {
      const singleNames = new Set(
        indexes
          .filter(
            (index) =>
              index.Column_name === field &&
              Number(index.Non_unique) === 0 &&
              index.Key_name !== "PRIMARY" &&
              indexes.filter((other) => other.Key_name === index.Key_name).length === 1,
          )
          .map((index) => index.Key_name),
      );
      for (const name of singleNames) {
        if (/^[A-Za-z0-9_]+$/.test(name))
          await pool.query(`ALTER TABLE recruitment_application DROP INDEX \`${name}\``);
      }
      const composite = `uq_recruitment_season_${field}`;
      const [currentIndexes] = await pool.query("SHOW INDEX FROM recruitment_application");
      if (!currentIndexes.some((index) => index.Key_name === composite)) {
        await pool.query(`ALTER TABLE recruitment_application ADD UNIQUE KEY ${composite} (season, ${field})`);
      }
    }
    const [codeIndexes] = await pool.query("SHOW INDEX FROM recruitment_application");
    if (!codeIndexes.some((index) => index.Key_name === "uq_recruitment_query_code")) {
      const [codeDuplicates] = await pool.query(
        "SELECT query_code FROM recruitment_application GROUP BY query_code HAVING COUNT(*) > 1",
      );
      if (codeDuplicates.length)
        throw new Error(
          "Cannot create unique query_code index: existing duplicate values detected; resolve duplicates manually without deleting records.",
        );
      await pool.query("ALTER TABLE recruitment_application ADD UNIQUE KEY uq_recruitment_query_code (query_code)");
    }
    await pool.query(
      "UPDATE recruitment_application SET original_department = preferred_department WHERE original_department = '' OR original_department IS NULL",
    );
    await pool.query("UPDATE recruitment_application SET version = 0 WHERE version IS NULL");
    await pool.query(
      `CREATE TABLE IF NOT EXISTS recruitment_application_history (history_id VARCHAR(64) NOT NULL PRIMARY KEY, applicant_id VARCHAR(64) NOT NULL, actor VARCHAR(128) NOT NULL, actor_name VARCHAR(128) NOT NULL, action VARCHAR(32) NOT NULL, created_at DATETIME(6) NOT NULL, changes_json JSON NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    const [historyIndexes] = await pool.query("SHOW INDEX FROM recruitment_application_history");
    if (!historyIndexes.some((index) => index.Key_name === "idx_history_applicant_time")) {
      await pool.query(
        "ALTER TABLE recruitment_application_history ADD INDEX idx_history_applicant_time (applicant_id, created_at, history_id)",
      );
    }
  } catch (error) {
    if (typeof pool.end === "function") await pool.end();
    throw error;
  }
  return pool;
}
module.exports = { createMysqlApplicationStore, createMysqlPool, FIELDS };
