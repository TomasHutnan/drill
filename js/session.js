// Creates quiz sessions and turns finished ones into stored attempts.
import { grade, isMistake, questionStats, round } from './grading.js';

export const DEFAULTS = {
  shuffleQuestions: true,
  shuffleAnswers: true,
  pool: 'all',
  count: 0,
  time: 0,
  feedback: 'end',
  mode: 'question',
  points: 1,
  penalty: 0,
  floor: false,
};

export function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Ordering questions must never start out already solved.
function scramble(list) {
  let result;
  do result = shuffle(list);
  while (result.every((value, i) => value === list[i]));
  return result;
}

export function mistakes(set, attempts) {
  const stats = questionStats(attempts);
  return set.questions.filter((q) => isMistake(stats.get(q.id)));
}

export function createSession(set, cfg, attempts) {
  let pool = cfg.pool === 'wrong' ? mistakes(set, attempts) : set.questions;
  if (cfg.shuffleQuestions) pool = shuffle(pool);
  if (cfg.count) pool = pool.slice(0, cfg.count);

  const items = pool.map((q) => {
    const indices = q.options.map((_, i) => i);
    const opts = q.type === 'order' ? scramble(indices) : cfg.shuffleAnswers ? shuffle(indices) : indices;
    return { id: q.id, opts, answer: null, checked: false };
  });
  return { setId: set.id, cfg, items, pos: 0, left: cfg.time || null, paused: false };
}

export function finishSession(session, set) {
  const items = session.items.map(({ id, answer }) => ({
    id,
    answer,
    ...grade(set.byId.get(id), answer, session.cfg),
  }));
  return {
    id: Date.now(),
    setId: set.id,
    date: new Date().toISOString(),
    cfg: session.cfg,
    items,
    score: round(items.reduce((sum, item) => sum + item.earned, 0)),
    max: round(items.reduce((sum, item) => sum + item.max, 0)),
  };
}
