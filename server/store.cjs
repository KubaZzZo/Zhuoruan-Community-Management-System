const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertBackup, assertDeletion } = require("./seasonBackup.cjs");

const ALL_FIELDS = [
  "id",
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
  "photoName",
  "photoData",
  "availableTime",
  "interviewAt",
  "interviewLocation",
  "interviewer",
  "interviewSummary",
  "reviewNote",
  "queryCode",
  "season",
  "status",
  "createdAt",
  "version",
  "originalDepartment",
  "quizQuestionIds",
  "quizAnswers",
  "quizCorrectCount",
  "reviewHistory",
];
const CORRECTABLE_FIELDS = new Set([
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
const FREE_TEXT_FIELDS = new Set(["strengths", "awards", "experience", "careerPlan", "reviewNote", "interviewSummary"]);
const SUMMARY_SKIP = new Set([
  "photoData",
  "reviewHistory",
  "queryCode",
  "quizQuestionIds",
  "quizAnswers",
  ...FREE_TEXT_FIELDS,
]);

function storeError(message, statusCode, code) {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
function duplicateError(field) {
  const labels = { studentId: "学号", phone: "手机号", qq: "QQ" };
  return storeError(`本季已有相同${labels[field] || field}的报名`, 409, "DUPLICATE");
}

function sameSeason(left, right) {
  return (left.season || "") === (right.season || "");
}

function normalize(record) {
  const result = {};
  for (const field of ALL_FIELDS) {
    if (field === "reviewHistory") result[field] = Array.isArray(record[field]) ? record[field] : [];
    else if (field === "version") result[field] = Number.isInteger(record[field]) ? record[field] : 0;
    else result[field] = record[field] == null ? "" : record[field];
  }
  if (!result.originalDepartment) result.originalDepartment = result.preferredDepartment;
  return result;
}

function compareRecords(a, b) {
  return String(b.createdAt).localeCompare(String(a.createdAt)) || String(a.id).localeCompare(String(b.id));
}
function summary(record) {
  const output = {};
  for (const field of ALL_FIELDS) {
    if (SUMMARY_SKIP.has(field)) continue;
    output[field] = record[field];
  }
  return output;
}

function createId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function historyChange(field, before, after) {
  if (field === "photoData") return { field, before: "原证件照", after: "已更换" };
  return { field, before, after: after == null ? "" : after };
}

function createApplicationStore(dataFile) {
  let queue = Promise.resolve();
  function read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
      return Array.isArray(parsed) ? parsed.map(normalize) : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  function write(records) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const temporary = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(records, null, 2));
    fs.renameSync(temporary, dataFile);
  }
  function serialized(task) {
    const run = queue.then(task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  async function insert(input) {
    return serialized(() => {
      const records = read();
      const record = normalize({
        ...input,
        id: input.id || createId(),
        createdAt: input.createdAt || new Date().toISOString(),
        version: 0,
        originalDepartment: input.originalDepartment || input.preferredDepartment,
        queryCode:
          input.queryCode ||
          crypto
            .createHash("sha256")
            .update(input.id || createId())
            .digest("hex")
            .slice(0, 16),
        reviewHistory: [],
      });
      for (const field of ["studentId", "phone", "qq"])
        if (record[field] && records.some((item) => sameSeason(item, record) && item[field] === record[field]))
          throw duplicateError(field);
      if (record.queryCode && records.some((item) => item.queryCode === record.queryCode))
        throw storeError("查询码冲突，请重试", 409, "DUPLICATE");
      write([...records, record]);
      return record;
    });
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
    return serialized(() => {
      const safePage = Math.max(1, Number(page) || 1);
      const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
      const needle = String(keyword).trim().toLowerCase();
      const matchesBase = (record) =>
        (!season || record.season === season || (includeUnassigned && !record.season)) &&
        (!department || record.preferredDepartment === department) &&
        (!needle ||
          [
            record.id,
            record.name,
            record.studentId,
            record.phone,
            record.qq,
            record.college,
            record.departmentMajor,
            record.className,
            record.preferredDepartment,
          ].some((value) => String(value).toLowerCase().includes(needle)));
      const all = read().filter(matchesBase);
      const filtered = all.filter((record) => !status || record.status === status);
      filtered.sort((a, b) => compareRecords(a, b));
      const records = filtered.slice((safePage - 1) * safeSize, safePage * safeSize).map((record) => {
        if (!includeDetails) return summary(record);
        const detail = { ...record };
        delete detail.photoData;
        delete detail.reviewHistory;
        delete detail.quizQuestionIds;
        delete detail.quizAnswers;
        detail.hasPhoto = Boolean(record.photoData);
        return detail;
      });
      const counts = {};
      for (const record of all) counts[record.status] = (counts[record.status] || 0) + 1;
      return { records, total: filtered.length, page: safePage, pageSize: safeSize, counts };
    });
  }
  async function get(id) {
    return serialized(() => read().find((record) => record.id === String(id)) || null);
  }
  async function lookup(studentId, phone, season = "") {
    return serialized(
      () =>
        read().find(
          (record) =>
            record.phone === phone &&
            (!season || record.season === season) &&
            (record.id === studentId || record.studentId === studentId),
        ) || null,
    );
  }
  async function seasons() {
    return serialized(() => {
      const counts = new Map();
      for (const record of read()) counts.set(record.season || "", (counts.get(record.season || "") || 0) + 1);
      return [...counts].map(([season, total]) => ({ season, total }));
    });
  }
  async function backupSeason(season) {
    return serialized(() => read().filter((record) => record.season === season));
  }
  async function purgeSeason(season, digest) {
    return serialized(() => {
      const records = read();
      const matching = records.filter((record) => record.season === season);
      assertBackup(matching, digest);
      const removed = matching.length;
      write(records.filter((record) => record.season !== season));
      return { season, removed };
    });
  }
  async function remove(id, context = {}) {
    return serialized(() => {
      const records = read();
      const current = records.find((record) => record.id === String(id));
      if (!current) return null;
      assertDeletion(current, context);
      write(records.filter((record) => record.id !== current.id));
      return { id: current.id, removed: 1 };
    });
  }
  async function revise(id, changes, context = {}) {
    return serialized(() => {
      const records = read();
      const index = records.findIndex((record) => record.id === String(id));
      if (index < 0) return null;
      const current = records[index];
      if (context.allowedDepartment && current.preferredDepartment !== context.allowedDepartment)
        throw storeError("department permission denied", 403, "FORBIDDEN");
      if (context.expectedVersion !== undefined && Number(context.expectedVersion) !== current.version)
        throw storeError("record version conflict", 409, "CONFLICT");
      const updates = {};
      for (const [field, value] of Object.entries(changes || {}))
        if (CORRECTABLE_FIELDS.has(field)) updates[field] = value == null ? "" : value;
      for (const field of ["studentId", "phone", "qq"])
        if (
          updates[field] &&
          records.some(
            (item, itemIndex) => itemIndex !== index && sameSeason(item, current) && item[field] === updates[field],
          )
        )
          throw duplicateError(field);
      const changed = Object.entries(updates)
        .filter(([field, after]) => String(current[field]) !== String(after))
        .map(([field, after]) => historyChange(field, current[field], after));
      if (!changed.length) return current;
      const next = { ...current, ...updates, version: current.version + 1 };
      if (updates.preferredDepartment && !next.originalDepartment)
        next.originalDepartment = current.preferredDepartment;
      const actor = context.actor || {};
      next.reviewHistory = [
        ...current.reviewHistory,
        {
          id: createId(),
          actor: actor.username || "",
          actorName: actor.name || "",
          action: context.action || "correct",
          createdAt: new Date().toISOString(),
          changes: changed,
        },
      ];
      records[index] = next;
      write(records);
      return next;
    });
  }
  async function update(mutator) {
    return serialized(() => {
      const current = read();
      const next = mutator(current);
      write(next);
      return next;
    });
  }
  return { read, update, insert, list, get, lookup, revise, seasons, backupSeason, purgeSeason, remove };
}

module.exports = { createApplicationStore, CORRECTABLE_FIELDS };
