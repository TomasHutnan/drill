import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade, isMistake, percent, questionStats } from '../js/grading.js';

const single = { type: 'single', correct: [1] };
const multi = { type: 'multi', correct: [0, 2] };
const order = { type: 'order', correct: [0, 1, 2] };
const perQuestion = { mode: 'question', points: 2, penalty: 1, floor: false };
const perAnswer = { mode: 'answer', points: 1, penalty: 0.5, floor: false };

test('per-question grading is all or nothing', () => {
  assert.deepEqual(grade(single, [1], perQuestion), { status: 'correct', earned: 2, max: 2 });
  assert.deepEqual(grade(single, [0], perQuestion), { status: 'wrong', earned: -1, max: 2 });
  assert.deepEqual(grade(multi, [2, 0], perQuestion), { status: 'correct', earned: 2, max: 2 });
  assert.deepEqual(grade(multi, [0], perQuestion), { status: 'wrong', earned: -1, max: 2 });
  assert.deepEqual(grade(multi, [0, 1, 2], perQuestion), { status: 'wrong', earned: -1, max: 2 });
  assert.deepEqual(grade(order, [0, 2, 1], perQuestion), { status: 'wrong', earned: -1, max: 2 });
});

test('skipped questions score zero even with a penalty', () => {
  assert.deepEqual(grade(single, null, perQuestion), { status: 'skipped', earned: 0, max: 2 });
  assert.deepEqual(grade(multi, [], perQuestion), { status: 'skipped', earned: 0, max: 2 });
});

test('per-answer grading awards partial credit', () => {
  assert.deepEqual(grade(multi, [0, 1], perAnswer), { status: 'partial', earned: 0.5, max: 2 });
  assert.deepEqual(grade(multi, [0, 2], perAnswer), { status: 'correct', earned: 2, max: 2 });
  assert.deepEqual(grade(order, [0, 2, 1], perAnswer), { status: 'partial', earned: 0, max: 3 });
  assert.deepEqual(grade(order, [0, 1, 2], perAnswer), { status: 'correct', earned: 3, max: 3 });
  assert.deepEqual(grade(single, [0], perAnswer), { status: 'wrong', earned: -0.5, max: 1 });
});

test('partial needs a correct answer and a sum that is not negative', () => {
  const harsh = { ...perAnswer, penalty: 2 };
  assert.equal(grade(multi, [0, 1], harsh).status, 'wrong');
  assert.equal(grade(multi, [0, 1], { ...harsh, floor: true }).status, 'wrong');
  assert.equal(grade(multi, [1], { ...perAnswer, penalty: 0 }).status, 'wrong');
  assert.equal(grade(order, [2, 0, 1], { ...perAnswer, penalty: 0 }).status, 'wrong');
  assert.equal(grade(multi, [0], perQuestion).status, 'wrong');
});

test('the floor keeps a question from going negative', () => {
  assert.equal(grade(single, [0], { ...perQuestion, floor: true }).earned, 0);
  assert.equal(grade({ type: 'multi', correct: [0] }, [1, 2], { ...perAnswer, floor: true }).earned, 0);
});

test('percent clamps negative scores and an empty maximum', () => {
  assert.equal(percent(3, 4), 75);
  assert.equal(percent(-1, 4), 0);
  assert.equal(percent(0, 0), 0);
});

test('statistics track the latest result of each question', () => {
  const stats = questionStats([
    { items: [{ id: 'a', status: 'wrong' }, { id: 'b', status: 'correct' }] },
    { items: [{ id: 'a', status: 'correct' }, { id: 'b', status: 'skipped' }] },
  ]);
  assert.deepEqual(stats.get('a'), { seen: 2, right: 1, last: 'correct' });
  assert.equal(isMistake(stats.get('a')), false);
  assert.equal(isMistake(stats.get('b')), true);
  assert.equal(isMistake(stats.get('never seen')), false);
});
