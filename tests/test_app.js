const assert = require("assert");
const {
  ALL_DEPARTMENTS,
  COLLEGES,
  DEPARTMENTS,
  createRecruitmentRecord,
  isPortraitPhoto,
  publicStatusRecord,
  validateApplication,
  filterApplications,
  updateApplicationStatus,
  applicationReceiptText,
} = require("../src/recruitment.cjs");

const tinyPhoto =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

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
  college: "人工智能与软件学院",
  departmentMajor: "软件工程系",
  className: "软件工程 2401",
  studentId: "202401010001",
  phone: "13812345678",
  qq: "123456789",
  preferredDepartment: "数据算法部",
  acceptAdjustment: "是",
  strengths: "熟悉 JavaScript，参加过网页设计比赛",
  awards: "校级程序设计竞赛三等奖",
  experience: "班级学习委员",
  careerPlan: "希望在大学期间提升项目开发能力",
  availableTime: "周三晚上、周六下午",
  photoName: "avatar.png",
};

runTest("validates required recruitment fields", () => {
  const result = validateApplication({ ...validApplication, name: "", phone: "12" });

  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.name.includes("姓名"));
  assert.ok(result.errors.phone.includes("手机号"));
});

runTest("requires an 8 to 20 digit student id", () => {
  const missing = validateApplication({ ...validApplication, photoData: tinyPhoto, studentId: "" });
  const shortId = validateApplication({ ...validApplication, photoData: tinyPhoto, studentId: "12345" });
  const ready = validateApplication({ ...validApplication, photoData: tinyPhoto, studentId: "202401010001" });

  assert.strictEqual(missing.valid, false);
  assert.ok(missing.errors.studentId.includes("学号"));
  assert.strictEqual(shortId.valid, false);
  assert.ok(shortId.errors.studentId.includes("学号"));
  assert.strictEqual(ready.valid, true);
});

runTest("requires a jpeg portrait photo", () => {
  const missing = validateApplication(validApplication);
  assert.strictEqual(missing.valid, false);
  assert.ok(missing.errors.photoData.includes("证件照"));

  const ready = validateApplication({ ...validApplication, photoData: tinyPhoto });
  assert.strictEqual(ready.valid, true);
  assert.strictEqual(isPortraitPhoto(tinyPhoto), true);
  assert.strictEqual(isPortraitPhoto("data:image/svg+xml;base64,PHN2Zz4="), false);
});

runTest("creates a normalized pending recruitment record", () => {
  const record = createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z");

  assert.strictEqual(record.name, "张三");
  assert.strictEqual(record.studentId, "202401010001");
  assert.strictEqual(record.status, "待审核");
  assert.strictEqual(record.createdAt, "2026-05-30T10:00:00.000Z");
  assert.ok(record.id.startsWith("ZR-"));
});

runTest("rejects an unrealistic birth date and an oversized name", () => {
  const futureBirth = validateApplication({ ...validApplication, birthDate: "2099-01" });
  const longName = validateApplication({ ...validApplication, name: "张".repeat(65) });

  assert.strictEqual(futureBirth.valid, false);
  assert.ok(futureBirth.errors.birthDate.includes("出生年月"));
  assert.strictEqual(longName.valid, false);
  assert.ok(longName.errors.name.includes("64"));
});

runTest("filters applications by department, status, and search keyword", () => {
  const records = [
    createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z"),
    createRecruitmentRecord(
      { ...validApplication, name: "李四", preferredDepartment: "综合运营部", status: "已面试" },
      "2026-05-30T11:00:00.000Z",
    ),
  ];

  const result = filterApplications(records, {
    department: "综合运营部",
    status: "已面试",
    keyword: "李四",
  });

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].name, "李四");

  const byId = filterApplications(records, { keyword: records[0].id.toLowerCase() });
  assert.strictEqual(byId.length, 1);
  assert.strictEqual(byId[0].id, records[0].id);
});

runTest("updates application status without mutating original list", () => {
  const records = [createRecruitmentRecord(validApplication, "2026-05-30T10:00:00.000Z")];
  const next = updateApplicationStatus(records, records[0].id, "通过");

  assert.strictEqual(next[0].status, "通过");
  assert.strictEqual(records[0].status, "待审核");
});

runTest("blocks direct internal-department signup but permits staff validation after transfer", () => {
  const internal = { ...validApplication, photoData: tinyPhoto, preferredDepartment: "实干青年部" };
  assert.strictEqual(validateApplication(internal).valid, false);
  assert.strictEqual(validateApplication(internal, { allowInternalDepartment: true }).valid, true);
  for (const value of [null, [], { ...validApplication, name: {} }, { ...validApplication, qq: 12345 }]) {
    assert.strictEqual(validateApplication(value).valid, false);
  }
});

runTest("six current colleges govern signup and preserve existing historical colleges", () => {
  assert.deepStrictEqual(COLLEGES, [
    "人工智能与软件学院",
    "电气与智能制造学院",
    "经济学院",
    "管理学院",
    "文理学院",
    "传媒与设计学院",
  ]);
  for (const college of COLLEGES) {
    assert.ok(validateApplication({ ...validApplication, photoData: tinyPhoto, college }).valid);
  }
  const historical = { ...validApplication, photoData: tinyPhoto, college: "科文学院" };
  assert.strictEqual(validateApplication(historical).valid, false);
  assert.ok(validateApplication(historical, { legacy: { college: "科文学院" } }).valid);
  assert.strictEqual(validateApplication(historical, { legacy: { college: "理工学院" } }).valid, false);
});

runTest("current departments govern signup while historical corrections retain their department", () => {
  assert.deepStrictEqual(ALL_DEPARTMENTS, ["实干青年部", "综合运营部", "数据算法部", "工程项目部"]);
  assert.deepStrictEqual(DEPARTMENTS, ["综合运营部", "数据算法部", "工程项目部"]);
  for (const preferredDepartment of DEPARTMENTS) {
    assert.ok(validateApplication({ ...validApplication, photoData: tinyPhoto, preferredDepartment }).valid);
  }
  const oldApplication = { ...validApplication, photoData: tinyPhoto, preferredDepartment: "研发部" };
  assert.strictEqual(validateApplication(oldApplication).valid, false);
  assert.strictEqual(validateApplication(oldApplication, { allowInternalDepartment: true }).valid, false);
  assert.ok(
    validateApplication(oldApplication, {
      allowInternalDepartment: true,
      legacy: { preferredDepartment: "研发部" },
    }).valid,
  );
  assert.strictEqual(
    validateApplication(oldApplication, {
      allowInternalDepartment: true,
      legacy: { preferredDepartment: "外联部" },
    }).valid,
    false,
  );
});

runTest("public status keeps interview plans and hides staff-only fields", () => {
  const view = publicStatusRecord({
    id: "ZR-1",
    studentId: "202401010001",
    name: "张三",
    phone: "13812345678",
    preferredDepartment: "工程项目部",
    originalDepartment: "数据算法部",
    className: "软工1班",
    status: "待面试",
    createdAt: "2026-10-01T00:00:00.000Z",
    interviewAt: "2026-10-08T19:00",
    interviewLocation: "实训楼 301",
    reviewNote: "内部备注",
    queryCode: "ABCD2345",
    quizCorrectCount: "5",
  });
  assert.strictEqual(view.interviewAt, "2026-10-08T19:00");
  assert.strictEqual(view.interviewLocation, "实训楼 301");
  assert.strictEqual(view.originalDepartment, "数据算法部");
  assert.ok(view.notice.includes("实训楼 301"));
  assert.ok(view.notice.includes("原志愿：数据算法部"));
  assert.ok(!view.notice.includes("内部备注"));
  for (const field of ["phone", "reviewNote", "queryCode", "quizCorrectCount", "photoData"]) {
    assert.strictEqual(view[field], undefined, field);
  }
  assert.strictEqual(
    publicStatusRecord({ name: "李四", status: "待审核", preferredDepartment: "数据算法部" }).interviewAt,
    undefined,
  );
});

runTest("exports safe text cells without truncating numeric identifiers", () => {
  const { csvCell } = require("../src/recruitment.cjs");
  for (const value of ["=1+1", "+SUM(A1)", "-1+2", "@SUM(A1)", "  =1+1", "\t=1", "\r=1", "\n=1"]) {
    const encoded = csvCell(value);
    assert.ok(encoded.startsWith("'") || encoded.startsWith("\"'"), `unsafe CSV cell ${JSON.stringify(value)}`);
  }
  assert.strictEqual(csvCell('含有,"引号"'), '"含有,""引号"""');
  assert.strictEqual(csvCell("00123456789012345678", { numericText: true }), '"=""00123456789012345678"""');
  assert.strictEqual(csvCell('1"&1', { numericText: true }), '"1""&1"');
  assert.strictEqual(csvCell("正常文字"), "正常文字");
});

runTest("freshman receipt keeps recovery credentials without exporting contact or review data", () => {
  const record = { ...validApplication, season: "2026", reviewNote: "内部备注" };
  const text = applicationReceiptText(record);
  assert.ok(text.includes(record.studentId));
  assert.ok(text.includes(record.phone));
  assert.ok(text.includes(record.preferredDepartment));
  assert.ok(text.includes("审核进度"));
  assert.ok(!text.includes("基础题"));
  for (const privateValue of [record.qq, record.reviewNote]) assert.ok(!text.includes(privateValue));
});

(async () => {
  const source = require("node:fs").readFileSync(require.resolve("../src/recruitment.js"), "utf8");
  const browser = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const server = require("../src/recruitment.cjs");
  assert.deepStrictEqual(browser.DEPARTMENTS, server.DEPARTMENTS);
  assert.deepStrictEqual(browser.ALL_DEPARTMENTS, server.ALL_DEPARTMENTS);
  assert.deepStrictEqual(browser.STATUSES, server.STATUSES);
  assert.deepStrictEqual(browser.COLLEGES, server.COLLEGES);
  assert.deepStrictEqual(browser.DEPARTMENT_PROFILES, server.DEPARTMENT_PROFILES);
  assert.ok(
    browser.recruitmentNotice({ name: "张三", status: "通过", preferredDepartment: "数据算法部" }).includes("通过"),
  );
  for (const data of [
    { ...validApplication, photoData: tinyPhoto },
    {},
    { ...validApplication, preferredDepartment: "实干青年部" },
    { name: {} },
  ]) {
    assert.deepStrictEqual(browser.validateApplication(data), server.validateApplication(data));
  }
  const sample = {
    name: "张三",
    status: "待面试",
    preferredDepartment: "数据算法部",
    interviewAt: "2026-10-08T19:00",
    reviewNote: "内部备注",
    phone: "13800000000",
  };
  assert.deepStrictEqual(browser.publicStatusRecord(sample), server.publicStatusRecord(sample));
  assert.strictEqual(browser.applicationReceiptText(sample), server.applicationReceiptText(sample));
  for (const value of ["=1+1", "正常文字", "\t=1", "00123456789012345678"]) {
    assert.strictEqual(browser.csvCell(value), server.csvCell(value));
    assert.strictEqual(browser.csvCell(value, { numericText: true }), server.csvCell(value, { numericText: true }));
  }
  console.log("PASS browser and server business logic agree");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
