// Minimal DOM helpers. Text always goes through text nodes, so imported content cannot inject markup.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  el.append(...children.flat().filter((child) => child != null && child !== false));
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in el) el[key] = value;
    else if (value != null && value !== false) el.setAttribute(key, value);
  }
  return el;
}

export const cls = (...names) => names.filter(Boolean).join(' ');

export const field = (label, control) => h('label', { class: 'field' }, h('span', null, label), control);

export const check = (name, label, checked) =>
  h('label', { class: 'check' }, h('input', { type: 'checkbox', name, checked }), h('span', null, label));

export const select = (name, value, options) =>
  h('select', { name, value }, options.map(([v, label, disabled]) => h('option', { value: v, disabled: !!disabled }, label)));

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  h('a', { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url));
}
