import { cls, h } from '../dom.js';
import { answerText } from '../export.js';
import { grade, round } from '../grading.js';
import { t } from '../i18n.js';
import { finishSession } from '../session.js';
import { getSet } from '../sets.js';
import { addAttempt, load, remove, save } from '../store.js';

let justStarted = false;

export function startQuiz(session) {
  justStarted = true;
  save('session', session);
  location.hash = '#/quiz';
}

const clock = (seconds) => {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

export function quizView() {
  const s = load('session');
  const set = s && getSet(s.setId);
  if (set) s.items = s.items.filter((item) => set.byId.has(item.id));
  if (!set || !s.items.length) {
    remove('session');
    location.hash = '#/';
    return null;
  }

  // A running timer does not survive leaving the page, so coming back starts paused.
  s.paused = s.left != null && !justStarted;
  justStarted = false;

  const root = h('section', { class: 'quiz stack' });
  const immediate = s.cfg.feedback === 'immediate';
  const canGoBack = !s.cfg.time && !immediate;
  const persist = () => save('session', s);
  const current = () => s.items[s.pos];
  const question = () => set.byId.get(current().id);
  const isLast = () => s.pos === s.items.length - 1;

  function finish() {
    const attempt = finishSession(s, set);
    addAttempt(attempt);
    remove('session');
    location.hash = `#/result/${encodeURIComponent(set.id)}/${attempt.id}`;
  }

  function go(pos) {
    s.pos = pos;
    s.left = s.cfg.time || null;
    persist();
    draw();
    scrollTo(0, 0);
  }

  function reveal() {
    current().checked = true;
    s.left = null;
    persist();
    draw();
  }

  const advance = () => (isLast() ? finish() : go(s.pos + 1));

  function primaryAction() {
    if (immediate && !current().checked) reveal();
    else advance();
  }

  function setPaused(paused) {
    s.paused = paused;
    persist();
    draw();
  }

  function pick(option, selected) {
    const item = current();
    if (question().type === 'multi') {
      const answer = (item.answer ?? []).filter((other) => other !== option);
      item.answer = selected ? [...answer, option] : answer;
    } else {
      item.answer = [option];
    }
    persist();
  }

  function setOrder(order) {
    current().answer = order;
    persist();
    draw();
  }

  function move(index, delta) {
    const item = current();
    const order = [...(item.answer ?? item.opts)];
    const key = `${order[index]}:${delta}`;
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    setOrder(order);
    root.querySelector(`[data-move="${key}"]`)?.focus();
  }

  function drag(event) {
    const item = current();
    if (item.checked || event.button || event.target.closest('button')) return;
    const row = event.currentTarget;
    const list = row.parentElement;
    const middle = (el) => {
      const { top, height } = el.getBoundingClientRect();
      return top + height / 2;
    };

    // The siblings move around the row: moving the row itself would release the pointer capture.
    function onMove({ clientY }) {
      let other;
      while ((other = row.previousElementSibling) && clientY < middle(other)) list.insertBefore(other, row.nextElementSibling);
      while ((other = row.nextElementSibling) && clientY > middle(other)) list.insertBefore(other, row);
    }

    function onUp() {
      const order = [...list.children].map((el) => Number(el.dataset.option));
      if (order.join() === (item.answer ?? item.opts).join()) draw();
      else setOrder(order);
    }

    row.setPointerCapture(event.pointerId);
    row.classList.add('dragging');
    row.addEventListener('pointermove', onMove);
    row.addEventListener('pointerup', onUp, { once: true });
    row.addEventListener('pointercancel', draw, { once: true });
  }

  function choiceList() {
    const item = current();
    const q = question();
    return h(
      'div',
      { class: 'options' },
      item.opts.map((option) => {
        const chosen = !!item.answer?.includes(option);
        const right = q.correct.includes(option);
        return h(
          'label',
          { class: cls('option', item.checked && right && 'correct', item.checked && chosen && !right && 'wrong') },
          h('input', {
            type: q.type === 'multi' ? 'checkbox' : 'radio',
            name: 'answer',
            checked: chosen,
            disabled: item.checked,
            onChange: (event) => pick(option, event.target.checked),
          }),
          h('span', null, q.options[option]),
        );
      }),
    );
  }

  function orderList() {
    const item = current();
    const q = question();
    const order = item.answer ?? item.opts;
    const moveButton = (option, index, delta, label, name) =>
      h(
        'button',
        {
          class: 'icon',
          type: 'button',
          disabled: !order[index + delta] && order[index + delta] !== 0,
          ariaLabel: t(name),
          title: t(name),
          'data-move': `${option}:${delta}`,
          onClick: () => move(index, delta),
        },
        label,
      );
    return h(
      'ol',
      { class: 'options' },
      order.map((option, index) =>
        h(
          'li',
          {
            class: cls('option', 'order-item', item.checked && (option === q.correct[index] ? 'correct' : 'wrong')),
            'data-option': option,
            onPointerDown: drag,
          },
          !item.checked && h('span', { class: 'handle', 'aria-hidden': 'true' }, '⠿'),
          h('span', { class: 'option-text' }, q.options[option]),
          !item.checked &&
            h(
              'span',
              { class: 'moves' },
              moveButton(option, index, -1, '↑', 'quiz.moveUp'),
              moveButton(option, index, 1, '↓', 'quiz.moveDown'),
            ),
        ),
      ),
    );
  }

  function feedback() {
    const item = current();
    const q = question();
    const { status, earned, max } = grade(q, item.answer, s.cfg);
    return h(
      'div',
      { class: cls('feedback', status) },
      h('strong', null, `${t(`status.${status}`)} (${round(earned)} / ${round(max)})`),
      status !== 'correct' && h('p', null, `${t('col.correct')}: ${answerText(q, q.correct)}`),
      q.explanation && h('p', { class: 'text' }, q.explanation),
    );
  }

  function questionCard() {
    const item = current();
    const q = question();
    return h(
      'article',
      { class: 'card stack' },
      h('p', { class: 'muted' }, t(`type.${q.type}`)),
      h('h2', { class: 'text' }, q.text),
      q.type === 'order' ? orderList() : choiceList(),
      item.checked && feedback(),
    );
  }

  const pausedCard = () =>
    h(
      'article',
      { class: 'card paused' },
      h('h2', null, t('quiz.paused')),
      h('button', { class: 'button primary', type: 'button', onClick: () => setPaused(false) }, t('quiz.resume')),
    );

  function header() {
    const showTimer = s.left != null;
    return h(
      'header',
      { class: 'quiz-header' },
      h('span', null, t('quiz.progress', { n: s.pos + 1, total: s.items.length })),
      showTimer && h('span', { class: cls('timer', s.left <= 5 && 'urgent'), role: 'timer' }, clock(s.left)),
      showTimer &&
        !s.paused &&
        h('button', { class: 'button', type: 'button', onClick: () => setPaused(true) }, t('quiz.pause')),
      h('progress', { max: s.items.length, value: s.pos + 1 }),
    );
  }

  function footer() {
    const label = immediate && !current().checked ? 'quiz.check' : isLast() ? 'quiz.finish' : 'quiz.next';
    return h(
      'footer',
      { class: 'quiz-footer' },
      h(
        'button',
        {
          class: 'button danger',
          type: 'button',
          onClick: () => confirm(t('quiz.endConfirm')) && finish(),
        },
        t('quiz.end'),
      ),
      h('span', { class: 'spacer' }),
      canGoBack &&
        s.pos > 0 &&
        h('button', { class: 'button', type: 'button', onClick: () => go(s.pos - 1) }, t('quiz.previous')),
      !s.paused && h('button', { class: 'button primary', type: 'button', onClick: primaryAction }, t(label)),
    );
  }

  function draw() {
    root.replaceChildren(header(), s.paused ? pausedCard() : questionCard(), footer());
  }

  function timeUp() {
    if (immediate) reveal();
    else advance();
  }

  let last = Date.now();
  const interval = setInterval(() => {
    if (!root.isConnected) {
      clearInterval(interval);
      return;
    }
    const now = Date.now();
    const elapsed = (now - last) / 1000;
    last = now;
    if (s.left == null || s.paused) return;
    s.left = Math.max(0, s.left - elapsed);
    if (s.left === 0) {
      timeUp();
      return;
    }
    persist();
    const timer = root.querySelector('.timer');
    timer.textContent = clock(s.left);
    timer.classList.toggle('urgent', s.left <= 5);
  }, 1000);

  draw();
  return root;
}
