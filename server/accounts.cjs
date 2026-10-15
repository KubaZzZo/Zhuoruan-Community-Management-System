const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

const { ALL_DEPARTMENTS, LEGACY_DEPARTMENTS } = require("../src/recruitment.cjs");

const STAFF_ROLES = [
  { username: "shezhang", role: "president", name: "社长", department: "" },
  { username: "yunying", role: "minister", name: "综合运营部部长", department: "综合运营部" },
  { username: "suanfa", role: "minister", name: "数据算法部部长", department: "数据算法部" },
  { username: "gongcheng", role: "minister", name: "工程项目部部长", department: "工程项目部" },
  { username: "shigan", role: "minister", name: "实干青年部部长", department: "实干青年部" },
];

function hashPassword(password, salt) {
  return scryptSync(password, salt, 32).toString("hex");
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object" || !/^[a-zA-Z0-9_-]{1,64}$/.test(account.username || "")) {
    throw new Error("工作人员账号配置无效");
  }
  if (
    !["president", "minister"].includes(account.role) ||
    (account.role === "minister" && ![...ALL_DEPARTMENTS, ...LEGACY_DEPARTMENTS].includes(account.department))
  ) {
    throw new Error("工作人员权限配置无效");
  }
  const salt = account.salt || randomBytes(16).toString("hex");
  const passwordHash =
    account.passwordHash ||
    (typeof account.password === "string" && account.password.length >= 12 ? hashPassword(account.password, salt) : "");
  if (!/^[a-f0-9]{64}$/i.test(passwordHash) || !/^[a-f0-9]{32,128}$/i.test(salt)) {
    throw new Error("工作人员密码必须至少 12 位，或提供有效的随机盐和密码哈希");
  }
  return {
    username: account.username,
    role: account.role,
    name: String(account.name || account.username),
    department: account.role === "president" ? "" : account.department,
    disabled: account.disabled === true,
    salt,
    passwordHash,
  };
}

function loadAccounts() {
  const custom = process.env.STAFF_ACCOUNTS_FILE;
  const file = custom ? path.resolve(custom) : path.resolve(__dirname, "../data/staff-accounts.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  if (custom) throw new Error("STAFF_ACCOUNTS_FILE 指定的账号文件不存在");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const initial = STAFF_ROLES.map((account) => ({ ...account, password: randomBytes(18).toString("base64url") }));
  const accounts = initial.map(normalizeAccount);
  const onboarding = path.join(path.dirname(file), "staff-initial-passwords.json");
  // The generated plaintext credentials are onboarding-only; never write them to logs.
  fs.writeFileSync(file, JSON.stringify(accounts, null, 2), { flag: "wx", mode: 0o600 });
  fs.writeFileSync(onboarding, JSON.stringify(initial, null, 2), { flag: "wx", mode: 0o600 });
  console.info("已初始化随机工作人员账号。初始口令保存在 data/staff-initial-passwords.json，请分发后移除该文件。");
  return accounts;
}

function accountError(message, status) {
  return Object.assign(new Error(message), { status });
}

function persistBook(book, file) {
  if (!file) return;
  const safe = book.map(({ username, role, name, department, disabled, salt, passwordHash }) => ({
    username,
    role,
    name,
    department,
    disabled: disabled === true,
    salt,
    passwordHash,
  }));
  const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(safe, null, 2)}\n`, { flag: "wx", mode: 0o600, flush: true });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function createAccountBook(accounts) {
  const file =
    accounts === undefined
      ? process.env.STAFF_ACCOUNTS_FILE
        ? path.resolve(process.env.STAFF_ACCOUNTS_FILE)
        : path.resolve(__dirname, "../data/staff-accounts.json")
      : "";
  const input = accounts === undefined ? loadAccounts() : accounts;
  if (!Array.isArray(input) || input.length === 0) throw new Error("工作人员账号列表不能为空");
  const book = input.map(normalizeAccount);
  if (new Set(book.map((account) => account.username)).size !== book.length) throw new Error("工作人员账号名不能重复");
  book.persist = (candidate = book) => persistBook(candidate, file);
  return book;
}

function commitAccount(book, account) {
  const candidate = book.map((item) => (item.username === account.username ? account : item));
  if (!book.some((item) => item.username === account.username)) candidate.push(account);
  book.persist?.(candidate);
  book.splice(0, book.length, ...candidate);
}

function assertNewPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    throw accountError("新口令至少 12 位", 400);
  }
}

function changeAccountPassword(book, username, currentPassword, newPassword) {
  const account = book.find((item) => item.username === username);
  if (!account || !verifyPassword(account, currentPassword)) throw accountError("原口令不正确", 401);
  assertNewPassword(newPassword);
  const salt = randomBytes(16).toString("hex");
  const updated = { ...account, salt, passwordHash: hashPassword(newPassword, salt) };
  commitAccount(book, updated);
  return publicAccount(updated);
}

function resetAccountPassword(book, username) {
  const account = book.find((item) => item.username === username);
  if (!account) throw accountError("没有这个工作人员账号", 404);
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const updated = { ...account, salt, passwordHash: hashPassword(password, salt) };
  commitAccount(book, updated);
  return { account: publicAccount(updated), password };
}

function setAccountDisabled(book, username, disabled) {
  if (typeof disabled !== "boolean") throw accountError("请明确停用或恢复", 400);
  const account = book.find((item) => item.username === username);
  if (!account) throw accountError("没有这个工作人员账号", 404);
  if (disabled && account.role === "president") {
    const remaining = book.filter((item) => item.role === "president" && !item.disabled && item.username !== username);
    if (!remaining.length) throw accountError("至少保留一个可用的社长账号", 409);
  }
  const updated = { ...account, disabled };
  commitAccount(book, updated);
  return publicAccount(updated);
}

function addStaffAccount(book, input) {
  if (input?.role === "minister" && !ALL_DEPARTMENTS.includes(input.department)) {
    throw accountError("请选择当前部门创建工作人员账号", 400);
  }
  if (book.some((item) => item.username === String(input?.username || "").trim())) {
    throw accountError("账号名已存在", 409);
  }
  const password = randomBytes(18).toString("base64url");
  const account = normalizeAccount({ ...input, password });
  commitAccount(book, account);
  return { account: publicAccount(account), password };
}

function verifyPassword(account, password) {
  if (typeof password !== "string" || password.length > 256) return false;
  const actual = scryptSync(password, account.salt, 32);
  const expected = Buffer.from(account.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicAccount(account) {
  return {
    username: account.username,
    role: account.role,
    name: account.name,
    department: account.department,
    disabled: account.disabled === true,
  };
}

module.exports = {
  STAFF_ROLES,
  hashPassword,
  createAccountBook,
  verifyPassword,
  publicAccount,
  changeAccountPassword,
  resetAccountPassword,
  addStaffAccount,
  setAccountDisabled,
};
