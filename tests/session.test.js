import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSet } from '../js/parser.js';
import { DEFAULTS, createSession, finishSession, mistakes } from '../js/session.js';

const parsed = parseSet(`
[single] One
- a
* b

[multi] Two
* a
* b
- c

[order] Three
- x
- y
`);
const set = { ...parsed, id: 'demo', byId: new Map(parsed.questions.map((q) => [q.id, q])) };
const cfg = { ...DEFAULTS, shuffleQuestions: false, shuffleAnswers: false };

test('ordering questions never start in the solved order', () => {
  for (let i = 0; i < 50; i++) {
    const order = createSession(set, cfg, []).items[2];
    assert.deepEqual(order.opts, [1, 0]);
  }
});

test('the question count limits the session', () => {
  assert.equal(createSession(set, { ...cfg, count: 2 }, []).items.length, 2);
});

test('finishing grades every item, leaving unanswered ones skipped', () => {
  const session = createSession(set, cfg, []);
  session.items[0].answer = [1];
  session.items[1].answer = [0];
  const attempt = finishSession(session, set);
  assert.deepEqual(attempt.items.map((item) => item.status), ['correct', 'wrong', 'skipped']);
  assert.equal(attempt.score, 1);
  assert.equal(attempt.max, 3);
});

test('the mistakes pool only contains questions last answered incorrectly', () => {
  const [one, two] = set.questions;
  const attempts = [
    { items: [{ id: one.id, status: 'wrong' }, { id: two.id, status: 'wrong' }] },
    { items: [{ id: one.id, status: 'correct' }] },
  ];
  assert.deepEqual(mistakes(set, attempts), [two]);
  const session = createSession(set, { ...cfg, pool: 'wrong' }, attempts);
  assert.deepEqual(session.items.map((item) => item.id), [two.id]);
});
