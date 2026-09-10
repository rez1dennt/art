import { CONSENT_KEY, parseConsent } from './state.mjs';
import { contactConfig } from './contact-config.mjs';
import { submitContact } from './contact.mjs';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('#mobile-menu');
const toggle = document.querySelector('.menu-toggle');
const menuDock = document.querySelector('.menu-dock');
const contact = document.querySelector('#contact-dialog');
const cookieDialog = document.querySelector('#cookie-dialog');
const banner = document.querySelector('.cookie-banner');
const dialogStates = new WeakMap();
let savedY = 0;
let bodyLocked = false;

function positionMenuToggle() {
  const box = menuDock.getBoundingClientRect();
  if (!box.width) return;
  toggle.style.left = `${box.left}px`;
  toggle.style.top = `${box.top}px`;
}

function setMenuIcon(expanded) {
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
}

function waitForClosing(dialog) {
  if (reducedMotion.matches) return Promise.resolve();
  const target = dialog === menu ? dialog.querySelector('.mobile-menu-panel') : dialog;
  const duration = Math.max(...getComputedStyle(target).transitionDuration.split(',').map(value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)));
  return new Promise(resolve => {
    let timer;
    const finish = () => { clearTimeout(timer); target.removeEventListener('transitionend', onEnd); resolve(); };
    const onEnd = event => { if(event.target === target && event.propertyName === 'transform') finish(); };
    target.addEventListener('transitionend',onEnd);
    timer = setTimeout(finish,duration + 50);
  });
}

function lockScroll() {
  if (bodyLocked) return;
  savedY = window.scrollY;
  document.body.style.top = `-${savedY}px`;
  document.body.classList.add('scroll-locked');
  bodyLocked = true;
}

function unlockScroll() {
  if (!bodyLocked) return;
  const root = document.documentElement;
  const prior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
  window.scrollTo({ top:savedY, behavior:'instant' });
  root.style.scrollBehavior = prior;
  bodyLocked = false;
}

function openDialog(dialog, opener) {
  if (!dialog || dialog.open) return;
  const active = document.querySelector('dialog[open]');
  if (active) { closeDialog(active, false).then(() => openDialog(dialog, opener)); return; }
  dialogStates.set(dialog, { opener, closing: null });
  if(dialog === cookieDialog) dialog.querySelector('.storage-status').textContent = '';
  lockScroll();
  if(dialog === menu) {
    positionMenuToggle();
    menu.append(toggle);
  }
  dialog.showModal();
  dialog.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (dialog.open && !dialogStates.get(dialog)?.closing) {
      dialog.classList.add('is-visible');
      if(dialog === menu) setMenuIcon(true);
    }
  }));
  const focusTarget = dialog === contact ? dialog.querySelector('input') : dialog.querySelector('button');
  focusTarget?.focus({ preventScroll:true });
}

function closeDialog(dialog, restoreFocus = true) {
  if (!dialog?.open) return Promise.resolve();
  const state = dialogStates.get(dialog) || {};
  if (state.closing) return state.closing;
  dialog.classList.remove('is-visible');
  if(dialog === menu) setMenuIcon(false);
  const promise = waitForClosing(dialog).then(() => {
      dialog.close();
      if (dialog === menu) {
        menuDock.append(toggle);
        toggle.style.removeProperty('left');
        toggle.style.removeProperty('top');
      }
      unlockScroll();
      if (restoreFocus) {
        const openerVisible = state.opener?.isConnected && state.opener.getClientRects().length;
        const fallback = document.querySelector('.site-header .brand');
        const focusTarget = openerVisible ? state.opener : (dialog === cookieDialog ? fallback : toggle);
        focusTarget?.focus({preventScroll:true});
      }
      dialogStates.delete(dialog);
  });
  state.closing = promise;
  dialogStates.set(dialog, state);
  return promise;
}

toggle?.addEventListener('click', () => menu.open ? closeDialog(menu) : openDialog(menu,toggle));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
  let startedOutside = false;
  const outside = event => {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog && (dialog === menu || outside(event)); });
  dialog.addEventListener('click', event => {
    if (startedOutside && event.target === dialog && (dialog === menu || outside(event))) closeDialog(dialog);
    startedOutside = false;
  });
});
window.addEventListener('resize', () => { if(menu.open) positionMenuToggle(); });

document.querySelectorAll('[data-contact]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const opener = link.closest('dialog') ? toggle : link;
    openDialog(contact, opener);
  });
});

menu?.querySelectorAll('a:not([data-contact])').forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();
    await closeDialog(menu, false);
    const destination = new URL(link.href);
    if (destination.pathname === location.pathname && destination.hash) {
      const target = document.querySelector(destination.hash);
      history.pushState(null, '', destination.hash);
      target?.scrollIntoView({ behavior:reducedMotion.matches ? 'instant':'smooth' });
      if(target) {
        target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
        target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});
      }
    } else { window.location.href = link.href; }
  });
});
window.matchMedia('(min-width:1001px)').addEventListener('change', event => {
  if(event.matches && menu.open) closeDialog(menu,false);
});
document.querySelectorAll('.desktop-nav a, .mobile-menu nav a').forEach(link => {
  const url = new URL(link.href);
  if(url.pathname === location.pathname && !url.hash) link.setAttribute('aria-current','page');
});

function readChoice() {
  try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}
if(banner) banner.hidden = Boolean(readChoice());
document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', () => openDialog(cookieDialog,button)));
document.querySelectorAll('[data-cookie-save]').forEach(button => button.addEventListener('click', async () => {
  let stored = true;
  try { localStorage.setItem(CONSENT_KEY,JSON.stringify({version:1,necessary:true,timestamp:Date.now()})); } catch { stored = false; }
  banner.hidden = true;
  if(!stored) {
    openDialog(cookieDialog,button);
    cookieDialog.querySelector('.storage-status').textContent = 'Браузер не разрешил сохранить настройку. Выбор действует до закрытия этой страницы.';
  } else if(cookieDialog.open) { await closeDialog(cookieDialog); }
}));
document.querySelector('[data-cookie-clear]')?.addEventListener('click', () => {
  try {
    localStorage.removeItem(CONSENT_KEY);
    banner.hidden = false;
    cookieDialog.querySelector('.storage-status').textContent = 'Сохранённый выбор удалён с этого устройства.';
  } catch { cookieDialog.querySelector('.storage-status').textContent = 'Браузер ограничил доступ к хранилищу. Удалите данные сайта в настройках браузера.'; }
});
window.addEventListener('storage', event => { if(event.key===CONSENT_KEY || event.key===null) banner.hidden=Boolean(readChoice()); });

const form = document.querySelector('#contact-form');
let submitting = false;
form?.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  document.querySelector('#form-status').textContent = '';
});
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if(submitting) return;
  const name = form.elements.name;
  if(!name.value.trim()) { name.setCustomValidity('Укажите ваше имя.'); name.reportValidity(); return; }
  const message = form.elements.message;
  if(message.value.trim().length<10) { message.setCustomValidity('Опишите задачу чуть подробнее: минимум 10 символов.'); message.reportValidity(); return; }
  if(!form.reportValidity()) return;
  const values = new FormData(form);
  const payload = {
    name: values.get('name').trim(),
    email: values.get('email').trim(),
    company: values.get('company').trim(),
    message: values.get('message').trim(),
    consent: values.get('consent') === 'on'
  };
  const status = document.querySelector('#form-status');
  const button = form.querySelector('button[type="submit"]');
  const originalLabel = button.innerHTML;
  const controls = [...form.querySelectorAll('input, textarea, button[type="submit"]')];
  submitting = true;
  controls.forEach(control => { control.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  button.textContent = 'Отправляем…';
  status.textContent = '';
  status.removeAttribute('data-state');
  try {
    await submitContact(payload, contactConfig);
    form.reset();
    form.querySelector('.optional-company').open = false;
    status.dataset.state = 'success';
    status.textContent = 'Заявка отправлена. Спасибо за обращение!';
  } catch {
    status.dataset.state = 'error';
    status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз.';
  } finally {
    controls.forEach(control => { control.disabled = false; });
    button.innerHTML = originalLabel;
    form.removeAttribute('aria-busy');
    submitting = false;
    if(contact.open) button.focus({preventScroll:true});
  }
});
