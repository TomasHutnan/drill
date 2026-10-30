// Entry point: navbar controls and hash routing.
import { homeView } from './views/home.js';
import { quizView } from './views/quiz.js';
import { resultsView } from './views/results.js';
import { setView } from './views/set.js';
import { download, h } from './dom.js';
import { LANGS, currentLang, initI18n, setLang, t } from './i18n.js';
import { loadSets } from './sets.js';
import { createBackup, load, restoreBackup, save } from './store.js';

const THEMES = ['system', 'light', 'dark'];

const routes = [
  [/^#?\/?$/, homeView],
  [/^#\/set\/([^/]+)$/, setView],
  [/^#\/quiz$/, quizView],
  [/^#\/result\/([^/]+)\/(\d+)$/, resultsView],
];

const main = document.querySelector('main');
const backupButton = document.querySelector('#backup');
const restoreButton = document.querySelector('#restore');
const restoreFile = document.querySelector('#restore-file');
const themeButton = document.querySelector('#theme');
const langLabel = document.querySelector('#lang-label');
const langSelect = document.querySelector('#lang');

function setLabel(el, label) {
  el.title = label;
  el.ariaLabel = label;
}

function render() {
  const route = routes.find(([pattern]) => pattern.test(location.hash));
  if (!route) {
    location.hash = '#/';
    return;
  }
  const params = location.hash.match(route[0]).slice(1).map(decodeURIComponent);
  main.replaceChildren(route[1](...params) ?? '');
}

function renderChrome() {
  const theme = load('theme', 'system');
  document.documentElement.dataset.theme = theme;
  setLabel(backupButton, t('nav.backup'));
  setLabel(restoreButton, t('nav.restore'));
  setLabel(themeButton, t('nav.theme', { name: t(`theme.${theme}`) }));
  setLabel(langLabel, t('nav.language'));
  setLabel(langSelect, t('nav.language'));
  langSelect.value = currentLang();
}

backupButton.addEventListener('click', () => {
  const date = new Date().toISOString().slice(0, 10);
  download(`drill-backup-${date}.json`, JSON.stringify(createBackup()), 'application/json');
});

restoreButton.addEventListener('click', () => restoreFile.click());

restoreFile.addEventListener('change', async () => {
  const [file] = restoreFile.files;
  restoreFile.value = '';
  if (!confirm(t('restore.confirm'))) return;
  try {
    if (restoreBackup(JSON.parse(await file.text()))) location.reload();
    else alert(t('restore.invalid'));
  } catch (error) {
    console.error(error);
    alert(t('restore.invalid'));
  }
});

themeButton.addEventListener('click', () => {
  const theme = load('theme', 'system');
  save('theme', THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
  renderChrome();
});

langSelect.addEventListener('change', async () => {
  await setLang(langSelect.value);
  renderChrome();
  render();
});

window.addEventListener('hashchange', render);

await Promise.all([initI18n(), loadSets()]);
langSelect.append(...Object.entries(LANGS).map(([value, label]) => h('option', { value }, label)));
renderChrome();
render();
