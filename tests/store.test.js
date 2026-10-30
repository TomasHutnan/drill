import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { addAttempt, attemptsOf, createBackup, load, restoreBackup, save } from '../js/store.js';

function fakeStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test('a backup round-trips progress but leaves device preferences alone', () => {
  addAttempt({ setId: 'a', id: 1 });
  save('imported', [{ id: 'x', text: 't', title: 'T' }]);
  save('options', { a: { time: 5 } });
  save('theme', 'dark');
  const backup = JSON.parse(JSON.stringify(createBackup()));
  assert.deepEqual(Object.keys(backup.data).sort(), ['attempts', 'imported', 'options']);

  globalThis.localStorage = fakeStorage();
  save('theme', 'light');
  addAttempt({ setId: 'b', id: 2 });
  assert.equal(restoreBackup(backup), true);
  assert.deepEqual(attemptsOf('a'), [{ setId: 'a', id: 1 }]);
  assert.deepEqual(attemptsOf('b'), []);
  assert.equal(load('options').a.time, 5);
  assert.equal(load('theme'), 'light');
});

test('keys missing from a backup are cleared', () => {
  save('imported', [{ id: 'x' }]);
  assert.equal(restoreBackup({ app: 'drill', data: {} }), true);
  assert.equal(load('imported'), null);
});

test('invalid backups change nothing', () => {
  addAttempt({ setId: 'a', id: 1 });
  const invalid = [
    null,
    [],
    {},
    { app: 'other', data: {} },
    { app: 'drill' },
    { app: 'drill', data: { attempts: [] } },
    { app: 'drill', data: { attempts: { a: 1 } } },
    { app: 'drill', data: { imported: {} } },
    { app: 'drill', data: { options: [] } },
  ];
  for (const backup of invalid) assert.equal(restoreBackup(backup), false, JSON.stringify(backup));
  assert.equal(attemptsOf('a').length, 1);
});

test('a failed write rolls back to the previous progress', () => {
  addAttempt({ setId: 'a', id: 1 });
  const { setItem } = localStorage;
  let failures = 1;
  localStorage.setItem = (key, value) => {
    if (failures-- > 0) throw new Error('quota');
    setItem(key, value);
  };
  assert.throws(() => restoreBackup({ app: 'drill', data: { attempts: { b: [] } } }), /quota/);
  assert.equal(attemptsOf('a').length, 1);
});
