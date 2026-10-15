const { createHash, randomBytes, randomUUID } = require("node:crypto");
const jpeg = require("jpeg-js");
const { backupDigest } = require("./seasonBackup.cjs");
const {
  ALL_DEPARTMENTS,
  DEPARTMENTS,
  LEGACY_DEPARTMENTS,
  FIELD_LIMITS,
  REVIEW_NOTE_LIMIT,
  STATUSES,
  createRecruitmentRecord,
  isPortraitPhoto,
  publicStatusRecord,
  validateApplication,
  validateInterview,
} = require("../src/recruitment.cjs");
const {
  addStaffAccount,
  changeAccountPassword,
  createAccountBook,
  publicAccount,
  resetAccountPassword,
  setAccountDisabled,
  verifyPassword,
} = require("./accounts.cjs");
const { createApplicationStore } = require("./store.cjs");
const { loadRecruitmentConfig, publicPolicy } = require("./config.cjs");

const LOOKUP_FIELDS = ["id", "studentId", "name", "preferredDepartment", "className", "status", "createdAt"];

function staffRecord(record) {
  if (!record || typeof record !== "object") return record;
  const output = { ...record };
  delete output.queryCode;
  delete output.availableTime;
  delete output.quizQuestionIds;
  delete output.quizAnswers;
  delete output.quizCorrectCount;
  return output;
}
const CORRECTION_FIELDS = Object.keys(FIELD_LIMITS).filter(
  (key) => !["photoName", "preferredDepartment"].includes(key),
);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
function objectBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw httpError(400, "请求内容必须是对象");
  return value;
}
function versionNumber(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw httpError(400, "缺少有效的资料版本，请刷新后重试。");
  return value;
}

function assertJpeg(photoData) {
  if (typeof photoData !== "string" || !isPortraitPhoto(photoData)) throw httpError(400, "证件照需要是清晰的 JPG 图片");
  const photo = Buffer.from(photoData.trim().split(",")[1] || "", "base64");
  if (
    photo.length < 4 ||
    photo[0] !== 0xff ||
    photo[1] !== 0xd8 ||
    photo[photo.length - 2] !== 0xff ||
    photo[photo.length - 1] !== 0xd9
  ) {
    throw httpError(400, "证件照需要是有效的 JPG 图片");
  }
  try {
    const decoded = jpeg.decode(photo, {
      useTArray: true,
      formatAsRGBA: false,
      tolerantDecoding: false,
      maxResolutionInMP: 4,
      maxMemoryUsageInMB: 32,
    });
    if (!decoded.width || !decoded.height || !decoded.data.length) throw new Error("Empty image");
  } catch {
    throw httpError(400, "证件照无法解码或尺寸过大，请重新上传。");
  }
}

function createRecruitmentService({ dataFile, store, accounts, config = loadRecruitmentConfig(), now = Date.now }) {
  const applications = store || createApplicationStore(dataFile);
  const book = createAccountBook(accounts);
  const sessions = new Map();
  const limits = new Map();

  function cleanup() {
    const time = now();
    for (const [key, value] of limits) if (value.resetAt <= time) limits.delete(key);
    for (const [key, value] of sessions) if (value.expiresAt <= time) sessions.delete(key);
  }
  function rateLimit(kind, identity, maximum, windowMs) {
    cleanup();
    const key = `${kind}:${identity || "unknown"}`;
    const value = limits.get(key) || { count: 0, resetAt: now() + windowMs };
    if (value.count >= maximum) throw httpError(429, "操作过于频繁，请稍后再试。");
    if (limits.size >= 10_000 && !limits.has(key)) throw httpError(429, "请求较多，请稍后再试。");
    value.count += 1;
    limits.set(key, value);
    return key;
  }
  function login(username, password, ip) {
    rateLimit("login-ip", ip, 60, 10 * 60_000);
    if (typeof username !== "string" || username.length > 64 || typeof password !== "string" || password.length > 256) {
      throw httpError(400, "账号或口令格式不正确");
    }
    const normalized = username.trim();
    const key = rateLimit("login-account", `${ip || "unknown"}|${normalized.toLowerCase()}`, 8, 10 * 60_000);
    const account = book.find((item) => item.username === normalized);
    // Keep failed unknown-account authentication on the same expensive password path.
    const validPassword = verifyPassword(account || book[0], password);
    if (!account || !validPassword) throw httpError(401, "账号或口令错误");
    if (account.disabled) throw httpError(403, "账号已停用，请联系社长。");
    limits.delete(key);
    const own = [...sessions].filter(([, session]) => session.account.username === account.username);
    if (own.length >= 5) sessions.delete(own[0][0]);
    const token = randomBytes(32).toString("hex");
    const session = publicAccount(account);
    sessions.set(token, { account: session, expiresAt: now() + config.sessionTtlMs });
    return { token, account: session, expiresAt: new Date(now() + config.sessionTtlMs).toISOString() };
  }
  function logout(token) {
    sessions.delete(token);
  }
  function requireAccount(token) {
    cleanup();
    const session = sessions.get(token);
    if (!session) throw httpError(401, "登录已失效，请重新登录。");
    const stored = book.find((item) => item.username === session.account.username);
    if (!stored || stored.disabled) {
      sessions.delete(token);
      throw httpError(401, "登录已失效，请重新登录。");
    }
    return session.account;
  }
  function policy() {
    return publicPolicy(config, now());
  }
  async function submit(data, ip) {
    rateLimit("submit-ip", ip, config.submissionIpLimit ?? 600, 10 * 60_000);
    objectBody(data);
    let submissionId = "";
    if (data.submissionKey !== undefined) {
      if (typeof data.submissionKey !== "string" || !/^[a-f0-9]{64}$/.test(data.submissionKey))
        throw httpError(400, "报名重试凭据格式不正确");
      // The random secret and canonical form bind recovery to this submission.
      // Deriving the primary key makes recovery durable without a second write.
      const normalized = createRecruitmentRecord(data);
      const fields = [...Object.keys(FIELD_LIMITS), "photoData"].sort();
      const fingerprint = fields.map((field) => [field, normalized[field] || ""]);
      submissionId = `ZR-${createHash("sha256")
        .update(JSON.stringify([config.season, data.submissionKey, fingerprint]))
        .digest("hex")
        .slice(0, 48)}`;
      const existing = await applications.get(submissionId);
      if (existing) return submissionReceipt(existing);
    }
    if (!policy().isOpen) throw httpError(403, policy().message);
    const result = validateApplication(data);
    if (!result.valid) throw httpError(400, Object.values(result.errors)[0] || "报名信息没有通过校验");
    rateLimit("submit-student", `${config.season}:${data.studentId.trim()}`, 10, 10 * 60_000);
    assertJpeg(data.photoData);
    const record = {
      ...createRecruitmentRecord({ ...data, status: "待审核" }),
      id: submissionId || `ZR-${randomUUID()}`,
      originalDepartment: data.preferredDepartment.trim(),
      version: 0,
      season: config.season,
    };
    try {
      await applications.insert(record);
    } catch (error) {
      if (submissionId && error.status === 409) {
        const existing = await applications.get(submissionId);
        if (existing) return submissionReceipt(existing);
      }
      throw error;
    }
    return submissionReceipt(record);
  }
  function submissionReceipt(record) {
    // Return only the fields needed to save the receipt and query progress.
    return {
      ...Object.fromEntries([...LOOKUP_FIELDS, "phone", "season"].map((key) => [key, record[key]])),
    };
  }
  function queryFilters(account, filters = {}) {
    const department = account.role === "president" ? String(filters.department || "") : account.department;
    const status = String(filters.status || "");
    const keyword = String(filters.keyword || "").trim();
    let season = String(filters.season ?? "");
    if (!season) season = config.season;
    if (department && ![...ALL_DEPARTMENTS, ...LEGACY_DEPARTMENTS].includes(department))
      throw httpError(400, "无效的部门筛选");
    if (status && !STATUSES.includes(status)) throw httpError(400, "无效的状态筛选");
    if (keyword.length > 100) throw httpError(400, "搜索内容不能超过 100 个字");
    if (season !== "all" && !/^[A-Za-z0-9_-]{1,32}$/.test(season)) throw httpError(400, "无效的招新季");
    const selectedSeason = season === "all" ? "" : season;
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 20);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100_000 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      throw httpError(400, "分页参数不正确");
    }
    return {
      department,
      status,
      keyword,
      page,
      pageSize,
      season: selectedSeason,
      includeUnassigned: selectedSeason === config.season,
    };
  }
  function assertWritable(record) {
    if (record.season && record.season !== config.season) throw httpError(409, "该招新季已结束，记录只读。");
  }
  async function list(token, filters) {
    const result = await applications.list(queryFilters(requireAccount(token), filters));
    return { ...result, records: result.records.map(staffRecord) };
  }
  async function detail(token, id) {
    const account = requireAccount(token);
    const record = await applications.get(id);
    if (!record) throw httpError(404, "没有找到这份报名表");
    if (account.role !== "president" && record.preferredDepartment !== account.department)
      throw httpError(403, "只能处理本部门的报名表");
    return staffRecord(record);
  }
  async function revise(token, id, changes, expectedVersion, action) {
    const account = requireAccount(token);
    const current = await applications.get(id);
    if (!current) throw httpError(404, "没有找到这份报名表");
    assertWritable(current);
    const result = await applications.revise(id, changes, {
      actor: account,
      expectedVersion: versionNumber(expectedVersion),
      ...(account.role !== "president" ? { allowedDepartment: account.department } : {}),
      action,
    });
    if (!result) throw httpError(404, "没有找到这份报名表");
    return staffRecord(result);
  }
  async function updateStatus(token, id, body) {
    await detail(token, id);
    objectBody(body);
    if (!STATUSES.includes(body.status)) throw httpError(400, "无效的审核状态");
    const changes = { status: body.status };
    if (body.reviewNote !== undefined) {
      if (typeof body.reviewNote !== "string" || body.reviewNote.trim().length > REVIEW_NOTE_LIMIT)
        throw httpError(400, `审核备注必须是 ${REVIEW_NOTE_LIMIT} 字以内的文本`);
      changes.reviewNote = body.reviewNote.trim();
    }
    const interview = {};
    for (const key of ["interviewAt", "interviewLocation", "interviewer", "interviewSummary"]) {
      if (body[key] !== undefined) interview[key] = body[key];
    }
    const interviewResult = validateInterview(interview);
    if (!interviewResult.valid) throw httpError(400, Object.values(interviewResult.errors)[0]);
    for (const [key, value] of Object.entries(interview)) changes[key] = value.trim();
    return revise(token, id, changes, body.expectedVersion, "review");
  }
  async function correct(token, id, changes, expectedVersion) {
    const current = await detail(token, id);
    objectBody(changes);
    const keys = Object.keys(changes);
    if (!keys.length || keys.some((key) => !CORRECTION_FIELDS.includes(key)))
      throw httpError(400, "包含不可更正的字段");
    const result = validateApplication(
      { ...current, ...changes },
      {
        allowInternalDepartment: true,
        staffCorrection: true,
        legacy: {
          college: current.college,
          politicalStatus: current.politicalStatus,
          preferredDepartment: current.preferredDepartment,
        },
      },
    );
    if (!result.valid) throw httpError(400, Object.values(result.errors)[0]);
    return revise(
      token,
      id,
      Object.fromEntries(keys.map((key) => [key, changes[key].trim()])),
      expectedVersion,
      "correct",
    );
  }
  async function replacePhoto(token, id, body) {
    const current = await detail(token, id);
    assertWritable(current);
    objectBody(body);
    assertJpeg(body.photoData);
    if (body.photoName !== undefined && typeof body.photoName !== "string")
      throw httpError(400, "照片文件名格式不正确");
    const photoName = typeof body.photoName === "string" ? body.photoName.trim() : current.photoName;
    if (photoName.length > 120) throw httpError(400, "照片文件名不能超过 120 个字");
    return revise(token, id, { photoData: body.photoData.trim(), photoName }, body.expectedVersion, "photo");
  }
  async function removeApplication(token, id, confirm, expectedVersion) {
    const account = requireAccount(token);
    const current = await applications.get(id);
    if (!current) throw httpError(404, "没有找到这份报名表");
    if (account.role !== "president" && current.preferredDepartment !== account.department) {
      throw httpError(403, "只能处理本部门的报名表");
    }
    if (typeof confirm !== "string" || confirm.trim() !== current.studentId)
      throw httpError(400, "请输入学号以确认删除");
    rateLimit("delete", account.username, 20, 10 * 60_000);
    const result = await applications.remove(id, {
      expectedVersion: versionNumber(expectedVersion),
      confirm: confirm.trim(),
      ...(account.role !== "president" ? { allowedDepartment: account.department } : {}),
    });
    if (!result) throw httpError(404, "没有找到这份报名表");
    return result;
  }
  async function transfer(token, id, department, expectedVersion) {
    const account = requireAccount(token);
    if (account.role !== "president") throw httpError(403, "只有社长可以进行部门调剂");
    const current = await detail(token, id);
    if (!ALL_DEPARTMENTS.includes(department)) throw httpError(400, "请选择有效的调剂部门");
    if (current.preferredDepartment !== department && current.acceptAdjustment !== "是")
      throw httpError(409, "申请人未同意服从调剂，请先核实并更正该选项。");
    return revise(token, id, { preferredDepartment: department }, expectedVersion, "transfer");
  }
  async function exportRecords(token, filters) {
    const account = requireAccount(token);
    rateLimit("export", account.username, 10, 60_000);
    const query = { ...queryFilters(account, filters), page: 1, pageSize: 100, includeDetails: true };
    const records = [];
    let result;
    do {
      result = await applications.list(query);
      if (result.total > 10_000) throw httpError(400, "名单较大，请按部门或状态分批导出。");
      records.push(...result.records.map(staffRecord));
      query.page += 1;
    } while ((query.page - 1) * query.pageSize < result.total);
    return records;
  }
  async function lookup(studentId, phone, ip) {
    rateLimit("lookup-ip", ip, config.lookupIpLimit ?? 1800, 60_000);
    const identity = assertLookupIdentity(studentId, phone);
    rateLimit("lookup-student", `${config.season}:${identity.studentId}`, 30, 60_000);
    const record = await applications.lookup(identity.studentId, identity.phone, config.season);
    if (!record) throw httpError(404, "没有查到匹配记录，请确认学号和报名手机号是否一致。");
    return publicStatusRecord(record);
  }
  function assertLookupIdentity(studentId, phone) {
    if (
      typeof studentId !== "string" ||
      !/^\d{8,20}$/.test(studentId.trim()) ||
      typeof phone !== "string" ||
      !/^1[3-9]\d{9}$/.test(phone.trim())
    ) {
      throw httpError(400, "请填写有效的学号和报名手机号。");
    }
    return { studentId: studentId.trim(), phone: phone.trim() };
  }
  function listStaff(token) {
    const account = requireAccount(token);
    if (account.role !== "president") throw httpError(403, "只有社长可以管理工作人员账号");
    return book.map(publicAccount);
  }
  function createStaff(token, input) {
    const account = requireAccount(token);
    if (account.role !== "president") throw httpError(403, "只有社长可以管理工作人员账号");
    objectBody(input);
    rateLimit("staff", account.username, 20, 10 * 60_000);
    return addStaffAccount(book, input);
  }
  function changePassword(token, currentPassword, newPassword) {
    const account = requireAccount(token);
    rateLimit("password", account.username, 8, 10 * 60_000);
    const result = changeAccountPassword(book, account.username, currentPassword, newPassword);
    for (const [key, session] of sessions) {
      if (key !== token && session.account.username === account.username) sessions.delete(key);
    }
    return result;
  }
  function resetPassword(token, username) {
    const account = requireAccount(token);
    if (account.role !== "president") throw httpError(403, "只有社长可以重置口令");
    if (typeof username !== "string" || username === account.username)
      throw httpError(400, "请在修改口令里更换自己的口令");
    rateLimit("reset", account.username, 10, 10 * 60_000);
    const result = resetAccountPassword(book, username);
    for (const [key, session] of sessions) if (session.account.username === username) sessions.delete(key);
    return result;
  }
  function setStaffDisabled(token, username, disabled) {
    const account = requireAccount(token);
    if (account.role !== "president") throw httpError(403, "只有社长可以停用工作人员账号");
    if (typeof username !== "string" || username === account.username) throw httpError(400, "不能停用自己的账号");
    rateLimit("staff-status", account.username, 20, 10 * 60_000);
    const result = setAccountDisabled(book, username, disabled);
    if (disabled === true) {
      for (const [key, session] of sessions) if (session.account.username === username) sessions.delete(key);
    }
    return result;
  }
  async function listSeasons(token) {
    requireAccount(token);
    const rows = typeof applications.seasons === "function" ? await applications.seasons() : [];
    return { season: config.season, seasons: rows };
  }
  function assertPastSeason(account, season) {
    if (account.role !== "president") throw httpError(403, "只有社长可以备份和清理往季报名");
    if (typeof season !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(season) || season === config.season) {
      throw httpError(409, "只能备份和清理已经结束的招新季");
    }
  }
  async function backupSeason(token, season) {
    const account = requireAccount(token);
    assertPastSeason(account, season);
    rateLimit("backup", account.username, 5, 60_000);
    const records = await applications.backupSeason(season);
    const backup = { schemaVersion: 1, season, createdAt: new Date(now()).toISOString(), records };
    if (Buffer.byteLength(JSON.stringify(backup)) > 64 * 1024 * 1024) {
      throw httpError(400, "备份超过 64MB，请联系服务器管理员使用数据库备份流程。");
    }
    requireAccount(token);
    const backupToken = randomBytes(32).toString("hex");
    sessions.get(token).backup = {
      token: backupToken,
      season,
      digest: backupDigest(records),
      count: records.length,
      expiresAt: now() + 15 * 60_000,
    };
    return { backup, backupToken, count: records.length };
  }
  async function purgeSeason(token, season, confirm, backupToken, downloaded) {
    const account = requireAccount(token);
    assertPastSeason(account, season);
    if (confirm !== season) throw httpError(400, "请输入招新季编号以确认清理");
    const receipt = sessions.get(token).backup;
    if (!receipt || receipt.token !== backupToken || receipt.season !== season || receipt.expiresAt <= now()) {
      throw httpError(409, "请先在当前会话下载该季的完整备份，备份凭据有效期为 15 分钟。");
    }
    if (downloaded !== true) throw httpError(400, "请确认整季备份文件已保存后再清理。");
    rateLimit("purge", account.username, 5, 60_000);
    const result = await applications.purgeSeason(season, receipt.digest);
    delete sessions.get(token)?.backup;
    return result;
  }
  return {
    login,
    logout,
    requireAccount,
    policy,
    submit,
    list,
    detail,
    updateStatus,
    correct,
    replacePhoto,
    removeApplication,
    transfer,
    exportRecords,
    lookup,
    listStaff,
    createStaff,
    changePassword,
    resetPassword,
    setStaffDisabled,
    listSeasons,
    backupSeason,
    purgeSeason,
  };
}

function clientAddress(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers?.["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    if (forwarded.length > 0 && forwarded.length <= 64 && /^[0-9a-fA-F:.]+$/.test(forwarded)) return forwarded;
  }
  return req.socket?.remoteAddress || "unknown";
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    function fail(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > 1_500_000) {
        chunks.length = 0;
        fail(httpError(413, "提交内容过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("error", () => fail(httpError(400, "请求格式不正确")));
    req.on("end", () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        const parsed = objectBody(raw ? JSON.parse(raw) : {});
        if (settled) return;
        settled = true;
        resolve(parsed);
      } catch (error) {
        fail(error.status ? error : httpError(400, "请求格式不正确"));
      }
    });
  });
}
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  if (status === 429) res.setHeader("Retry-After", "60");
  res.end(JSON.stringify(payload));
}
function bearerToken(req) {
  const match = String(req.headers.authorization || "").match(/^Bearer\s+([A-Za-z0-9]{1,128})$/i);
  return match ? match[1] : "";
}
function attachRecruitmentApi(dataFile, options = {}) {
  const config = options.config || loadRecruitmentConfig();
  const service = createRecruitmentService({ dataFile, ...options, config });
  return function recruitmentApi(req, res, next) {
    let url;
    try {
      url = new URL(req.url, "http://127.0.0.1");
      decodeURIComponent(url.pathname);
    } catch {
      sendJson(res, 400, { message: "请求地址格式不正确" });
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      next();
      return;
    }
    const token = bearerToken(req);
    const ip = clientAddress(req, config.trustProxy === true);
    Promise.resolve()
      .then(async () => {
        if (req.method === "GET" && url.pathname === "/api/recruitment") {
          sendJson(res, 200, { policy: service.policy(), departments: DEPARTMENTS });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/login") {
          const body = await readJson(req);
          sendJson(res, 200, service.login(body.username, body.password, ip));
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/session") {
          sendJson(res, 200, { account: service.requireAccount(token) });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/logout") {
          service.logout(token);
          sendJson(res, 200, { ok: true });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/password") {
          const body = await readJson(req);
          sendJson(res, 200, { account: service.changePassword(token, body.currentPassword, body.newPassword) });
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/accounts") {
          sendJson(res, 200, { accounts: service.listStaff(token) });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/accounts") {
          sendJson(res, 201, service.createStaff(token, await readJson(req)));
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/seasons") {
          sendJson(res, 200, await service.listSeasons(token));
          return;
        }
        const resetMatch = url.pathname.match(/^\/api\/accounts\/([A-Za-z0-9_-]{1,64})\/reset$/);
        if (req.method === "POST" && resetMatch) {
          sendJson(res, 200, service.resetPassword(token, resetMatch[1]));
          return;
        }
        const statusMatch = url.pathname.match(/^\/api\/accounts\/([A-Za-z0-9_-]{1,64})\/status$/);
        if (req.method === "POST" && statusMatch) {
          const body = await readJson(req);
          sendJson(res, 200, { account: service.setStaffDisabled(token, statusMatch[1], body.disabled) });
          return;
        }
        const backupMatch = url.pathname.match(/^\/api\/seasons\/([A-Za-z0-9_-]{1,32})\/backup$/);
        if (req.method === "POST" && backupMatch) {
          sendJson(res, 200, await service.backupSeason(token, backupMatch[1]));
          return;
        }
        const purgeMatch = url.pathname.match(/^\/api\/seasons\/([A-Za-z0-9_-]{1,32})\/purge$/);
        if (req.method === "POST" && purgeMatch) {
          const body = await readJson(req);
          sendJson(
            res,
            200,
            await service.purgeSeason(token, purgeMatch[1], body.confirm, body.backupToken, body.downloaded),
          );
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/applications") {
          sendJson(res, 201, { record: await service.submit(await readJson(req), ip) });
          return;
        }
        const filters = Object.fromEntries(url.searchParams);
        if (req.method === "GET" && url.pathname === "/api/applications") {
          sendJson(res, 200, await service.list(token, filters));
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/applications/export") {
          sendJson(res, 200, { records: await service.exportRecords(token, filters) });
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/applications/lookup") {
          sendJson(res, 200, {
            record: await service.lookup(filters.studentId, filters.phone, ip),
          });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/applications/lookup") {
          const body = await readJson(req);
          sendJson(res, 200, { record: await service.lookup(body.studentId, body.phone, ip) });
          return;
        }
        if (["/api/applications/quiz", "/api/applications/quiz/load"].includes(url.pathname)) {
          throw httpError(410, "基础题功能已取消，请直接查询报名进度。");
        }
        const match = url.pathname.match(/^\/api\/applications\/([^/]{1,64})(?:\/(correction|transfer|photo))?$/);
        if (match) {
          const id = decodeURIComponent(match[1]);
          if (req.method === "GET" && !match[2]) {
            sendJson(res, 200, { record: await service.detail(token, id) });
            return;
          }
          if (req.method === "DELETE" && !match[2]) {
            const body = await readJson(req);
            sendJson(res, 200, await service.removeApplication(token, id, body.confirm, body.expectedVersion));
            return;
          }
          if (req.method === "PATCH") {
            const body = await readJson(req);
            const record =
              match[2] === "correction"
                ? await service.correct(token, id, body.changes, body.expectedVersion)
                : match[2] === "photo"
                  ? await service.replacePhoto(token, id, body)
                  : match[2] === "transfer"
                    ? await service.transfer(token, id, body.department, body.expectedVersion)
                    : await service.updateStatus(token, id, body);
            sendJson(res, 200, { record });
            return;
          }
        }
        throw httpError(404, "没有这个接口");
      })
      .catch((error) => {
        if (res.headersSent || res.writableEnded) return;
        const status = error.status || 500;
        sendJson(res, status, { message: status === 500 ? "服务器暂时无法处理报名" : error.message });
      });
  };
}
module.exports = { attachRecruitmentApi, clientAddress, createRecruitmentService };
