import { CONSENT_KEY, parseConsent } from './state.mjs';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('#mobile-menu');
const toggle = document.querySelector('.menu-toggle');
const contact = document.querySelector('#contact-dialog');
const cookieDialog = document.querySelector('#cookie-dialog');
const banner = document.querySelector('.cookie-banner');
const dialogStates = new WeakMap();
let savedY = 0;
let bodyLocked = false;

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
  dialog.showModal();
  dialog.scrollTop = 0;
  if (dialog === menu) toggle.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (dialog.open && !dialogStates.get(dialog)?.closing) dialog.classList.add('is-visible');
  }));
  const focusTarget = dialog === contact ? dialog.querySelector('input') : dialog.querySelector('button');
  focusTarget?.focus({ preventScroll:true });
}

function closeDialog(dialog, restoreFocus = true) {
  if (!dialog?.open) return Promise.resolve();
  const state = dialogStates.get(dialog) || {};
  if (state.closing) return state.closing;
  dialog.classList.remove('is-visible');
  const promise = new Promise(resolve => {
    window.setTimeout(() => {
      dialog.close();
      if (dialog === menu) toggle.setAttribute('aria-expanded', 'false');
      unlockScroll();
      if (restoreFocus) {
        const openerVisible = state.opener?.isConnected && state.opener.getClientRects().length;
        const fallback = document.querySelector('.site-header .brand');
        const focusTarget = openerVisible ? state.opener : (dialog === cookieDialog ? fallback : toggle);
        focusTarget?.focus({preventScroll:true});
      }
      dialogStates.delete(dialog);
      resolve();
    }, reducedMotion.matches ? 0 : 380);
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
  dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => {
    if (startedOutside && event.target === dialog && outside(event)) closeDialog(dialog);
    startedOutside = false;
  });
});

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
form?.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  document.querySelector('#form-status').textContent = '';
});
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const name = form.elements.name;
  if(!name.value.trim()) { name.setCustomValidity('Укажите ваше имя.'); name.reportValidity(); return; }
  const message = form.elements.message;
  if(message.value.trim().length<10) { message.setCustomValidity('Опишите задачу чуть подробнее: минимум 10 символов.'); message.reportValidity(); return; }
  if(!form.reportValidity()) return;
  const values = new FormData(form);
  const text = `Обращение в ART OF ASKING QUESTIONS\n\nИмя: ${values.get('name').trim()}\nПочта: ${values.get('email').trim()}\nКомпания: ${values.get('company').trim() || 'Не указана'}\n\nЗадача:\n${values.get('message').trim()}`;
  const status = document.querySelector('#form-status');
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Текст скопирован. Заявка не отправлена: передайте текст через согласованный с компанией канал связи.';
  } catch { status.textContent = 'Не удалось скопировать автоматически. Можно выделить и скопировать заполненные поля вручную. Заявка не отправлена.'; }
});
