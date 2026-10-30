// Scoring and per-question statistics. Answers are arrays of option indices.

export const round = (value) => +value.toFixed(2);

export const percent = (score, max) => (max > 0 ? Math.round((Math.max(0, score) / max) * 100) : 0);

function matches(q, answer) {
  if (q.type === 'order') return answer.filter((option, i) => option === q.correct[i]).length;
  return answer.filter((option) => q.correct.includes(option)).length;
}

export function grade(q, answer, { mode, points, penalty, floor }) {
  const perAnswer = mode === 'answer' && q.type !== 'single';
  const max = points * (perAnswer ? q.correct.length : 1);
  if (!answer?.length) return { status: 'skipped', earned: 0, max };

  const hits = matches(q, answer);
  const misses = answer.length - hits;
  const correct = hits === q.correct.length && !misses;
  const raw = perAnswer ? hits * points - misses * penalty : correct ? points : -penalty;
  const partial = perAnswer && hits > 0 && raw >= 0;
  const status = correct ? 'correct' : partial ? 'partial' : 'wrong';
  return { status, earned: floor ? Math.max(0, raw) : raw, max };
}

// Map of question id -> { seen, right, last } across attempts (oldest first).
export function questionStats(attempts) {
  const stats = new Map();
  for (const { items } of attempts) {
    for (const { id, status } of items) {
      const stat = stats.get(id) ?? { seen: 0, right: 0, last: null };
      stat.seen += 1;
      stat.right += status === 'correct' ? 1 : 0;
      stat.last = status;
      stats.set(id, stat);
    }
  }
  return stats;
}

export const isMistake = (stat) => !!stat && stat.last !== 'correct';
