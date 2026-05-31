const assert = require("assert");
const {
  createRecruitmentRecord,
  validateApplication,
  filterApplications,
  updateApplicationStatus,
} = require("../src/recruitment.cjs");

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

const validApplication = {
  name: "张三",
  gender: "男",
  birthDate: "2005-03",
  ethnicity: "汉族",
  politicalStatus: "共青团员",
  college: "科文学院",
  departmentMajor: "软件工程系",
  className: "软件工程 2401",
  phone: "13812345678",
  qq: "123456789",
  preferredDepartment: "研发部",
  acceptAdjustment: "是",
  strengths: "熟悉 JavaScript，参加过网页设计比赛",
  awards: "校级程序设计竞赛三等奖",
  experience: "班级学习委员",
  careerPlan: "希望在大学期间提升项目开发能力",
  photoName: "avatar.png",
};

runTest("validates required recruitment fields", () => {
  const result = validateApplication({ ...validApplication, name: "", phone: "12" });

  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.name.includes("姓名"));
  assert.ok(result.errors.phone.includes("手机号"));
});

runTest("creates a normalized pending recruitment record", () => {
  const record = createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z");

  assert.strictEqual(record.name, "张三");
  assert.strictEqual(record.status, "待审核");
  assert.strictEqual(record.createdAt, "2026-05-30T10:00:00.000Z");
  assert.ok(record.id.startsWith("ZR-"));
});

runTest("filters applications by department, status, and search keyword", () => {
  const records = [
    createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z"),
    createRecruitmentRecord(
      { ...validApplication, name: "李四", preferredDepartment: "组织部", status: "已面试" },
      "2026-05-30T11:00:00.000Z",
    ),
  ];

  const result = filterApplications(records, {
    department: "组织部",
    status: "已面试",
    keyword: "李四",
  });

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, "李四");
});

runTest("updates application status without mutating original list", () => {
  const records = [createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z")];
  const next = updateApplicationStatus(records, records[0].id, "通过");

  assert.strictEqual(next[0].status, "通过");
  assert.strictEqual(records[0].status, "待审核");
});
