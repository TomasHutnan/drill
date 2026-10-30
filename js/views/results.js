import { cls, h } from '../dom.js';
import { answerText } from '../export.js';
import { percent, round } from '../grading.js';
import { formatDate, t } from '../i18n.js';
import { createSession, mistakes } from '../session.js';
import { getSet } from '../sets.js';
import { attemptsOf } from '../store.js';
import { exportPanel } from './exportPanel.js';
import { startQuiz } from './quiz.js';

function reviewItem(q, item) {
  return h(
    'li',
    { class: cls('review', item.status) },
    h(
      'p',
      { class: 'muted' },
      `#${q.number} · ${t(`status.${item.status}`)} · ${round(item.earned)} / ${round(item.max)}`,
    ),
    h('p', { class: 'text' }, h('strong', null, q.text)),
    item.status !== 'correct' &&
      h('p', null, `${t('col.answer')}: ${answerText(q, item.answer) || t('status.skipped')}`),
    item.status !== 'correct' && h('p', null, `${t('col.correct')}: ${answerText(q, q.correct)}`),
    q.explanation && h('p', { class: 'muted text' }, q.explanation),
  );
}

export function resultsView(setId, attemptId) {
  const set = getSet(setId);
  const attempts = attemptsOf(setId);
  const attempt = attempts.find(({ id }) => id === Number(attemptId));
  if (!set || !attempt) {
    location.hash = '#/';
    return null;
  }

  const count = (status) => attempt.items.filter((item) => item.status === status).length;
  const hasMistakes = mistakes(set, attempts).length > 0;
  const known = attempt.items.filter((item) => set.byId.has(item.id));
  const retryMistakes = () => {
    const cfg = { ...attempt.cfg, pool: 'wrong', count: 0 };
    startQuiz(createSession(set, cfg, attempts));
  };

  return h(
    'div',
    { class: 'stack' },
    h('a', { class: 'muted', href: `#/set/${encodeURIComponent(setId)}` }, `← ${set.title}`),
    h('h1', null, t('results.title')),
    h('p', { class: 'muted' }, formatDate(attempt.date)),
    h(
      'section',
      { class: 'card score' },
      h('strong', { class: 'score-value' }, `${percent(attempt.score, attempt.max)}%`),
      h('span', null, t('results.points', { score: attempt.score, max: attempt.max })),
      h(
        'span',
        { class: 'muted' },
        ['correct', 'partial', 'wrong', 'skipped']
          .filter(count)
          .map((status) => `${t(`status.${status}`)}: ${count(status)}`)
          .join(' · '),
      ),
      hasMistakes && h('button', { class: 'button primary', type: 'button', onClick: retryMistakes }, t('results.retry')),
    ),
    h('section', { class: 'card stack' }, h('h2', null, t('export.title')), exportPanel(set, attempt)),
    h('h2', null, t('results.review')),
    h(
      'ol',
      { class: 'review-list' },
      known.map((item) => reviewItem(set.byId.get(item.id), item)),
    ),
  );
}
