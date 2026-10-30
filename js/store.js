// Thin wrapper around localStorage; all progress lives here.
const PREFIX = 'drill.';
const MAX_ATTEMPTS = 100; // per set, to stay within the storage quota
const BACKUP_KEYS = ['attempts', 'imported', 'options'];

export function load(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export const save = (key, value) => localStorage.setItem(PREFIX + key, JSON.stringify(value));

export const remove = (key) => localStorage.removeItem(PREFIX + key);

export const attemptsOf = (setId) => load('attempts', {})[setId] ?? [];

export function addAttempt(attempt) {
  const all = load('attempts', {});
  all[attempt.setId] = [...(all[attempt.setId] ?? []), attempt].slice(-MAX_ATTEMPTS);
  save('attempts', all);
}

export function clearAttempts(setId) {
  const all = load('attempts', {});
  delete all[setId];
  save('attempts', all);
}

export function createBackup() {
  const data = Object.fromEntries(BACKUP_KEYS.map((key) => [key, load(key)]).filter(([, value]) => value != null));
  return { app: 'drill', version: 1, data };
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function isValidBackup(backup) {
  if (backup?.app !== 'drill' || !isRecord(backup.data)) return false;
  const { attempts = {}, imported = [], options = {} } = backup.data;
  return (
    isRecord(attempts) && Object.values(attempts).every(Array.isArray) && Array.isArray(imported) && isRecord(options)
  );
}

function writeBackup(data) {
  for (const key of BACKUP_KEYS) {
    if (key in data) save(key, data[key]);
    else remove(key);
  }
}

// Replaces the saved progress. Returns false, changing nothing, if the backup is invalid.
export function restoreBackup(backup) {
  if (!isValidBackup(backup)) return false;
  const previous = createBackup().data;
  try {
    writeBackup(backup.data);
    return true;
  } catch (error) {
    writeBackup(previous);
    throw error;
  }
}
