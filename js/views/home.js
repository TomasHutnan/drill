import { h } from '../dom.js';
import { isMistake, questionStats } from '../grading.js';
import { t } from '../i18n.js';
import { allSets, getSet, importSet, loadFailed } from '../sets.js';
import { attemptsOf, load } from '../store.js';

const EXAMPLE = `title: My question set

# Optional default settings, before the first question:
time: 60
mode: answer
points: 1
penalty: 0.5
floor: yes
feedback: immediate
shuffleQuestions: yes
shuffleAnswers: no
count: 20

# Lines starting with # are comments.
[single] What is the capital of Slovakia?
- Prague
* Bratislava
- Vienna
> Optional explanation shown after answering.

[multi] Which of these are EU members?
* Slovakia
* Czechia
- Norway

[order] Sort from the smallest to the largest:
- Mouse
- Dog
- Elephant`;

function continueBanner() {
  const session = load('session');
  const set = session && getSet(session.setId);
  if (!set) return null;
  return h(
    'a',
    { class: 'banner', href: '#/quiz' },
    h('strong', null, t('home.continue', { title: set.title })),
    h('span', null, t('quiz.progress', { n: session.pos + 1, total: session.items.length })),
  );
}

function setCard(set) {
  const attempts = attemptsOf(set.id);
  const stats = questionStats(attempts);
  const total = set.questions.length;
  const mastered = set.questions.filter((q) => stats.has(q.id) && !isMistake(stats.get(q.id))).length;
  return h(
    'a',
    { class: 'card set-card', href: `#/set/${encodeURIComponent(set.id)}` },
    h('h2', null, set.title),
    h(
      'p',
      { class: 'muted' },
      t('set.questions', { n: total }),
      ' · ',
      t('set.attempts', { n: attempts.length }),
      set.imported && h('span', { class: 'badge' }, t('set.imported')),
    ),
    h('progress', { max: total, value: mastered, ariaLabel: t('set.mastered', { n: mastered, total }) }),
    h('small', { class: 'muted' }, t('set.mastered', { n: mastered, total })),
  );
}

function importPanel() {
  const errors = h('ul', { class: 'errors' });
  const input = h('input', {
    type: 'file',
    accept: '.txt,text/plain',
    hidden: true,
    onChange: async () => {
      const [file] = input.files;
      input.value = '';
      try {
        const result = await importSet(file);
        errors.replaceChildren(
          ...result.errors.map(({ line, code }) => h('li', null, t('err.line', { line, message: t(code) }))),
        );
        if (!result.errors.length) location.hash = `#/set/${encodeURIComponent(result.id)}`;
      } catch (error) {
        console.error(error);
        errors.replaceChildren(h('li', null, t('err.storage')));
      }
    },
  });
  return h(
    'section',
    { class: 'card stack' },
    h('h2', null, t('home.importTitle')),
    h('p', { class: 'muted' }, t('home.importHint')),
    input,
    h('button', { class: 'button primary', type: 'button', onClick: () => input.click() }, t('home.import')),
    errors,
    h('details', null, h('summary', null, t('home.format')), h('pre', null, EXAMPLE)),
  );
}

export function homeView() {
  const sets = allSets();
  return h(
    'div',
    { class: 'stack' },
    continueBanner(),
    h('h1', null, t('home.title')),
    loadFailed() && h('p', { class: 'errors' }, t('home.loadError')),
    sets.length ? h('div', { class: 'grid' }, sets.map(setCard)) : h('p', { class: 'muted' }, t('home.empty')),
    importPanel(),
  );
}
