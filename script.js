/* =========================================================
   پیسفون v2.1
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const icon = (name, size = 20) => `<svg width="${size}" height="${size}"><use href="#i-${name}"/></svg>`;
const KEY = 'pisfon_v2';

/* ✅ Set برای پیام‌های رندر شده — جلوگیری از انیمیشن مجدد */
const renderedMsgIds = new Set();

/* AVATAR PALETTE */
const AV_GRADS = [
  ['#ff6b6b','#c92a2a'], ['#51cf66','#2b8a3e'], ['#ffd43b','#e67700'],
  ['#4dabf7','#1864ab'], ['#b197fc','#5f3dc4'], ['#ff8cc8','#c2255c'],
  ['#63e6be','#087f5b'], ['#ffa94d','#d9480f'], ['#845ef7','#5f3dc4'],
  ['#20c997','#0ca678'], ['#f783ac','#a61e4d'], ['#74c0fc','#1971c2']
];
const AV_EMOJIS = [
  '😎','🥰','😇','🤓','🧐','🥳','😺','🦊','🐼','🐨','🦁','🐯','🦄','🐧','🐢','🐳',
  '🌸','🌺','🌈','⚡','💎','🔥','⭐','🎯','🚀','🎨','🎵','📷','🍕','☕','🍀','🌟'
];

/* STATE */
function defaultState() {
  return {
    me: {
      name: 'من',
      phone: '',
      avatar: { type: 'gradient', value: 0 },
      verified: false
    },
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
    if (!s.me.avatar) s.me.avatar = { type: 'gradient', value: 0 };
    if (typeof s.me.verified !== 'boolean') s.me.verified = false;
    s.chats.forEach(c => {
      if (!c.avatar) c.avatar = { type: 'gradient', value: hashInt(c.name, AV_GRADS.length) };
      if (typeof c.verified !== 'boolean') c.verified = false;
      if ((c.type === 'group' || c.type === 'channel') && typeof c.members !== 'number') {
        c.members = c.type === 'group' ? 1 : 0;
      }
    });
    s.contacts.forEach(c => {
      if (!c.avatar) c.avatar = { type: 'gradient', value: hashInt(c.name, AV_GRADS.length) };
      if (typeof c.verified !== 'boolean') c.verified = false;
    });
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

/* HASH */
function hashInt(str, mod) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}
function initials(name) {
  const t = (name || '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/);
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[1][0];
}

/* AVATAR */
function avatarHTML(entity, size = 54) {
  const av = entity.avatar || { type: 'gradient', value: hashInt(entity.name || '', AV_GRADS.length) };
  const dim = (size === 38 || size === 40) ? ' sm' : (size >= 86 ? ' big' : '');
  const klass = `avatar${dim}`;
  if (av.type === 'emoji') {
    const g = AV_GRADS[hashInt(entity.name || '', AV_GRADS.length)];
    return `<div class="${klass}" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${av.value}</div>`;
  }
  if (av.type === 'image') {
    return `<div class="${klass}" style="background-image:url('${av.value}')"></div>`;
  }
  const g = AV_GRADS[(av.value || 0) % AV_GRADS.length];
  return `<div class="${klass}" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${esc(initials(entity.name))}</div>`;
}
function avatarBgStyle(entity) {
  const av = entity.avatar || { type: 'gradient', value: 0 };
  if (av.type === 'image') return `background-image:url('${av.value}')`;
  if (av.type === 'emoji') {
    const g = AV_GRADS[hashInt(entity.name || '', AV_GRADS.length)];
    return `background:linear-gradient(135deg,${g[0]},${g[1]})`;
  }
  const g = AV_GRADS[(av.value || 0) % AV_GRADS.length];
  return `background:linear-gradient(135deg,${g[0]},${g[1]})`;
}
function avatarContent(entity) {
  const av = entity.avatar || { type: 'gradient', value: 0 };
  if (av.type === 'emoji') return av.value;
  if (av.type === 'image') return '';
  return esc(initials(entity.name));
}

/* VERIFIED */
function vfHTML(size = 17) {
  return `<svg class="vf" width="${size}" height="${size}" viewBox="0 0 24 24"><use href="#i-verified"/></svg>`;
}
function nameWithVf(name, verified, vfSize = 17) {
  return `${esc(name)}${verified ? vfHTML(vfSize) : ''}`;
}

/* TIME */
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

/* TOAST */
let toastTimer;
function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* CHAT HELPERS */
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
  if (m.type === 'voice') t = '🎤 پیام صوتی';
  else if (m.type === 'photo') t = '🖼 عکس';
  else if (m.type === 'file') t = '📎 فایل';
  else if (m.type === 'location') t = '📍 موقعیت مکانی';
  else t = m.text;
  if (c.type === 'group' && !m.out && m.sender) t = m.sender + ': ' + t;
  else if (m.out) t = 'شما: ' + t;
  return t;
}

/* RENDER: CHAT LIST */
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
          برای شروع روی دکمه + بزن
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
      ${avatarHTML(c)}
      <div class="ci-body">
        <div class="ci-top">
          <span class="ci-name">${nameWithVf(c.name, c.verified, 17)}</span>
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

/* RENDER: CONTACTS */
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
  box.innerHTML = state.contacts.map(c => `
    <div class="chat-item" data-contact="${c.id}">
      ${avatarHTML(c)}
      <div class="ci-body">
        <div class="ci-top">
          <span class="ci-name">${nameWithVf(c.name, c.verified, 17)}</span>
        </div>
        <div class="ci-bot"><span class="ci-prev">برای شروع گفتگو لمس کن</span></div>
      </div>
    </div>`).join('');
}

/* RENDER: SETTINGS */
function renderSettings() {
  const s = state.settings;
  const me = state.me;
  $('#settings-body').innerHTML = `
    <div class="profile-card">
      <button class="pc-edit-btn" id="btn-edit-profile">${icon('edit', 14)} ویرایش</button>
      <div class="avatar big" id="my-avatar-btn" style="${avatarBgStyle(me)}">${avatarContent(me)}</div>
      <div style="text-align:center">
        <div class="pn">${nameWithVf(me.name, me.verified, 20)}</div>
        <div class="pp">${me.phone ? esc(me.phone) : 'شماره ثبت نشده'}</div>
      </div>
    </div>
    <div class="section-title">حساب کاربری</div>
    <div class="group">
      <div class="row" data-act="edit-name">
        <span class="r-icon">${icon('edit', 20)}</span>
        <span class="r-text">نام</span>
        <span class="r-val">${esc(me.name)}</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
      <div class="row" data-act="edit-phone">
        <span class="r-icon">${icon('phone', 20)}</span>
        <span class="r-text">شماره تلفن</span>
        <span class="r-val">${me.phone ? esc(me.phone) : '—'}</span>
        <span class="chev">${icon('chevron', 18)}</span>
      </div>
      <div class="row">
        <span class="r-icon" style="background:linear-gradient(180deg,#3aa0ff,#0a84ff)">${icon('verified', 20)}</span>
        <span class="r-text">تیک آبی</span>
        <label class="switch"><input type="checkbox" data-me="verified" ${me.verified ? 'checked' : ''}>
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
    </div>
    <div class="group">
      <div class="row" data-act="reset">
        <span class="r-icon" style="background:linear-gradient(180deg,#ff6b6b,#e53935)">${icon('trash', 20)}</span>
        <span class="r-text" style="color:var(--red)">پاک کردن همه داده‌ها</span>
      </div>
    </div>
    <div class="empty" style="padding:20px 40px 40px;font-size:12px;opacity:.55">
      پیسفون نسخه ۲.۱ — حجم: ${(JSON.stringify(state).length / 1024).toFixed(1)}KB
    </div>
  `;
}

/* RENDER: MESSAGES */
let activeChatId = null;
let replyToMsg = null;

function msgHTML(chat, m) {
  // ✅ جلوگیری از انیمیشن مجدد پیام‌های قدیمی
  const isNew = !renderedMsgIds.has(m.id);
  renderedMsgIds.add(m.id);
  const animClass = isNew ? '' : ' no-anim';
  const cls = `msg ${m.out ? 'out' : 'in'}${animClass}`;
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

  // نام فرستنده در گروه
  if (!m.out && chat.type === 'group' && m.sender) {
    inner = `<div class="sender" style="color:${m.color || 'var(--accent-hi)'}">${esc(m.sender)}</div>` + inner;
  }
  // ✅ نام کانال بالای پیام‌های کانال
  if (!m.out && chat.type === 'channel') {
    inner = `<div class="sender channel-name">${esc(chat.name)}</div>` + inner;
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
  av.textContent = avatarContent(c);
  av.style.background = avatarBgStyle(c);
  if ((c.avatar || {}).type === 'image') {
    av.style.backgroundImage = `url('${c.avatar.value}')`;
    av.style.backgroundSize = 'cover';
    av.style.backgroundPosition = 'center';
  }
  const nameEl = $('#chat-name');
  nameEl.innerHTML = nameWithVf(c.name, c.verified, 16);
  const statusEl = $('#chat-status');
  statusEl.textContent = chatStatus(c);
  statusEl.style.color = c.typing ? 'var(--green)' : '';
  // ✅ editable برای گروه/کانال
  if (c.type === 'group' || c.type === 'channel') {
    statusEl.classList.add('editable');
  } else {
    statusEl.classList.remove('editable');
  }
}

/* OPEN / CLOSE */
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

/* SEND */
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

/* AUTO REPLY */
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
      const g = AV_GRADS[Math.floor(Math.random() * AV_GRADS.length)];
      c.messages.push({
        id: rid(), text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        out: false, ts: Date.now(), type: 'text', replyTo: null,
        sender, color: sender ? g[0] : null
      });
      if (activeChatId !== c.id) c.unread = (c.unread || 0) + 1;
      if (activeChatId === c.id) { renderChatHeader(); renderMessages(); }
      renderChatList();
      save();
      if (state.settings.sounds) beep();
    }, 900 + Math.random() * 1400);
  }, 800 + Math.random() * 1400);
}

/* AMBIENT */
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
  const g = AV_GRADS[Math.floor(Math.random() * AV_GRADS.length)];
  c.messages.push({
    id: rid(), text: AMBIENT[Math.floor(Math.random() * AMBIENT.length)],
    out: false, ts: Date.now(), type: 'text', replyTo: null,
    sender, color: sender ? g[0] : null
  });
  if (activeChatId !== c.id) c.unread = (c.unread || 0) + 1;
  if (activeChatId === c.id) renderMessages();
  renderChatList(); save();
}, 40000);

/* BEEP */
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

/* COMPOSER */
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

/* VOICE */
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

/* REPLY BAR */
function showReplyBar(m) {
  replyToMsg = m.id;
  const chat = getChat(activeChatId);
  $('#rb-name').textContent = m.out ? 'شما' : (m.sender || chat.name);
  $('#rb-text').textContent = m.type === 'text' ? m.text : 'پیوست';
  $('#reply-bar').classList.add('show');
  inputEl.focus();
}
function hideReplyBar() { $('#reply-bar').classList.remove('show'); }

/* PLAY VOICE */
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

/* LONG PRESS */
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
        ${avatarHTML(c, 38)}${esc(c.name)}</div>`).join(''));
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

/* OVERLAYS */
const sheetOverlay = $('#sheet-overlay');
const emojiOverlay = $('#emoji-overlay');
const avatarOverlay = $('#avatar-overlay');
const modalOverlay = $('#modal');

function openSheet(html) {
  $('#sheet-content').innerHTML = html;
  sheetOverlay.classList.add('show');
}
function closeSheet() { sheetOverlay.classList.remove('show'); }
sheetOverlay.addEventListener('click', e => { if (e.target === sheetOverlay) closeSheet(); });

/* AVATAR PICKER */
let avatarTarget = null;
let avatarTargetType = null;

function openAvatarPicker(targetType, targetId) {
  avatarTargetType = targetType;
  avatarTarget = targetId;
  renderAvatarPicker('gradient');
  avatarOverlay.classList.add('show');
}
function closeAvatarPicker() { avatarOverlay.classList.remove('show'); }
avatarOverlay.addEventListener('click', e => { if (e.target === avatarOverlay) closeAvatarPicker(); });

function getAvatarEntity() {
  if (avatarTargetType === 'me') return state.me;
  if (avatarTargetType === 'chat') return getChat(avatarTarget);
  if (avatarTargetType === 'contact') return state.contacts.find(c => c.id === avatarTarget);
  return null;
}

function renderAvatarPicker(tab = 'gradient') {
  const entity = getAvatarEntity();
  if (!entity) return;
  const current = entity.avatar || { type: 'gradient', value: 0 };

  let body = '';
  if (tab === 'gradient') {
    body = `<div class="av-grid">` +
      AV_GRADS.map((g, i) => {
        const sel = current.type === 'gradient' && current.value === i ? ' sel' : '';
        return `<button class="av-color${sel}" data-grad="${i}"
          style="background:linear-gradient(135deg,${g[0]},${g[1]})"></button>`;
      }).join('') + `</div>`;
  } else if (tab === 'emoji') {
    body = `<div class="av-grid" style="grid-template-columns:repeat(6,1fr)">` +
      AV_EMOJIS.map(e => {
        const sel = current.type === 'emoji' && current.value === e ? ' sel' : '';
        return `<button class="${sel}" data-emo="${e}" style="font-size:24px">${e}</button>`;
      }).join('') + `</div>`;
  } else if (tab === 'image') {
    body = `<div class="av-upload" id="av-upload-btn">
      ${icon('camera', 22)} انتخاب عکس از گالری
    </div>
    <div style="text-align:center;font-size:12px;color:var(--text2);padding:14px 20px 4px;line-height:1.6">
      تصویر به صورت خودکار کوچک می‌شود<br>و فقط روی همین دستگاه ذخیره می‌شود
    </div>`;
  }

  $('#avatar-panel').innerHTML = `
    <div class="av-tabs">
      <button data-avtab="gradient" class="${tab === 'gradient' ? 'active' : ''}">
        ${icon('palette', 20)}رنگ
      </button>
      <button data-avtab="emoji" class="${tab === 'emoji' ? 'active' : ''}">
        ${icon('smile', 20)}ایموجی
      </button>
      <button data-avtab="image" class="${tab === 'image' ? 'active' : ''}">
        ${icon('image', 20)}تصویر
      </button>
    </div>
    <div class="av-preview">
      <div class="avatar" style="${avatarBgStyle(entity)}">${avatarContent(entity)}</div>
    </div>
    <div class="av-section">${body}</div>
  `;

  $$('#avatar-panel [data-avtab]').forEach(b =>
    b.addEventListener('click', () => renderAvatarPicker(b.dataset.avtab)));
  $$('#avatar-panel [data-grad]').forEach(b =>
    b.addEventListener('click', () => {
      entity.avatar = { type: 'gradient', value: parseInt(b.dataset.grad) };
      applyAvatarChange();
    }));
  $$('#avatar-panel [data-emo]').forEach(b =>
    b.addEventListener('click', () => {
      entity.avatar = { type: 'emoji', value: b.dataset.emo };
      applyAvatarChange();
    }));

  const upBtn = $('#av-upload-btn');
  if (upBtn) upBtn.addEventListener('click', pickImage);
}

function pickImage() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    resizeImage(f, 320, dataUrl => {
      const entity = getAvatarEntity();
      if (!entity) return;
      entity.avatar = { type: 'image', value: dataUrl };
      applyAvatarChange();
    });
  };
  inp.click();
}

function resizeImage(file, maxSize, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const ratio = Math.min(maxSize / w, maxSize / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function applyAvatarChange() {
  save();
  if (avatarTargetType === 'me') {
    renderSettings(); renderChatList();
  } else if (avatarTargetType === 'chat') {
    renderChatList();
    if (activeChatId === avatarTarget) renderChatHeader();
  } else if (avatarTargetType === 'contact') {
    renderContacts();
  }
  const entity = getAvatarEntity();
  if (entity) {
    const prev = $('#avatar-panel .av-preview .avatar');
    if (prev) {
      prev.textContent = avatarContent(entity);
      const style = avatarBgStyle(entity);
      prev.setAttribute('style', style + ';width:96px;height:96px;font-size:42px;');
    }
    $$('#avatar-panel [data-grad], #avatar-panel [data-emo]').forEach(b => b.classList.remove('sel'));
    const cur = entity.avatar || {};
    if (cur.type === 'gradient') {
      const b = $(`#avatar-panel [data-grad="${cur.value}"]`);
      if (b) b.classList.add('sel');
    }
    if (cur.type === 'emoji') {
      const b = $(`#avatar-panel [data-emo="${cur.value}"]`);
      if (b) b.classList.add('sel');
    }
  }
  toast('ذخیره شد');
}

/* EMOJI */
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

/* ATTACH */
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

/* CHAT MENU */
$('#btn-chat-menu').addEventListener('click', () => {
  const c = getChat(activeChatId);
  if (!c) return;
  const memberItem = (c.type === 'group' || c.type === 'channel')
    ? `<div class="sheet-item" data-cact="members">${icon('users')}تعداد اعضا (${(c.members || 0).toLocaleString('fa-IR')})</div>`
    : '';
  openSheet(`
    <div class="sheet-title">${esc(c.name)}</div>
    <div class="sheet-item" data-cact="avatar">${icon('image')}تنظیم پروفایل</div>
    <div class="sheet-item" data-cact="verified">${icon('verified')}${c.verified ? 'برداشتن تیک آبی' : 'دادن تیک آبی'}</div>
    <div class="sheet-item" data-cact="rename">${icon('edit')}تغییر نام</div>
    ${memberItem}
    <div class="sheet-item" data-cact="pin">${icon('pin')}${c.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}</div>
    <div class="sheet-item" data-cact="mute">${icon(c.muted ? 'bell' : 'bell-off')}${c.muted ? 'فعال کردن اعلان' : 'بی‌صدا کردن'}</div>
    <div class="sheet-item" data-cact="clear">${icon('trash')}پاک کردن تاریخچه</div>
    <div class="sheet-item danger" data-cact="delete">${icon('trash')}حذف گفتگو</div>
  `);
  $$('#sheet-content [data-cact]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.cact;
    closeSheet();
    setTimeout(() => {
      if (act === 'avatar') { openAvatarPicker('chat', c.id); return; }
      if (act === 'verified') {
        c.verified = !c.verified;
        toast(c.verified ? 'تیک آبی داده شد' : 'تیک آبی برداشته شد');
        renderChatList(); renderChatHeader(); save();
        return;
      }
      if (act === 'rename') {
        showPrompt('نام جدید', c.name, v => {
          if (!v.trim()) return;
          c.name = v.trim(); renderChatHeader(); renderChatList(); save();
          toast('نام تغییر کرد');
        });
        return;
      }
      if (act === 'members') {
        showPrompt('تعداد اعضا', String(c.members || 0), v => {
          const n = parseInt(v, 10);
          if (isNaN(n) || n < 0) { toast('عدد معتبر وارد کن'); return; }
          c.members = Math.min(n, 9999999);
          renderChatHeader(); renderChatList(); save();
          toast('تعداد اعضا تغییر کرد');
        });
        return;
      }
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

/* CALL */
$('#btn-call').addEventListener('click', () => toast('در نسخه آفلاین پشتیبانی نمی‌شود'));

/* ✅ کلیک روی «X عضو» در هدر → تغییر تعداد اعضا */
$('#chat-status').addEventListener('click', () => {
  const c = getChat(activeChatId);
  if (!c) return;
  if (c.type !== 'group' && c.type !== 'channel') return;
  showPrompt('تعداد اعضا', String(c.members || 0), v => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 0) { toast('عدد معتبر وارد کن'); return; }
    if (n > 9999999) { toast('حداکثر ۹٬۹۹۹٬۹۹۹'); return; }
    c.members = n;
    renderChatHeader(); renderChatList(); save();
    toast('تعداد اعضا تغییر کرد');
  });
});

/* TABS */
$$('.tabbar button').forEach(btn => btn.addEventListener('click', () => {
  $$('.tabbar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  $$('.tab-body').forEach(t => t.classList.add('hidden'));
  $('#tab-' + tab).classList.remove('hidden');
  $('#fab-new').style.display = tab === 'chats' ? 'flex' : 'none';
  $('#btn-search-toggle').style.display = tab === 'chats' ? 'flex' : 'none';
  $('#list-title').textContent =
    tab === 'chats' ? 'پیسفون' : (tab === 'contacts' ? 'مخاطبین' : 'تنظیمات');
  if (tab === 'contacts') renderContacts();
  if (tab === 'settings') renderSettings();
}));

/* SEARCH */
$('#btn-search-toggle').addEventListener('click', () => {
  const sb = $('#searchbar');
  const open = sb.style.display === 'none';
  sb.style.display = open ? 'block' : 'none';
  if (open) $('#search-input').focus();
  else { $('#search-input').value = ''; renderChatList(); }
});
$('#search-input').addEventListener('input', renderChatList);

/* NAV */
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
    chat = {
      id: c.id, name: c.name, type: 'private',
      avatar: c.avatar, verified: c.verified,
      online: Math.random() > .5,
      unread: 0, pinned: false, muted: false, messages: [], createdAt: Date.now()
    };
    state.chats.push(chat); save();
  }
  openChat(chat.id);
});

/* NEW CHAT */
$('#fab-new').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-title">گفتگوی جدید</div>
    <div class="sheet-item" data-nt="private">${icon('user')}گفتگوی شخصی</div>
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
  if (type === 'saved') {
    createChat({ name: 'پیام‌های ذخیره‌شده', type: 'saved' });
    return;
  }

  showPrompt(titles[type], '', val => {
    const name = val.trim();
    if (!name) { toast('نام نمی‌تونه خالی باشه'); return; }
    const data = {
      name, type,
      avatar: { type: 'gradient', value: hashInt(name, AV_GRADS.length) },
      verified: false
    };
    if (type === 'private') { data.online = true; }

    // ✅ برای گروه و کانال، تعداد اعضا رو بپرس
    if (type === 'group' || type === 'channel') {
      const defaultCount = type === 'group' ? '3' : '100';
      setTimeout(() => {
        showPrompt('تعداد اعضا', defaultCount, num => {
          const n = parseInt(num, 10);
          data.members = (isNaN(n) || n < 0) ? 0 : Math.min(n, 9999999);
          if (type === 'group') data.memberNames = [];
          finishCreateChat(data, type);
        });
      }, 220);
      return;
    }

    finishCreateChat(data, type);
  });
}

function finishCreateChat(data, type) {
  createChat(data);
  if (type === 'private') {
    const id = state.chats[state.chats.length - 1].id;
    state.contacts.push({
      id, name: data.name,
      avatar: data.avatar,
      verified: false
    });
    save(); renderContacts();
  }
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

/* SETTINGS */
$('#settings-body').addEventListener('click', e => {
  const row = e.target.closest('[data-act]');
  if (row) {
    const act = row.dataset.act;
    if (act === 'edit-name') showPrompt('نام شما', state.me.name, v => {
      if (!v.trim()) return;
      state.me.name = v.trim(); renderSettings(); renderChatList(); save(); toast('ذخیره شد');
    });
    if (act === 'edit-phone') showPrompt('شماره تلفن', state.me.phone, v => {
      state.me.phone = v.trim(); renderSettings(); save(); toast('ذخیره شد');
    });
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pisfon-backup.json';
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
        renderChatList(); renderSettings(); renderContacts();
        toast('پاک شد');
      });
    }
  }

  if (e.target.closest('#my-avatar-btn') || e.target.closest('#btn-edit-profile')) {
    openAvatarPicker('me', null);
    return;
  }

  const sw = e.target.closest('input[data-set]');
  if (sw) {
    state.settings[sw.dataset.set] = sw.checked;
    save();
  }
  const meSw = e.target.closest('input[data-me]');
  if (meSw) {
    state.me[meSw.dataset.me] = meSw.checked;
    renderSettings(); renderChatList();
    save();
    toast(state.me.verified ? 'تیک آبی فعال شد' : 'تیک آبی غیرفعال شد');
  }
});

/* MODAL */
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
      <button id="modal-ok" class="ok" style="color:var(--red)">حذف</button>
    </div>`;
  modalOverlay.classList.add('show');
  $('#modal-cancel').onclick = () => modalOverlay.classList.remove('show');
  $('#modal-ok').onclick = () => { modalOverlay.classList.remove('show'); onOk(); };
}
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('show');
});

/* ESC */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (sheetOverlay.classList.contains('show')) closeSheet();
    else if (emojiOverlay.classList.contains('show')) emojiOverlay.classList.remove('show');
    else if (avatarOverlay.classList.contains('show')) closeAvatarPicker();
    else if (modalOverlay.classList.contains('show')) modalOverlay.classList.remove('show');
    else if ($('#screen-chat').classList.contains('open')) closeChat();
  }
});

/* INIT */
/* ✅ علامت‌گذاری همه پیام‌های موجود به عنوان دیده‌شده (جلوگیری از انیمیشن مجدد) */
state.chats.forEach(c => c.messages.forEach(m => renderedMsgIds.add(m.id)));

renderChatList();
renderContacts();
renderSettings();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
