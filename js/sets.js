// Registry of question sets: built-in ones from sets/ plus imported ones.
import { hash, parseSet } from './parser.js';
import { clearAttempts, load, save } from './store.js';

const sets = new Map();
let failed = false;

function register(id, text, fallbackTitle, imported) {
  const parsed = parseSet(text);
  if (!parsed.errors.length) {
    const byId = new Map(parsed.questions.map((q) => [q.id, q]));
    sets.set(id, { ...parsed, id, title: parsed.title || fallbackTitle, imported, byId });
  }
  return parsed.errors;
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

export async function loadSets() {
  try {
    const files = JSON.parse(await fetchText('sets/index.json'));
    const texts = await Promise.all(files.map((file) => fetchText(`sets/${file}`)));
    files.forEach((file, i) => {
      const errors = register(file, texts[i], file.replace(/\.txt$/, ''), false);
      if (errors.length) throw new Error(`${file}: ${JSON.stringify(errors)}`);
    });
  } catch (error) {
    failed = true;
    console.error(error);
  }
  for (const { id, text, title } of load('imported', [])) register(id, text, title, true);
}

export const loadFailed = () => failed;
export const allSets = () => [...sets.values()];
export const getSet = (id) => sets.get(id);

// Returns parse errors; on success the set is available under the returned id.
export async function importSet(file) {
  const text = await file.text();
  const id = `import-${hash(text)}`;
  const title = file.name.replace(/\.\w+$/, '');
  const errors = register(id, text, title, true);
  if (!errors.length) {
    save('imported', [...load('imported', []).filter((set) => set.id !== id), { id, text, title }]);
  }
  return { id, errors };
}

export function deleteImported(id) {
  save('imported', load('imported', []).filter((set) => set.id !== id));
  clearAttempts(id);
  sets.delete(id);
}
