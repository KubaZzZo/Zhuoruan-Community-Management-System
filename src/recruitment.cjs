const DEPARTMENTS = ["研发部", "项目部", "外联部", "组织部", "产品部", "实干青年部"];
const STATUSES = ["待审核", "已面试", "通过", "未通过"];

function trimValue(value) {
  return typeof value === "string" ? value.trim() : value || "";
}

function validateApplication(data) {
  const errors = {};
  const requiredFields = {
    name: "姓名不能为空",
    gender: "请选择性别",
    birthDate: "请选择出生年月",
    ethnicity: "民族不能为空",
    politicalStatus: "政治面貌不能为空",
    college: "二级学院不能为空",
    departmentMajor: "系别不能为空",
    className: "班级不能为空",
    phone: "联系电话不能为空",
    qq: "QQ 不能为空",
    preferredDepartment: "请选择意向部门",
    acceptAdjustment: "请选择是否服从调剂",
    strengths: "请填写爱好及特长",
    careerPlan: "请填写职业规划",
  };

  Object.entries(requiredFields).forEach(([key, message]) => {
    if (!trimValue(data[key])) errors[key] = message;
  });

  if (trimValue(data.phone) && !/^1[3-9]\d{9}$/.test(trimValue(data.phone))) {
    errors.phone = "请输入 11 位中国大陆手机号";
  }

  if (trimValue(data.qq) && !/^\d{5,12}$/.test(trimValue(data.qq))) {
    errors.qq = "请输入 5-12 位 QQ 号";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function createRecruitmentRecord(data, createdAt) {
  const now = createdAt || new Date().toISOString();
  const normalized = {
    name: trimValue(data.name),
    gender: trimValue(data.gender),
    birthDate: trimValue(data.birthDate),
    ethnicity: trimValue(data.ethnicity),
    politicalStatus: trimValue(data.politicalStatus),
    college: trimValue(data.college),
    departmentMajor: trimValue(data.departmentMajor),
    className: trimValue(data.className),
    phone: trimValue(data.phone),
    qq: trimValue(data.qq),
    preferredDepartment: trimValue(data.preferredDepartment),
    acceptAdjustment: trimValue(data.acceptAdjustment),
    strengths: trimValue(data.strengths),
    awards: trimValue(data.awards),
    experience: trimValue(data.experience),
    careerPlan: trimValue(data.careerPlan),
    photoName: trimValue(data.photoName),
    status: STATUSES.includes(data.status) ? data.status : "待审核",
    createdAt: now,
  };

  normalized.id = `ZR-${hashString(`${normalized.phone}-${normalized.qq}-${now}`)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")}`;
  return normalized;
}

function filterApplications(records, filters = {}) {
  const keyword = trimValue(filters.keyword).toLowerCase();
  return records.filter((record) => {
    const matchesDepartment = !filters.department || record.preferredDepartment === filters.department;
    const matchesStatus = !filters.status || record.status === filters.status;
    const text = [
      record.name,
      record.phone,
      record.qq,
      record.className,
      record.departmentMajor,
      record.preferredDepartment,
    ]
      .join(" ")
      .toLowerCase();
    return matchesDepartment && matchesStatus && (!keyword || text.includes(keyword));
  });
}

function updateApplicationStatus(records, id, status) {
  if (!STATUSES.includes(status)) return records.slice();
  return records.map((record) => (record.id === id ? { ...record, status } : { ...record }));
}

module.exports = {
  DEPARTMENTS,
  STATUSES,
  createRecruitmentRecord,
  validateApplication,
  filterApplications,
  updateApplicationStatus,
};
