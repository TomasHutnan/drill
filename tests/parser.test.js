import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseSet } from '../js/parser.js';

const codes = (text) => parseSet(text).errors.map(({ line, code }) => [line, code]);

test('parses all question types', () => {
  const set = parseSet(`title: Demo
# comment

[single] One
continued
- a
* b
> why
> because

[multi] Two
* a
- b
* c

[order] Three
- x
- y
- z
`);
  assert.deepEqual(set.errors, []);
  assert.equal(set.title, 'Demo');
  const [single, multi, order] = set.questions;
  assert.equal(single.text, 'One\ncontinued');
  assert.deepEqual(single.correct, [1]);
  assert.equal(single.explanation, 'why\nbecause');
  assert.deepEqual(multi.correct, [0, 2]);
  assert.deepEqual(order.correct, [0, 1, 2]);
  assert.deepEqual(set.questions.map((q) => q.number), [1, 2, 3]);
});

test('reads settings from the metadata', () => {
  const set = parseSet(`title: Demo
time: 90
penalty: 0.5
floor: yes
shuffleAnswers: false
mode: answer
feedback: immediate

[single] Q
- a
* b
`);
  assert.deepEqual(set.errors, []);
  assert.deepEqual(set.options, {
    time: 90,
    penalty: 0.5,
    floor: true,
    shuffleAnswers: false,
    mode: 'answer',
    feedback: 'immediate',
  });
});

test('rejects unknown settings and invalid values', () => {
  const question = '\n[single] Q\n- a\n* b';
  for (const line of ['nope: 1', 'time: soon', 'penalty: -1', 'floor: maybe', 'mode: exam', 'constructor: x', 'pool: wrong']) {
    assert.deepEqual(codes(line + question), [[1, 'err.metadata']], line);
  }
});

test('handles CRLF, a BOM and option text with symbols', () => {
  const set = parseSet('﻿title: T\r\n[single] Q\r\n- a - b\r\n* c * d\r\n');
  assert.deepEqual(set.errors, []);
  assert.equal(set.title, 'T');
  assert.deepEqual(set.questions[0].options, ['a - b', 'c * d']);
});

test('question ids change only with the question content', () => {
  const id = (text) => parseSet(text).questions[0].id;
  const base = '[single] Q\n- a\n* b';
  assert.equal(id(base), id(`# moved\n\n${base}`));
  assert.notEqual(id(base), id('[single] Q\n* a\n- b'));
});

test('reports errors with line numbers', () => {
  assert.deepEqual(codes(''), [[1, 'err.noQuestions']]);
  assert.deepEqual(codes('stray\n[single] Q\n- a\n* b'), [[1, 'err.outside']]);
  assert.deepEqual(codes('[single] Q\n- a\n* b\nstray'), [[4, 'err.unexpected']]);
  assert.deepEqual(codes('[single] Q\n- a'), [[1, 'err.tooFewOptions']]);
  assert.deepEqual(codes('[single] Q\n* a\n* b'), [[1, 'err.single']]);
  assert.deepEqual(codes('[multi] Q\n- a\n- b'), [[1, 'err.multi']]);
  assert.deepEqual(codes('[order] Q\n* a\n- b'), [[1, 'err.order']]);
  assert.deepEqual(codes('[single]\n- a\n* b'), [[1, 'err.emptyQuestion']]);
});

test('all built-in sets are valid', () => {
  const files = JSON.parse(readFileSync('sets/index.json', 'utf8'));
  for (const file of files) {
    assert.deepEqual(parseSet(readFileSync(`sets/${file}`, 'utf8')).errors, [], file);
  }
});
