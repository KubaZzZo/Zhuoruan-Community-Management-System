const assert = require("node:assert/strict");
const bank = require("../计算机基础知识题库/questions.json");
const {
  QUIZ_SIZE,
  drawQuestionIds,
  grade,
  isCalculationStem,
  isCorrect,
  publicQuestion,
  questionsByIds,
  quizQuestions,
} = require("../server/questionBank.cjs");

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

runTest("question bank contains 1000 original choice and blank items", () => {
  assert.equal(bank.count, 1000);
  assert.equal(bank.choiceCount, 500);
  assert.equal(bank.blankCount, 500);
  assert.equal(bank.questions.length, 1000);
  const stems = new Set(bank.questions.map((question) => question.stem));
  const ids = new Set(bank.questions.map((question) => question.id));
  assert.equal(stems.size, 1000);
  assert.equal(ids.size, 1000);
  for (const question of bank.questions) {
    if (question.type === "choice") {
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok("ABCD".includes(question.answer));
      assert.equal(question.options["ABCD".indexOf(question.answer)] === undefined, false);
    } else {
      assert.equal(question.type, "blank");
      assert.equal(question.stem.split("____").length, 2);
      assert.ok(String(question.answer).trim());
    }
  }
});

runTest("live quiz draws only non-calculation choices", () => {
  const pool = quizQuestions();
  assert.ok(pool.length >= 50);
  assert.ok(pool.every((question) => question.type === "choice" && !isCalculationStem(question.stem)));
  assert.ok(bank.questions.some((question) => question.type === "blank"));
  assert.ok(bank.questions.some((question) => isCalculationStem(question.stem)));
  const ids = drawQuestionIds();
  assert.equal(ids.length, QUIZ_SIZE);
  assert.equal(new Set(ids).size, QUIZ_SIZE);
  for (const question of questionsByIds(ids)) {
    assert.equal(question.type, "choice");
    assert.equal(isCalculationStem(question.stem), false);
    const hidden = publicQuestion(question);
    assert.equal(Object.prototype.hasOwnProperty.call(hidden, "answer"), false);
    assert.equal(hidden.options.length, 4);
  }
});

runTest("answers are graded without revealing which item failed", () => {
  const choice = bank.questions.find((question) => question.type === "choice");
  const blank = bank.questions.find((question) => question.type === "blank");
  assert.equal(isCorrect(choice, choice.answer.toLowerCase()), true);
  assert.equal(isCorrect(choice, "Z"), false);
  assert.equal(isCorrect(blank, ` ${String(blank.answer).toLowerCase()} `), true);
  assert.equal(isCorrect(blank, `${blank.answer}不对`), false);
  const graded = grade(
    [choice.id, blank.id],
    new Map([
      [choice.id, choice.answer],
      [blank.id, "错误答案"],
    ]),
  );
  assert.equal(graded.correct, 1);
  assert.equal(graded.total, 2);
  assert.deepEqual(graded.answers, [choice.answer, "错误答案"]);
});
