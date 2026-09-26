/* =========================================================
   تلگرام آفلاین — PWA
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const icon = (name, size = 20) => `<svg width="${size}" height="${size}"><use href="#i-${name}"/></svg>`;
const KEY = 'tg_pwa_v1';

/* ===================== STATE ===================== */
function defaultState() {
  return {
    me: { name: 'من', phone: '', color: '#3390ec' },
    theme: 'dark',
    settings: { autoReply: true, autoIncoming: false, enterToSend: true, sounds: false },
    chats: [],
    contacts: []
  };
}
let state;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.chats)) return null;
    s.settings = Object.assign(
      { autoReply: true, autoIncoming: false, enterToSend: true, sounds: false }, s.settings);
    if (!Array.isArray(s.contacts)) s.contacts = [];
    return s;
  } catch { return null; }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, 150);
}
state = load() || defaultState();
document.documentElement.setAttribute('data-theme', state.theme);

/* ===================== HELPERS ===================== */
const fmtTime = ts => new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
const dayKey = ts => new Date(ts).toDateString();
function fmtDay(ts) {
  const d = new Date(ts), t = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, t)) return 'امروز';
  const y = new Date(t); y.setDate(y.getDate() - 1);
  if (same(d, y)) return 'دیروز';
  return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });
}
function fmtListTime(ts) {
  const d = new Date(ts), t = new Date();
  if (d.toDateString() === t.toDateString()) return fmtTime(ts);
  const y = new Date(t); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'دیروز';
  return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'numeric' });
}
const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let toastTimer;
function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

const getChat = id => state.chats.find(c => c.id === id);
const lastMsg = c => c.messages[c.messages.length - 1];
const lastTs  = c => (lastMsg(c) ? lastMsg(c).ts : c.createdAt || 0);
function chatStatus(c) {
  if (c.typing) return 'در حال نوشتن…';
  if (c.type === 'saved') return 'یادداشت‌های شخصی';
  if (c.type === 'group') return (c.members || 1).toLocaleString('fa-IR') + ' عضو';
  if (c.type === 'channel') return (c.members || 0).toLocaleString('fa-IR') + ' عضو';
  return c.online ? 'آنلاین' : (c.lastSeen || 'آخرین بازدید به تازگی');
}
function previewText(c) {
  const m = lastMsg(c);
  if (!m) return 'بدون پیام';
  let t;
  if (m.type === 'voice') t = 'پیام صوتی';
  else if (m.type === 'photo') t = 'عکس';
  else if (m.type === 'file') t = 'فایل';
  else if (m.type === 'location') t = 'موقعیت مکانی';
  else t = m.text;
  if (c.type === 'group' && !m.out && m.sender) t = m.sender + ': ' + t;
  else if (m.out) t = 'شما: ' + t;
  return t;
}

/* ===================== AVATARS ===================== */
const AV_COLORS = ['#e17076','#7bc862','#e5ca77','#65aadd','#a695e7','#ee7aae','#6ec9cb','#faa774'];
function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
function initials(name) {
  const t = (name || '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/);
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[1][0];
}
function avatarHTML(name, size = 54) {
  const color = hashColor(name);
  return `<div class="avatar${size === 38 ? ' sm' : size === 86 ? ' big' : ''}"
    style="background:${color}">${esc(initials(name))}</div>`;
}

/* ===================== RENDER LIST ===================== */
function renderChatList() {
  const q = ($('#search-input').value || '').trim().toLowerCase();
  let list = state.chats.filter(c => !q || c.name.toLowerCase().includes(q));
  list = list.slice().sort((a, b) => (b.pinned - a.pinned) || (lastTs(b) - lastTs(a)));

  const box = $('#chat-list');
  if (!list.length) {
    box.innerHTML = state.chats.length
      ? `<div class="empty">${icon('search', 48)}<div class="ttl">چیزی پیدا نشد</div></div>`
      : `<div class="empty">
          ${icon('chat', 56)}
          <div class="ttl">هنوز گفتگویی نداری</div>
          برای شروع روی دکمه + پایین بزن
        </div>`;
    return;
  }

  box.innerHTML = list.map(c => {
    const m = lastMsg(c);
    const badge = c.unread > 0
      ? `<span class="badge ${c.muted ? 'muted' : ''}">${c.unread.toLocaleString('fa-IR')}</span>` : '';
    const pin = c.pinned ? `<span class="pin">${icon('pin', 14)}</span>` : '';
    const ticks = m && m.out
      ? `<span class="ticks">${icon(m.status === 'read' ? 'double-check' : 'check', 15)}</span>` : '';
    return `<div class="chat-item" data-id="${c.id}">
      ${avatarHTML(c.name)}
      <div class="ci-body">
        <div class="ci-top">
          <span class="ci-name">${esc(c.name)}</span>
          <span class="ci-time">${m ? ticks : ''}${m ? fmtListTime(lastTs(c)) : ''}</span>
        </div>
        <div class="ci-bot">
          <span class="ci-prev">${esc(previewText(c))}</span>
          ${pin}${badge}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ===================== RENDER CONTACTS ===================== */
function renderContacts() {
  const box = $('#contacts-list');
  if (!state.contacts.length) {
    box.innerHTML = `<div class="empty">
      ${icon('users', 56)}
      <div class="ttl">مخاطبین خالی است</div>
      از دکمه + در تب گفتگوها یک چت جدید بساز
    </div>`;
    return;
  }
  box.innerHTML = `<div class="section-title">مخاطبین</div>` +
    state.contacts.map(c => `
      <div class="chat-item" data-contact="${c.id}">
        ${avatarHTML(c.name)}
        <div class="ci-body">
          <div class="ci-top"><span class="ci-name">${esc(c.name)}</span></div>
          <div class="ci-bot"><span class="ci-prev">برای شروع گفتگو لمس کن</span></div>
        </div>
      </div>`).join('');
}

/* ===================== RENDER SETTINGS ===================== */
function renderSettings() {
  const s = state.settings;
  $('#settings-body').innerHTML = `
    <div class="profile-card">
      ${avatarHTML(state.me.name, 86)}
      <div style="text-align:center">
        <div class="pn">${esc(state.me.name)}</div>
        <div class="pp">${state.me.phone ? esc(state.me.phone) : 'شماره ثبت نشده'}</div>
      </div>
    </div>
    <div class="section-title">پروفایل</div>
    <div class="group">
      <div class="row" data-act="edit-name">
        <span class="r-icon">${icon('edit', 20)}</span>
        <span class="r-text">ویرایش نام</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
      <div class="row" data-act="edit-phone">
        <span class="r-icon">${icon('phone', 20)}</span>
        <span class="r-text">شماره تلفن</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
    </div>
    <div class="section-title">ظاهر</div>
    <div class="group">
      <div class="row">
        <span class="r-icon">${icon('moon', 20)}</span>
        <span class="r-text">حالت تاریک</span>
        <label class="switch"><input type="checkbox" data-set="theme" ${state.theme === 'dark' ? 'checked' : ''}>
        <span class="sl"></span></label>
      </div>
    </div>
    <div class="section-title">رفتار</div>
    <div class="group">
      <div class="row">
        <span class="r-icon">${icon('chat', 20)}</span>
        <span class="r-text">پاسخ خودکار</span>
        <label class="switch"><input type="checkbox" data-set="autoReply" ${s.autoReply ? 'checked' : ''}>
        <span class="sl"></span></label>
      </div>
      <div class="row">
        <span class="r-icon">${icon('forward', 20)}</span>
        <span class="r-text">پیام‌های دوره‌ای</span>
        <label class="switch"><input type="checkbox" data-set="autoIncoming" ${s.autoIncoming ? 'checked' : ''}>
        <span class="sl"></span></label>
      </div>
      <div class="row">
        <span class="r-icon">${icon('bell', 20)}</span>
        <span class="r-text">صدا</span>
        <label class="switch"><input type="checkbox" data-set="sounds" ${s.sounds ? 'checked' : ''}>
        <span class="sl"></span></label>
      </div>
    </div>
    <div class="section-title">داده‌ها</div>
    <div class="group">
      <div class="row" data-act="export">
        <span class="r-icon">${icon('save', 20)}</span>
        <span class="r-text">پشتیبان‌گیری</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
      <div class="row" data-act="import">
        <span class="r-icon">${icon('upload', 20)}</span>
        <span class="r-text">بازیابی از فایل</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
      <div class="row" data-act="reset">
        <span class="r-icon" style="color:var(--danger)">${icon('trash', 20)}</span>
        <span class="r-text" style="color:var(--danger)">پاک کردن همه داده‌ها</span>
      </div>
    </div>
    <div class="empty" style="padding:24px 40px 40px;font-size:13px">
      نسخه آفلاین ۱.۰ — حجم: ${(JSON.stringify(state).length / 1024).toFixed(1)}KB
    </div>
  `;
}

/* ===================== RENDER MESSAGES ===================== */
let activeChatId = null;
let replyToMsg = null;

function msgHTML(chat, m) {
  const cls = `msg ${m.out ? 'out' : 'in'}`;
  let inner = '';

  if (m.replyTo) {
    const r = chat.messages.find(x => x.id === m.replyTo);
    if (r) {
      const nm = r.out ? 'شما' : (r.sender || chat.name);
      const tx = r.type === 'text' ? r.text : (r.type === 'voice' ? 'پیام صوتی' : 'پیوست');
      inner += `<div class="reply-quote"><b>${esc(nm)}</b><p>${esc(tx)}</p></div>`;
    }
  }

  if (m.type === 'photo' || m.type === 'location') {
    const bg = m.type === 'location'
      ? 'linear-gradient(135deg,#43cea2,#185a9d)'
      : (m.bg || 'linear-gradient(135deg,#667eea,#764ba2)');
    const ico = icon(m.type === 'location' ? 'location' : 'camera', 56);
    inner += `<div class="media" style="background:${bg}">${ico}` +
             (m.text ? `<div class="cap">${esc(m.text)}</div>` : '') + `</div>`;
  } else if (m.type === 'file') {
    inner += `<div class="filemsg">
        <div class="ficon">${icon('file', 22)}</div>
        <div class="fmeta"><span class="fname">${esc(m.text)}</span>
        <span class="fsize">${esc(m.size || '2.4 MB')}</span></div></div>`;
  } else if (m.type === 'voice') {
    const bars = Array.from({ length: 22 }, (_, i) =>
      `<i style="height:${7 + ((i * 13 + (m.dur || 3) * 7) % 16)}px"></i>`).join('');
    inner += `<div class="voice">
        <button class="vplay" data-play="${m.id}">${icon('play', 16)}</button>
        <div class="vwave">${bars}</div>
        <span class="vdur">${fmtDur(m.dur || 0)}</span></div>`;
  } else {
    inner += `<div class="btext">${esc(m.text)}</div>`;
  }

  if (!m.out && (chat.type === 'group' || chat.type === 'channel') && m.sender) {
    inner = `<div class="sender" style="color:${m.color || 'var(--accent)'}">${esc(m.sender)}</div>` + inner;
  }

  let ticks = '';
  if (m.out) {
    if (m.status === 'read') ticks = `<span class="ticks read">${icon('double-check', 15)}</span>`;
    else if (m.status === 'delivered') ticks = `<span class="ticks">${icon('double-check', 15)}</span>`;
    else ticks = `<span class="ticks">${icon('check', 15)}</span>`;
  }

  return `<div class="${cls}" data-id="${m.id}">${inner}
    <div class="meta"><span>${fmtTime(m.ts)}</span>${ticks}</div></div>`;
}

function renderMessages(scroll = true) {
  const chat = getChat(activeChatId);
  const box = $('#messages');
  if (!chat) { box.innerHTML = ''; return; }

  if (!chat.messages.length) {
    box.innerHTML = `<div class="empty" style="margin:auto;padding:40px">
      ${icon('chat', 52)}
      <div class="ttl">شروع گفتگو</div>
      اولین پیامت رو بنویس
    </div>`;
    return;
  }

  let html = '', lastDay = '';
  chat.messages.forEach(m => {
    const d = dayKey(m.ts);
    if (d !== lastDay) {
      html += `<div class="day-sep"><span>${fmtDay(m.ts)}</span></div>`;
      lastDay = d;
    }
    html += msgHTML(chat, m);
  });
  if (chat.typing) {
    html += `<div class="msg in typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  }
  box.innerHTML = html;
  if (scroll) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

function renderChatHeader() {
  const c = getChat(activeChatId);
  if (!c) return;
  const av = $('#chat-avatar');
  av.textContent = initials(c.name);
  av.style.background = hashColor(c.name);
  $('#chat-name').textContent = c.name;
  const st = $('#chat-status');
  st.textContent = chatStatus(c);
  st.style.color = c.typing ? 'var(--green)' : 'var(--text2)';
}

/* ===================== OPEN / CLOSE ===================== */
function openChat(id) {
  const c = getChat(id);
  if (!c) return;
  activeChatId = id;
  c.unread = 0;
  c.typing = false;
  replyToMsg = null;
  hideReplyBar();
  renderChatHeader();
  renderMessages();
  renderChatList();
  $('#screen-chat').classList.add('open');
  $('#msg-input').value = '';
  autoGrow();
  updateSendBtn();
  save();
}
function closeChat() {
  $('#screen-chat').classList.remove('open');
  activeChatId = null;
  replyToMsg = null;
  hideReplyBar();
  renderChatList();
}

/* ===================== SEND ===================== */
function sendMessage(extra = {}, textOverride) {
  const chat = getChat(activeChatId);
  if (!chat) return;
  const input = $('#msg-input');
  const text = textOverride !== undefined ? textOverride : input.value.trim();
  if (!text && !extra.type) return;

  const m = Object.assign({
    id: rid(), text, out: true, ts: Date.now(),
    status: 'sent', type: 'text', replyTo: replyToMsg
  }, extra);

  chat.messages.push(m);
  if (textOverride === undefined) { input.value = ''; autoGrow(); updateSendBtn(); }
  replyToMsg = null; hideReplyBar();
  renderMessages();
  renderChatList();

  setTimeout(() => { m.status = 'delivered'; if (activeChatId === chat.id) renderMessages(false); save(); }, 600);
  setTimeout(() => { m.status = 'read'; if (activeChatId === chat.id) renderMessages(false); save(); }, 1700);

  if (state.settings.autoReply && chat.type !== 'saved' && chat.type !== 'channel') scheduleReply(chat);
}

/* ===================== AUTO REPLY ===================== */
const REPLIES = ['باشه 👍','چه جالب!','الان چک می‌کنم','مرسی 🙏','کاملاً موافقم',
  'بعداً حرف می‌زنیم','عالیه!','دقیقاً','ممنون از پیامت','می‌شه بیشتر توضیح بدی؟',
  'حتماً چشم','من هم همین فکر رو می‌کردم','خبر خوبیه!'];

function scheduleReply(chat) {
  setTimeout(() => {
    const c = getChat(chat.id);
    if (!c) return;
    c.typing = true;
    if (activeChatId === c.id) { renderChatHeader(); renderMessages(); }
    save();
    setTimeout(() => {
      c.typing = false;
      const isGroup = c.type === 'group';
      const sender = isGroup && c.memberNames?.length
        ? c.memberNames[Math.floor(Math.random() * c.memberNames.length)] : null;
      c.messages.push({
        id: rid(), text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        out: false, ts: Date.now(), type: 'text', replyTo: null,
        sender, color: sender ? hashColor(sender) : null
      });
      if (activeChatId !== c.id) c.unread = (c.unread || 0) + 1;
      if (activeChatId === c.id) { renderChatHeader(); renderMessages(); }
      renderChatList();
      save();
      if (state.settings.sounds) beep();
    }, 900 + Math.random() * 1400);
  }, 800 + Math.random() * 1400);
}

/* ===================== AMBIENT ===================== */
const AMBIENT = ['سلام، هستی؟','یه چیزی پیدا کردم','خبر جدید داری؟','فردا ساعت چند بریم؟',
  'عکس‌ها رو دیدی؟','یادت نره فردا جلسه داریم','اینو حتماً ببین','دمت گرم'];

setInterval(() => {
  if (!state.settings.autoIncoming) return;
  const cands = state.chats.filter(c => c.type !== 'saved' && c.type !== 'channel');
  if (!cands.length) return;
  const c = cands[Math.floor(Math.random() * cands.length)];
  const isGroup = c.type === 'group';
  const sender = isGroup && c.memberNames?.length
    ? c.memberNames[Math.floor(Math.random() * c.memberNames.length)] : null;
  c.messages.push({
    id: rid(), text: AMBIENT[Math.floor(Math.random() * AMBIENT.length)],
    out: false, ts: Date.now(), type: 'text', replyTo: null,
    sender, color: sender ? hashColor(sender) : null
  });
  if (activeChatId !== c.id) c.unread = (c.unread || 0) + 1;
  if (activeChatId === c.id) renderMessages();
  renderChatList(); save();
}, 40000);

/* ===================== BEEP ===================== */
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.start(); o.stop(audioCtx.currentTime + 0.26);
  } catch {}
}

/* ===================== COMPOSER ===================== */
const inputEl = $('#msg-input');
const sendBtn = $('#btn-send');

function autoGrow() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
}
function updateSendBtn() {
  const has = inputEl.value.trim().length > 0;
  sendBtn.innerHTML = has ? icon('send', 22) : icon('mic', 22);
}
inputEl.addEventListener('input', () => { autoGrow(); updateSendBtn(); });
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && state.settings.enterToSend && window.innerWidth > 820) {
    e.preventDefault(); sendMessage();
  }
});
sendBtn.addEventListener('click', () => {
  if (inputEl.value.trim()) sendMessage();
  else toast('برای ضبط صدا، دکمه را نگه دار');
});

/* ===================== VOICE RECORDING ===================== */
let recInterval = null, recStart = 0, recActive = false;
sendBtn.addEventListener('pointerdown', e => {
  if (inputEl.value.trim()) return;
  e.preventDefault(); startRec();
});
document.addEventListener('pointerup', () => { if (recActive) stopRec(false); });
document.addEventListener('pointercancel', () => { if (recActive) stopRec(true); });

function startRec() {
  recActive = true; recStart = Date.now();
  $('#composer').style.display = 'none';
  $('#rec-bar').classList.add('show');
  $('#rec-time').textContent = '0:00';
  recInterval = setInterval(() => {
    const s = (Date.now() - recStart) / 1000;
    $('#rec-time').textContent = fmtDur(s);
    if (s > 60) stopRec(false);
  }, 100);
}
function stopRec(cancel) {
  if (!recActive) return;
  recActive = false;
  clearInterval(recInterval);
  $('#rec-bar').classList.remove('show');
  $('#composer').style.display = 'flex';
  const dur = (Date.now() - recStart) / 1000;
  if (cancel || dur < 0.8) { toast('ضبط لغو شد'); return; }
  sendMessage({ type: 'voice', dur: Math.round(dur * 10) / 10 }, '');
  toast('پیام صوتی ارسال شد');
}
$('#rec-cancel').addEventListener('click', () => stopRec(true));

/* ===================== REPLY BAR ===================== */
function showReplyBar(m) {
  replyToMsg = m.id;
  const chat = getChat(activeChatId);
  $('#rb-name').textContent = m.out ? 'شما' : (m.sender || chat.name);
  $('#rb-text').textContent = m.type === 'text' ? m.text : 'پیوست';
  $('#reply-bar').classList.add('show');
  inputEl.focus();
}
function hideReplyBar() { $('#reply-bar').classList.remove('show'); }

/* ===================== PLAY VOICE ===================== */
$('#messages').addEventListener('click', e => {
  const btn = e.target.closest('.vplay');
  if (!btn) return;
  if (btn.dataset.playing === '1') return;
  const msgEl = btn.closest('.msg');
  const id = msgEl.dataset.id;
  const chat = getChat(activeChatId);
  const m = chat.messages.find(x => x.id === id);
  if (!m) return;
  btn.dataset.playing = '1';
  btn.innerHTML = icon('pause', 16);
  const bars = msgEl.querySelectorAll('.vwave i');
  bars.forEach((b, i) => b.style.animation = `vpulse .45s ${i * 0.04}s infinite alternate`);
  setTimeout(() => {
    btn.dataset.playing = '0';
    btn.innerHTML = icon('play', 16);
    bars.forEach(b => b.style.animation = '');
  }, (m.dur || 3) * 1000);
});

/* ===================== LONG PRESS ===================== */
let pressTimer = null, pressStart = null, pressedMsgEl = null;
$('#messages').addEventListener('pointerdown', e => {
  const el = e.target.closest('.msg');
  if (!el || el.classList.contains('typing')) return;
  pressStart = { x: e.clientX, y: e.clientY };
  pressedMsgEl = el;
  pressTimer = setTimeout(() => {
    if (pressedMsgEl) showMsgMenu(pressedMsgEl);
    pressTimer = null;
  }, 450);
});
$('#messages').addEventListener('pointermove', e => {
  if (!pressStart) return;
  if (Math.abs(e.clientX - pressStart.x) > 8 || Math.abs(e.clientY - pressStart.y) > 8) {
    clearTimeout(pressTimer); pressTimer = null;
  }
});
['pointerup', 'pointercancel'].forEach(ev =>
  $('#messages').addEventListener(ev, () => {
    clearTimeout(pressTimer); pressTimer = null; pressStart = null;
  }));
$('#messages').addEventListener('contextmenu', e => {
  const el = e.target.closest('.msg');
  if (el) { e.preventDefault(); showMsgMenu(el); }
});

function showMsgMenu(el) {
  const chat = getChat(activeChatId);
  const m = chat.messages.find(x => x.id === el.dataset.id);
  if (!m) return;
  el.classList.add('selected');
  setTimeout(() => el.classList.remove('selected'), 400);

  let items = `<div class="sheet-item" data-mact="reply">${icon('reply')}پاسخ</div>`;
  if (m.type === 'text') items += `<div class="sheet-item" data-mact="copy">${icon('copy')}کپی</div>`;
  if (m.out && m.type === 'text') items += `<div class="sheet-item" data-mact="edit">${icon('edit')}ویرایش</div>`;
  items += `<div class="sheet-item" data-mact="forward">${icon('forward')}هدایت</div>`;
  items += `<div class="sheet-item danger" data-mact="delete">${icon('trash')}حذف</div>`;

  openSheet(`<div class="sheet-title">پیام</div>${items}`);

  $$('#sheet-content [data-mact]').forEach(btn => btn.addEventListener('click', () => {
    const act = btn.dataset.mact;
    closeSheet();
    setTimeout(() => handleMsgAction(act, chat, m), 120);
  }));
}

function handleMsgAction(act, chat, m) {
  if (act === 'reply') { showReplyBar(m); return; }
  if (act === 'copy') {
    const t = m.text || '';
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('کپی شد'), () => toast('کپی نشد'));
    else toast('پشتیبانی نمی‌شود');
    return;
  }
  if (act === 'edit') {
    showPrompt('ویرایش پیام', m.text, val => {
      if (!val.trim()) return;
      m.text = val.trim(); m.edited = true;
      renderMessages(false); save(); toast('ویرایش شد');
    });
    return;
  }
  if (act === 'forward') {
    if (!state.chats.length) { toast('چتی برای هدایت نیست'); return; }
    openSheet(`<div class="sheet-title">هدایت به…</div>` +
      state.chats.map(c => `<div class="sheet-item" data-fwd="${c.id}">
        ${avatarHTML(c.name, 38)}${esc(c.name)}</div>`).join(''));
    $$('#sheet-content [data-fwd]').forEach(b => b.addEventListener('click', () => {
      const target = getChat(b.dataset.fwd);
      target.messages.push({
        id: rid(), text: m.text, out: true, ts: Date.now(), status: 'sent',
        type: m.type, replyTo: null, dur: m.dur, bg: m.bg, size: m.size
      });
      closeSheet(); renderChatList(); save();
      toast('هدایت شد به ' + target.name);
    }));
    return;
  }
  if (act === 'delete') {
    showConfirm('حذف پیام', 'این پیام برای همیشه حذف شود؟', () => {
      chat.messages = chat.messages.filter(x => x.id !== m.id);
      renderMessages(false); renderChatList(); save(); toast('حذف شد');
    });
  }
}

/* ===================== SHEETS ===================== */
const sheetOverlay = $('#sheet-overlay');
const emojiOverlay = $('#emoji-overlay');
const modalOverlay = $('#modal');

function openSheet(html) {
  $('#sheet-content').innerHTML = html;
  sheetOverlay.classList.add('show');
}
function closeSheet() { sheetOverlay.classList.remove('show'); }
sheetOverlay.addEventListener('click', e => { if (e.target === sheetOverlay) closeSheet(); });

/* ===================== EMOJI ===================== */
const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰',
  '😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏',
  '😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
  '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘',
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐',
  '🎉','🎊','🎈','🎁','🔥','✨','⭐','🌟','💫','⚡','💥','💯','✅','❌','⚠️','❓'
];
function openEmoji() {
  if (!$('#emoji-panel').innerHTML) {
    $('#emoji-panel').innerHTML =
      `<div class="emoji-grid">${EMOJIS.map(e => `<button data-emoji="${e}">${e}</button>`).join('')}</div>`;
    $$('#emoji-panel [data-emoji]').forEach(b =>
      b.addEventListener('click', () => {
        inputEl.value += b.dataset.emoji;
        autoGrow(); updateSendBtn();
      }));
  }
  emojiOverlay.classList.add('show');
}
$('#btn-emoji').addEventListener('click', openEmoji);
emojiOverlay.addEventListener('click', e => { if (e.target === emojiOverlay) emojiOverlay.classList.remove('show'); });

/* ===================== ATTACH ===================== */
$('#btn-attach').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-title">پیوست</div>
    <div class="sheet-item" data-att="photo">${icon('camera')}عکس</div>
    <div class="sheet-item" data-att="file">${icon('file')}فایل</div>
    <div class="sheet-item" data-att="location">${icon('location')}موقعیت مکانی</div>
  `);
  $$('#sheet-content [data-att]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.att;
    closeSheet();
    setTimeout(() => {
      if (t === 'photo') sendMessage({ type: 'photo', text: '', bg: 'linear-gradient(135deg,#667eea,#764ba2)' }, '');
      if (t === 'file') sendMessage({ type: 'file', text: 'document.pdf', size: '1.8 MB' }, '');
      if (t === 'location') sendMessage({ type: 'location', text: 'موقعیت من' }, '');
    }, 150);
  }));
});

/* ===================== CHAT MENU ===================== */
$('#btn-chat-menu').addEventListener('click', () => {
  const c = getChat(activeChatId);
  if (!c) return;
  openSheet(`
    <div class="sheet-title">${esc(c.name)}</div>
    <div class="sheet-item" data-cact="pin">${icon('pin')}${c.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}</div>
    <div class="sheet-item" data-cact="mute">${icon(c.muted ? 'bell' : 'bell-off')}${c.muted ? 'فعال کردن اعلان' : 'بی‌صدا کردن'}</div>
    <div class="sheet-item" data-cact="clear">${icon('trash')}پاک کردن تاریخچه</div>
    <div class="sheet-item danger" data-cact="delete">${icon('trash')}حذف گفتگو</div>
  `);
  $$('#sheet-content [data-cact]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.cact;
    closeSheet();
    setTimeout(() => {
      if (act === 'pin') { c.pinned = !c.pinned; toast(c.pinned ? 'سنجاق شد' : 'برداشته شد'); }
      if (act === 'mute') { c.muted = !c.muted; toast(c.muted ? 'بی‌صدا شد' : 'فعال شد'); }
      if (act === 'clear') { c.messages = []; toast('پاک شد'); }
      if (act === 'delete') {
        showConfirm('حذف گفتگو', 'کل این گفتگو حذف شود؟', () => {
          state.chats = state.chats.filter(x => x.id !== c.id);
          closeChat(); renderChatList(); save(); toast('حذف شد');
        });
        return;
      }
      renderChatList(); renderMessages(); save();
    }, 120);
  }));
});

/* ===================== CALL ===================== */
$('#btn-call').addEventListener('click', () => toast('در نسخه آفلاین پشتیبانی نمی‌شود'));

/* ===================== TABS ===================== */
$$('.tabbar button').forEach(btn => btn.addEventListener('click', () => {
  $$('.tabbar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  $$('.tab-body').forEach(t => t.classList.add('hidden'));
  $('#tab-' + tab).classList.remove('hidden');
  $('#fab-new').style.display = tab === 'chats' ? 'flex' : 'none';
  $('#btn-search-toggle').style.display = tab === 'chats' ? 'flex' : 'none';
  $('#list-title').textContent = tab === 'chats' ? 'تلگرام' : (tab === 'contacts' ? 'مخاطبین' : 'تنظیمات');
  if (tab === 'contacts') renderContacts();
  if (tab === 'settings') renderSettings();
}));

/* ===================== SEARCH ===================== */
$('#btn-search-toggle').addEventListener('click', () => {
  const sb = $('#searchbar');
  const open = sb.style.display === 'none';
  sb.style.display = open ? 'block' : 'none';
  if (open) $('#search-input').focus();
  else { $('#search-input').value = ''; renderChatList(); }
});
$('#search-input').addEventListener('input', renderChatList);

/* ===================== NAV ===================== */
$('#btn-back').addEventListener('click', closeChat);
$('#btn-menu-list').addEventListener('click', () => toast('به‌زودی…'));

$('#chat-list').addEventListener('click', e => {
  const item = e.target.closest('.chat-item');
  if (item) openChat(item.dataset.id);
});

$('#contacts-list').addEventListener('click', e => {
  const item = e.target.closest('[data-contact]');
  if (!item) return;
  const c = state.contacts.find(x => x.id === item.dataset.contact);
  if (!c) return;
  let chat = state.chats.find(x => x.id === c.id);
  if (!chat) {
    chat = { id: c.id, name: c.name, type: 'private', online: Math.random() > .5,
             unread: 0, pinned: false, muted: false, messages: [], createdAt: Date.now() };
    state.chats.push(chat); save();
  }
  openChat(chat.id);
});

/* ===================== NEW CHAT ===================== */
$('#fab-new').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-title">گفتگوی جدید</div>
    <div class="sheet-item" data-nt="private">${icon('user')}گفتگوی خصوصی</div>
    <div class="sheet-item" data-nt="group">${icon('users')}گروه</div>
    <div class="sheet-item" data-nt="channel">${icon('megaphone')}کانال</div>
    <div class="sheet-item" data-nt="saved">${icon('bookmark')}پیام‌های ذخیره‌شده</div>
  `);
  $$('#sheet-content [data-nt]').forEach(b => b.addEventListener('click', () => {
    const type = b.dataset.nt;
    closeSheet();
    setTimeout(() => promptChatName(type), 150);
  }));
});

function promptChatName(type) {
  const titles = { private: 'نام مخاطب', group: 'نام گروه', channel: 'نام کانال', saved: null };
  if (type === 'saved') { createChat({ name: 'پیام‌های ذخیره‌شده', type: 'saved' }); return; }

  showPrompt(titles[type], '', val => {
    const name = val.trim();
    if (!name) { toast('نام نمی‌تونه خالی باشه'); return; }
    const data = { name, type };
    if (type === 'group') { data.members = 1; data.memberNames = []; }
    if (type === 'channel') { data.members = 1; }
    if (type === 'private') { data.online = true; }
    createChat(data);
    if (type === 'private') {
      const id = state.chats[state.chats.length - 1].id;
      state.contacts.push({ id, name });
      save(); renderContacts();
    }
  });
}

function createChat(data) {
  const chat = Object.assign({
    id: rid(), unread: 0, pinned: false, muted: false, messages: [], createdAt: Date.now()
  }, data);
  state.chats.push(chat);
  save(); renderChatList();
  toast('«' + chat.name + '» ساخته شد');
  setTimeout(() => openChat(chat.id), 200);
}

/* ===================== SETTINGS ===================== */
$('#settings-body').addEventListener('click', e => {
  const row = e.target.closest('[data-act]');
  if (row) {
    const act = row.dataset.act;
    if (act === 'edit-name') showPrompt('نام شما', state.me.name, v => {
      if (!v.trim()) return;
      state.me.name = v.trim(); renderSettings(); save(); toast('ذخیره شد');
    });
    if (act === 'edit-phone') showPrompt('شماره تلفن', state.me.phone, v => {
      state.me.phone = v.trim(); renderSettings(); save(); toast('ذخیره شد');
    });
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'telegram-backup.json';
      a.click(); URL.revokeObjectURL(a.href);
      toast('دانلود شد');
    }
    if (act === 'import') {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const data = JSON.parse(r.result);
            if (!data || !Array.isArray(data.chats)) throw 0;
            state = data;
            document.documentElement.setAttribute('data-theme', state.theme || 'dark');
            renderChatList(); renderContacts(); renderSettings(); save();
            toast('بازیابی شد');
          } catch { toast('فایل نامعتبر'); }
        };
        r.readAsText(f);
      };
      inp.click();
    }
    if (act === 'reset') {
      showConfirm('پاک کردن همه داده‌ها', 'تمام گفتگوها و تنظیمات حذف شوند؟', () => {
        localStorage.removeItem(KEY);
        state = defaultState();
        document.documentElement.setAttribute('data-theme', state.theme);
        renderChatList(); renderSettings(); renderContacts();
        toast('پاک شد');
      });
    }
  }
  const sw = e.target.closest('input[data-set]');
  if (sw) {
    const key = sw.dataset.set;
    if (key === 'theme') {
      state.theme = sw.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
    } else state.settings[key] = sw.checked;
    save();
  }
});

/* ===================== MODAL ===================== */
function showPrompt(title, value, onOk) {
  const box = $('#modal-box');
  box.innerHTML = `<h3>${esc(title)}</h3>
    <input id="modal-input" value="${esc(value)}" placeholder="بنویس…">
    <div class="modal-actions">
      <button id="modal-cancel">لغو</button>
      <button id="modal-ok" class="ok">ذخیره</button>
    </div>`;
  modalOverlay.classList.add('show');
  const inp = $('#modal-input');
  setTimeout(() => { inp.focus(); inp.select(); }, 60);
  $('#modal-cancel').onclick = () => modalOverlay.classList.remove('show');
  $('#modal-ok').onclick = () => {
    const v = inp.value; modalOverlay.classList.remove('show'); onOk(v);
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#modal-ok').click(); });
}
function showConfirm(title, text, onOk) {
  const box = $('#modal-box');
  box.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p>
    <div class="modal-actions">
      <button id="modal-cancel">لغو</button>
      <button id="modal-ok" class="ok" style="color:var(--danger)">حذف</button>
    </div>`;
  modalOverlay.classList.add('show');
  $('#modal-cancel').onclick = () => modalOverlay.classList.remove('show');
  $('#modal-ok').onclick = () => { modalOverlay.classList.remove('show'); onOk(); };
}
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('show');
});

/* ===================== ESCAPE ===================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (sheetOverlay.classList.contains('show')) closeSheet();
    else if (emojiOverlay.classList.contains('show')) emojiOverlay.classList.remove('show');
    else if (modalOverlay.classList.contains('show')) modalOverlay.classList.remove('show');
    else if ($('#screen-chat').classList.contains('open')) closeChat();
  }
});

/* ===================== INIT ===================== */
renderChatList();
renderContacts();
renderSettings();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}