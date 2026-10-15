const { createHash } = require("node:crypto");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function backupDigest(records) {
  const ordered = [...records].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return createHash("sha256")
    .update(JSON.stringify(canonical(ordered)))
    .digest("hex");
}

function assertBackup(records, digest) {
  if (!digest || backupDigest(records) !== digest) {
    throw Object.assign(new Error("报名资料已变化，请重新备份整季后再清理。"), { status: 409 });
  }
}

function assertDeletion(current, context) {
  if (context.allowedDepartment && current.preferredDepartment !== context.allowedDepartment) {
    throw Object.assign(new Error("只能删除本部门的报名表"), { status: 403 });
  }
  if (!Number.isSafeInteger(context.expectedVersion) || context.expectedVersion !== current.version) {
    throw Object.assign(new Error("资料已变化，请刷新后重新确认删除。"), { status: 409 });
  }
  if (context.confirm !== current.studentId) {
    throw Object.assign(new Error("请输入学号以确认删除"), { status: 400 });
  }
}

module.exports = { backupDigest, assertBackup, assertDeletion };
