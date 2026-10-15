const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const jpeg = require("jpeg-js");
const { attachRecruitmentApi } = require("../server/api.cjs");
const { createHttpHandler } = require("../server/index.cjs");
const { createApplicationStore } = require("../server/store.cjs");
const { loadRecruitmentConfig } = require("../server/config.cjs");

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zhuoruan-frontend-test-"));
  const store = createApplicationStore(path.join(directory, "applications.json"));
  const portrait = `data:image/jpeg;base64,${jpeg.encode({ width: 1, height: 1, data: Buffer.from([100, 100, 100, 255]) }).data.toString("base64")}`;
  for (let i = 1; i <= 21; i++) {
    await store.insert({
      id: `ZR-FRONTEND-${i}`,
      name: `前端测试${i}`,
      gender: "男",
      birthDate: "2005-03",
      ethnicity: "汉族",
      politicalStatus: "共青团员",
      college: "科文学院",
      departmentMajor: "软件工程系",
      className: "软件测试班",
      studentId: String(202600000000 + i),
      phone: String(13800000000 + i),
      qq: String(100000000 + i),
      preferredDepartment: "数据算法部",
      acceptAdjustment: "是",
      availableTime: "周六下午",
      strengths: "测试",
      careerPlan: "学习软件开发",
      photoName: "test.jpg",
      photoData: portrait,
      season: "2026",
      status: "待审核",
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
    });
  }
  const api = attachRecruitmentApi(null, {
    store,
    config: loadRecruitmentConfig({}),
    accounts: [{ username: "frontend-admin", password: "frontend-test-password", role: "president", name: "测试社长" }],
  });
  const server = http.createServer(createHttpHandler({ api, root: path.resolve(__dirname, "../dist") }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  console.log(JSON.stringify({ port: server.address().port }));
  process.stdin.resume();
  process.stdin.on("end", () => {
    server.close(() => {
      // Only the test directory returned by mkdtemp can be removed here.
      if (path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith("zhuoruan-frontend-test-")) {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    });
  });
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
