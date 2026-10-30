import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORMATS, buildTable } from '../js/export.js';
import { parseSet } from '../js/parser.js';

const parsed = parseSet(`
[single] One, "quoted"
- a
* b

[multi] Two | piped
* a
* b

[order] Three
- x
- y
`);
const set = { ...parsed, byId: new Map(parsed.questions.map((q) => [q.id, q])) };
const [one, two, three] = set.questions;
const attempt = {
  items: [
    { id: three.id, answer: [1, 0], status: 'wrong', earned: 0, max: 1 },
    { id: one.id, answer: [1], status: 'correct', earned: 1, max: 1 },
    { id: two.id, answer: null, status: 'skipped', earned: 0, max: 1 },
  ],
};
const t = (key) => key;
const table = (options) => buildTable({ set, attempt, attempts: [attempt], t, ...options });

test('mistakes include wrong and skipped questions, sorted by number', () => {
  const { rows, columns } = table({ scope: 'wrong', detail: 'numbers' });
  assert.deepEqual(rows.map((row) => row.number), [2, 3]);
  assert.deepEqual(columns.map(({ key }) => key), ['number']);
});

test('detail levels add columns', () => {
  const keys = (detail) => table({ scope: 'all', detail }).columns.map(({ key }) => key);
  assert.deepEqual(keys('questions'), ['number', 'question']);
  assert.deepEqual(keys('full'), ['number', 'question', 'result', 'answer', 'correct', 'points']);
});

test('answers are written out as text', () => {
  const row = table({ scope: 'all', detail: 'full' }).rows[2];
  assert.equal(row.answer, 'y → x');
  assert.equal(row.correct, 'x → y');
});

test('the overall table reports totals for every question', () => {
  const { rows } = table({ attempt: null, scope: 'all', detail: 'full' });
  assert.deepEqual(rows[0], {
    number: 1,
    question: one.text,
    seen: 1,
    right: 1,
    rate: '100%',
    last: 'status.correct',
  });
});

test('every format serializes safely', () => {
  const data = table({ scope: 'all', detail: 'questions' });
  assert.equal(FORMATS.txt.render(table({ scope: 'wrong', detail: 'numbers' }), 'T'), 'T\n\n2, 3\n');
  assert.ok(FORMATS.csv.render(data).includes('"One, ""quoted"""'));
  assert.ok(FORMATS.md.render(data, 'T').includes('Two \\| piped'));
  assert.equal(JSON.parse(FORMATS.json.render(data))[2].question, 'Three');
});
