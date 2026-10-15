const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");

async function main() {
  const sourceFile = path.join(__dirname, "src/recruitment.js");
  const outputFile = path.join(__dirname, "src/recruitment.cjs");
  const source = fs.readFileSync(sourceFile, "utf8").replaceAll("\r\n", "\n");
  const names = [...source.matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]);
  if (!names.length) throw new Error("未找到业务规则导出");
  const body = source.replace(/^\/\/[^\n]*\n/, "").replace(/^export /gm, "");
  const generated = `// 由 sync-recruitment.cjs 从 recruitment.js 生成，请勿直接编辑。\n${body}\nmodule.exports = { ${names.join(", ")} };\n`;
  const options = await prettier.resolveConfig(sourceFile);
  const formatted = await prettier.format(generated, { ...options, filepath: outputFile });
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(outputFile, "utf8").replaceAll("\r\n", "\n") !== formatted) {
      throw new Error("业务规则生成文件已过期，请运行 npm run sync:logic。");
    }
  } else fs.writeFileSync(outputFile, formatted);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
