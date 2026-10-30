import { download, h, select } from '../dom.js';
import { DETAILS, FORMATS, SCOPES, buildTable } from '../export.js';
import { percent } from '../grading.js';
import { formatDate, t } from '../i18n.js';
import { attemptsOf } from '../store.js';

const slug = (text) => text.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

// With `attempt` set it exports that attempt, otherwise the totals across all attempts.
export function exportPanel(set, attempt) {
  const scope = select('scope', 'wrong', SCOPES.map((value) => [value, t(`export.scope.${value}`)]));
  const detail = select('detail', 'questions', DETAILS.map((value) => [value, t(`export.detail.${value}`)]));
  const format = select('format', 'txt', Object.keys(FORMATS).map((value) => [value, value.toUpperCase()]));

  function run() {
    const table = buildTable({
      set,
      attempt,
      attempts: attemptsOf(set.id),
      scope: scope.value,
      detail: detail.value,
      t,
    });
    const summary = attempt
      ? `${formatDate(attempt.date)}, ${attempt.score}/${attempt.max} (${percent(attempt.score, attempt.max)}%)`
      : t('export.overall');
    const { render, type } = FORMATS[format.value];
    const name = `${slug(set.title)}-${scope.value}-${detail.value}.${format.value}`;
    download(name, render(table, `${set.title}: ${summary}`), type);
  }

  return h(
    'div',
    { class: 'export' },
    scope,
    detail,
    format,
    h('button', { class: 'button', type: 'button', onClick: run }, t('export.download')),
  );
}
