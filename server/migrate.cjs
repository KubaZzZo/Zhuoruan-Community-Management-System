const { loadLocalEnv } = require("./env.cjs");
const { createMysqlPool } = require("./mysqlStore.cjs");

async function main() {
  loadLocalEnv();
  const pool = await createMysqlPool({ migrate: true });
  await pool.end();
  console.log("数据库结构迁移完成。现在可以运行 npm run dev 或 npm start。");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
