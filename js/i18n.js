// To add a language: drop a locales/<code>.json file and list it here.
import { load, save } from './store.js';

export const LANGS = { en: 'English', sk: 'Slovenčina', cs: 'Čeština', uk: 'Українська' };

let lang = 'en';
let strings = {};
let fallback = {};

const fetchLocale = async (code) => (await fetch(`locales/${code}.json`)).json();

export const currentLang = () => lang;

export async function setLang(code) {
  lang = code;
  strings = code === 'en' ? fallback : await fetchLocale(code);
  document.documentElement.lang = code;
  save('lang', code);
}

export async function initI18n() {
  fallback = await fetchLocale('en');
  const browser = navigator.language.slice(0, 2);
  await setLang(load('lang') ?? (browser in LANGS ? browser : 'en'));
}

export function t(key, params = {}) {
  const text = strings[key] ?? fallback[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
