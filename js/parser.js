// Parses the plain-text question format documented in README.md.

const HEADER = /^\[(single|multi|order)\]\s*(.*)$/i;
const OPTION = /^([-*])\s+(.+)$/;
const EXPLANATION = /^>\s*(.*)$/;
const METADATA = /^(\w+):\s*(.+)$/;

// Settings a set file may preset in its metadata: a value type or the allowed values.
const OPTIONS = {
  __proto__: null,
  shuffleQuestions: 'boolean',
  shuffleAnswers: 'boolean',
  floor: 'boolean',
  count: 'number',
  time: 'number',
  points: 'number',
  penalty: 'number',
  feedback: ['end', 'immediate'],
  mode: ['question', 'answer'],
};
const BOOLEANS = { __proto__: null, yes: true, true: true, no: false, false: false };

function parseOption(key, value) {
  const kind = OPTIONS[key];
  if (kind === 'boolean') return BOOLEANS[value.toLowerCase()];
  if (kind === 'number') {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }
  return kind?.includes(value) ? value : undefined;
}

export function hash(text) {
  let h = 0x811c9dc5;
  for (const char of text) h = Math.imul(h ^ char.codePointAt(0), 16777619);
  return (h >>> 0).toString(36);
}

function validate(q) {
  if (!q.text) return 'err.emptyQuestion';
  if (q.options.length < 2) return 'err.tooFewOptions';
  if (q.type === 'single' && q.correct.length !== 1) return 'err.single';
  if (q.type === 'multi' && !q.correct.length) return 'err.multi';
  if (q.type === 'order' && q.correct.length) return 'err.order';
}

export function parseSet(text) {
  const set = { title: '', options: {}, questions: [], errors: [] };
  const fail = (line, code) => set.errors.push({ line, code });
  let q = null;

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const no = index + 1;
    if (!line || line.startsWith('#')) return;

    const header = line.match(HEADER);
    if (header) {
      q = { type: header[1].toLowerCase(), text: header[2], options: [], correct: [], explanation: '', line: no };
      set.questions.push(q);
      return;
    }
    if (!q) {
      const metadata = line.match(METADATA);
      if (!metadata) {
        fail(no, 'err.outside');
      } else if (metadata[1] === 'title') {
        set.title ||= metadata[2];
      } else {
        const value = parseOption(metadata[1], metadata[2]);
        if (value === undefined) fail(no, 'err.metadata');
        else set.options[metadata[1]] = value;
      }
      return;
    }

    const option = line.match(OPTION);
    const explanation = line.match(EXPLANATION);
    if (option) {
      if (option[1] === '*') q.correct.push(q.options.length);
      q.options.push(option[2]);
    } else if (explanation) {
      q.explanation = [q.explanation, explanation[1]].filter(Boolean).join('\n');
    } else if (!q.options.length) {
      q.text = [q.text, line].filter(Boolean).join('\n');
    } else {
      fail(no, 'err.unexpected');
    }
  });

  set.questions.forEach((question, index) => {
    const error = validate(question);
    if (error) fail(question.line, error);
    if (question.type === 'order') question.correct = question.options.map((_, i) => i);
    question.number = index + 1;
    question.id = hash(JSON.stringify([question.type, question.text, question.options, question.correct]));
  });
  if (!set.questions.length) fail(1, 'err.noQuestions');
  set.errors.sort((a, b) => a.line - b.line);
  return set;
}
