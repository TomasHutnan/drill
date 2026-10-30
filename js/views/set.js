import { check, field, h, select } from '../dom.js';
import { percent } from '../grading.js';
import { formatDate, t } from '../i18n.js';
import { DEFAULTS, createSession, mistakes } from '../session.js';
import { deleteImported, getSet } from '../sets.js';
import { attemptsOf, clearAttempts, load, save } from '../store.js';
import { exportPanel } from './exportPanel.js';
import { startQuiz } from './quiz.js';

const number = (name, value, props) => h('input', { type: 'number', name, value, min: 0, ...props });

function readOptions(form) {
  const data = new FormData(form);
  const cfg = {};
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (typeof fallback === 'boolean') cfg[key] = data.has(key);
    else if (typeof fallback === 'number') cfg[key] = Math.max(0, Number(data.get(key)) || 0);
    else cfg[key] = data.get(key);
  }
  return cfg;
}

function optionsForm(set, attempts) {
  const cfg = { ...DEFAULTS, ...set.options, ...load('options', {})[set.id], pool: 'all' };
  const hasMistakes = mistakes(set, attempts).length > 0;
  return h(
    'form',
    {
      class: 'card stack',
      onSubmit: (event) => {
        event.preventDefault();
        const options = readOptions(event.target);
        save('options', { ...load('options', {}), [set.id]: options });
        startQuiz(createSession(set, options, attempts));
      },
    },
    h('h2', null, t('setup.title')),
    h(
      'div',
      { class: 'fields' },
      field(
        t('setup.pool'),
        select('pool', 'all', [
          ['all', t('setup.poolAll')],
          ['wrong', t('setup.poolWrong'), !hasMistakes],
        ]),
      ),
      field(t('setup.count'), number('count', Math.min(cfg.count, set.questions.length) || '', { max: set.questions.length, placeholder: t('setup.countAll') })),
      field(t('setup.time'), number('time', cfg.time || '', { placeholder: t('setup.timeOff') })),
      field(
        t('setup.feedback'),
        select('feedback', cfg.feedback, [
          ['end', t('setup.feedbackEnd')],
          ['immediate', t('setup.feedbackNow')],
        ]),
      ),
    ),
    h(
      'div',
      { class: 'checks' },
      check('shuffleQuestions', t('setup.shuffleQuestions'), cfg.shuffleQuestions),
      check('shuffleAnswers', t('setup.shuffleAnswers'), cfg.shuffleAnswers),
    ),
    h('h3', null, t('setup.grading')),
    h(
      'div',
      { class: 'fields' },
      field(
        t('setup.mode'),
        select('mode', cfg.mode, [
          ['question', t('setup.modeQuestion')],
          ['answer', t('setup.modeAnswer')],
        ]),
      ),
      field(t('setup.points'), number('points', cfg.points, { step: 0.25, required: true })),
      field(t('setup.penalty'), number('penalty', cfg.penalty, { step: 0.25, required: true })),
    ),
    h('div', { class: 'checks' }, check('floor', t('setup.floor'), cfg.floor)),
    h('p', { class: 'muted' }, t('setup.modeHint')),
    h('button', { class: 'button primary', type: 'submit' }, t('setup.start')),
  );
}

function history(set, attempts) {
  if (!attempts.length) return null;
  const rows = attempts.toReversed().map((attempt) =>
    h(
      'tr',
      null,
      h('td', null, h('a', { href: `#/result/${encodeURIComponent(set.id)}/${attempt.id}` }, formatDate(attempt.date))),
      h('td', null, `${attempt.score} / ${attempt.max}`),
      h('td', null, `${percent(attempt.score, attempt.max)}%`),
    ),
  );
  return h(
    'section',
    { class: 'card stack' },
    h('h2', null, t('set.history')),
    h('div', { class: 'scroll' }, h('table', null, h('tbody', null, rows))),
    h('h3', null, t('export.title')),
    exportPanel(set, null),
    h(
      'button',
      {
        class: 'button danger',
        type: 'button',
        onClick: () => {
          if (!confirm(t('set.clearConfirm'))) return;
          clearAttempts(set.id);
          dispatchEvent(new HashChangeEvent('hashchange'));
        },
      },
      t('set.clear'),
    ),
  );
}

export function setView(id) {
  const set = getSet(id);
  if (!set) {
    location.hash = '#/';
    return null;
  }
  const attempts = attemptsOf(id);
  return h(
    'div',
    { class: 'stack' },
    h('a', { class: 'muted', href: '#/' }, `← ${t('nav.back')}`),
    h('h1', null, set.title),
    h('p', { class: 'muted' }, t('set.questions', { n: set.questions.length })),
    optionsForm(set, attempts),
    history(set, attempts),
    set.imported &&
      h(
        'button',
        {
          class: 'button danger',
          type: 'button',
          onClick: () => {
            if (!confirm(t('set.deleteConfirm'))) return;
            deleteImported(id);
            location.hash = '#/';
          },
        },
        t('set.delete'),
      ),
  );
}
