import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseSet } from '../js/parser.js';

const read = (file) => readFileSync(new URL(`../sets/${file}`, import.meta.url), 'utf8');
const ABSOLUTE = /\b(always|never|only|all|every|must)\b/i;

// Score of ticking every option of each multi question, with penalty 1 and floor.
function tickAllShare(questions) {
  const multi = questions.filter((q) => q.type === 'multi');
  const earned = multi.reduce((sum, q) => sum + Math.max(0, 2 * q.correct.length - q.options.length), 0);
  return earned / multi.reduce((sum, q) => sum + q.correct.length, 0);
}

// Share of single questions where the strictly longest option is the correct one.
function pickLongestShare(questions) {
  const single = questions.filter((q) => q.type === 'single');
  const wins = single.filter((q) => {
    const lengths = q.options.map((option) => option.length);
    const longest = Math.max(...lengths);
    return lengths[q.correct[0]] === longest && lengths.filter((length) => length === longest).length === 1;
  });
  return wins.length / single.length;
}

// Share of absolute wording found in wrong options, across single questions.
function absolutesInWrongOptions(questions) {
  const options = questions
    .filter((q) => q.type === 'single')
    .flatMap((q) => q.options.map((text, i) => ({ text, correct: q.correct.includes(i) })))
    .filter(({ text }) => ABSOLUTE.test(text));
  return options.filter(({ correct }) => !correct).length / options.length;
}

test('every built-in set parses', () => {
  for (const file of JSON.parse(read('index.json'))) {
    assert.deepEqual(parseSet(read(file)).errors, [], file);
  }
});

test('pb007 has no duplicate questions', () => {
  const { questions } = parseSet(read('pb007.txt'));
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
});

test('pb007 cannot be passed by test-taking tricks', () => {
  const { questions } = parseSet(read('pb007.txt'));
  assert.ok(tickAllShare(questions) < 0.2, `tick all: ${tickAllShare(questions)}`);
  assert.ok(pickLongestShare(questions) < 0.35, `pick longest: ${pickLongestShare(questions)}`);
  assert.ok(absolutesInWrongOptions(questions) < 0.8, `absolutes: ${absolutesInWrongOptions(questions)}`);
});
