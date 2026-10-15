const fs = require("node:fs");
const path = require("node:path");
const { randomInt } = require("node:crypto");

const QUIZ_SIZE = 5;
const bankPath = path.join(__dirname, "../计算机基础知识题库/questions.json");

let bank;

function loadBank() {
  if (bank) return bank;
  const parsed = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  if (!Array.isArray(parsed.questions) || parsed.questions.length < QUIZ_SIZE) {
    throw new Error("题库不可用");
  }
  bank = {
    questions: parsed.questions,
    byId: new Map(parsed.questions.map((question) => [question.id, question])),
  };
  return bank;
}

function isCalculationStem(stem) {
  return (
    /^十进制数 .+ 转换成(?:二进制|八进制|十六进制)是/.test(stem) ||
    /^把十进制整数 .+ 写成二进制/.test(stem) ||
    /^二进制 .+ 与 .+ 相加/.test(stem) ||
    /^2的\d+次方等于/.test(stem) ||
    /^十进制 -?\d+ 的\d+位补码是/.test(stem) ||
    /^逻辑(?:与非|或非|异或|与|或)运算中，/.test(stem) ||
    /^GB2312中，区号/.test(stem) ||
    /^一幅 .+未压缩的位图约占/.test(stem) ||
    /^采样率 .+未压缩音频约占/.test(stem) ||
    /^按1024进位，/.test(stem) ||
    /^任意二叉树中，若度为2的结点数为 /.test(stem) ||
    /^根结点深度记为1时，深度为 /.test(stem)
  );
}
function quizQuestions() {
  const pool = loadBank().questions.filter(
    (question) => question.type === "choice" && !isCalculationStem(question.stem),
  );
  if (pool.length < QUIZ_SIZE) throw new Error("可用于抽题的选择题不足");
  return pool;
}
function drawQuestionIds(size = QUIZ_SIZE) {
  const ids = quizQuestions().map((question) => question.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }
  return ids.slice(0, size);
}

function questionsByIds(ids) {
  const { byId } = loadBank();
  return ids.map((id) => {
    const question = byId.get(Number(id));
    if (!question) throw new Error(`题库缺少第 ${id} 题`);
    return question;
  });
}

function publicQuestion(question) {
  const item = {
    id: question.id,
    type: question.type,
    topic: question.topic,
    stem: question.stem,
  };
  if (question.type === "choice") item.options = question.options.slice();
  return item;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isCorrect(question, response) {
  if (question.type === "choice")
    return (
      String(response ?? "")
        .trim()
        .toUpperCase() === question.answer
    );
  return normalizeText(response) === normalizeText(question.answer);
}

function grade(ids, responses) {
  const questions = questionsByIds(ids);
  let correct = 0;
  const answers = questions.map((question) => {
    const value = String(responses.get(question.id) ?? "").trim();
    if (isCorrect(question, value)) correct += 1;
    return value;
  });
  return { correct, total: questions.length, answers };
}

module.exports = {
  QUIZ_SIZE,
  isCalculationStem,
  quizQuestions,
  drawQuestionIds,
  questionsByIds,
  publicQuestion,
  isCorrect,
  grade,
  normalizeText,
};
