// Builds exportable tables from results and serializes them to each file format.
import { isMistake, percent, questionStats, round } from './grading.js';

export const SCOPES = ['wrong', 'all'];
export const DETAILS = ['numbers', 'questions', 'full'];

export function answerText(q, answer) {
  return (answer ?? []).map((i) => q.options[i]).join(q.type === 'order' ? ' → ' : '; ');
}

function attemptRows(set, attempt, scope, t) {
  return attempt.items
    .filter((item) => set.byId.has(item.id) && (scope === 'all' || item.status !== 'correct'))
    .map((item) => {
      const q = set.byId.get(item.id);
      return {
        number: q.number,
        question: q.text,
        result: t(`status.${item.status}`),
        answer: answerText(q, item.answer),
        correct: answerText(q, q.correct),
        points: `${round(item.earned)}/${round(item.max)}`,
      };
    });
}

function overallRows(set, attempts, scope, t) {
  const stats = questionStats(attempts);
  return set.questions
    .filter((q) => scope === 'all' || isMistake(stats.get(q.id)))
    .map((q) => {
      const { seen = 0, right = 0, last } = stats.get(q.id) ?? {};
      return {
        number: q.number,
        question: q.text,
        seen,
        right,
        rate: `${percent(right, seen)}%`,
        last: last ? t(`status.${last}`) : '',
      };
    });
}

// `attempt` is optional: without it the table covers every attempt of the set.
export function buildTable({ set, attempt, attempts, scope, detail, t }) {
  const rows = attempt ? attemptRows(set, attempt, scope, t) : overallRows(set, attempts, scope, t);
  rows.sort((a, b) => a.number - b.number);
  const full = attempt ? ['result', 'answer', 'correct', 'points'] : ['seen', 'right', 'rate', 'last'];
  const keys = ['number', ...(detail === 'numbers' ? [] : ['question']), ...(detail === 'full' ? full : [])];
  return { columns: keys.map((key) => ({ key, label: t(`col.${key}`) })), rows };
}

const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
const mdCell = (value) => String(value).replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ');

export const FORMATS = {
  txt: {
    type: 'text/plain',
    render({ columns, rows }, title) {
      const body =
        columns.length === 1
          ? rows.map((row) => row[columns[0].key]).join(', ')
          : rows.map((row) => columns.map(({ key, label }) => `${label}: ${row[key]}`).join('\n')).join('\n\n');
      return `${title}\n\n${body}\n`;
    },
  },
  md: {
    type: 'text/markdown',
    render({ columns, rows }, title) {
      const line = (cells) => `| ${cells.map(mdCell).join(' | ')} |`;
      const table = [
        line(columns.map((column) => column.label)),
        line(columns.map(() => '---')),
        ...rows.map((row) => line(columns.map(({ key }) => row[key]))),
      ];
      return `# ${title}\n\n${table.join('\n')}\n`;
    },
  },
  csv: {
    type: 'text/csv',
    render({ columns, rows }) {
      const lines = [columns.map(({ label }) => label), ...rows.map((row) => columns.map(({ key }) => row[key]))];
      // The BOM makes Excel read the file as UTF-8.
      return `﻿${lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')}\r\n`;
    },
  },
  json: {
    type: 'application/json',
    render({ rows, columns }) {
      const picked = rows.map((row) => Object.fromEntries(columns.map(({ key }) => [key, row[key]])));
      return `${JSON.stringify(picked, null, 2)}\n`;
    },
  },
};
