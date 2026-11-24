import { firebaseConfig } from './firebase-config.js';
import { LocalStore, initFirebase, platform } from './store.js';

const COLORS = [
  ['red', '빨강'], ['orange', '주황'], ['yellow', '노랑'], ['green', '초록'], ['blue', '파랑'],
  ['purple', '보라'], ['black', '검정'], ['gray', '회색'], ['white', '흰색'],
];
const COLOR_IDS = COLORS.map(c => c[0]);
const TRASH_DAYS = 30;
const DAY = 86400000;

// 글자 색 / 글자 배경색 (밝은·어두운 테마 둘 다에서 읽히는 색)
const TEXT_COLORS = [
  ['기본', null], ['빨강', '#e53935'], ['주황', '#f57c00'], ['노랑', '#d4a000'], ['초록', '#2e9d5b'],
  ['하늘', '#1e9be8'], ['파랑', '#3f63e0'], ['보라', '#9254de'], ['회색', '#8d8d8d'],
];
const HILITES = [
  ['없음', null], ['빨강', 'rgba(255, 82, 82, 0.38)'], ['주황', 'rgba(255, 152, 0, 0.38)'],
  ['노랑', 'rgba(255, 225, 0, 0.45)'], ['초록', 'rgba(0, 200, 120, 0.35)'], ['파랑', 'rgba(33, 150, 243, 0.35)'],
  ['보라', 'rgba(156, 39, 176, 0.33)'], ['회색', 'rgba(128, 128, 128, 0.35)'],
];
const STYLES = [['제목 1', 'h1'], ['제목 2', 'h2'], ['제목 3', 'h3'], ['본문', 'div']];
const SIZES = [10, 12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32];
// '기본 색/배경 없음'은 표시용 색을 칠한 뒤 지우는 방식으로 처리
const SENT_FG = 'rgb(1, 2, 3)';
const SENT_BG = 'rgb(1, 2, 4)';

const ICONS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  pin: 'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  check: 'M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM5.54 11 2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z',
  text: 'M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z',
  palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  grid: 'M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z',
  list: 'M3 4h18v4H3V4zm0 6h18v4H3v-4zm0 6h18v4H3v-4z',
  sort: 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  restore: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  folderMove: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12v-3h-4v-4h4V8l5 5-5 5z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  chevron: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  checkbox: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  fcolor: 'M9.62 12 12 5.67 14.38 12H9.62zM11 3 5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2z',
  hilite: 'M16.56 8.94 7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10 10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z',
  bold: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z',
  undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  redo: 'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
};

const $ = id => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pref = {
  get(k, d = null) { try { const v = localStorage.getItem('sn.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sn.' + k, v); } catch {} },
};

const S = {
  notes: new Map(), folders: new Map(), store: null, fb: null, fbError: null, user: null, unsub: null,
  view: pref.get('view', 'grid'), sort: pref.get('sort', 'updated'), theme: pref.get('theme', 'auto'),
  color: null, query: '', trash: false, folder: null, purged: false,
  syncing: false, draft: null, isNew: false, dirty: false, saveTimer: 0, lastEdit: 0, recheck: 0, status: 'local',
  richDirty: false, hist: [], histIdx: -1, histTimer: 0, fontPx: 16, range: null, modalClose: null,
};

/* ================= 데이터 도우미 ================= */
function normalize(n) {
  const now = Date.now();
  return {
    id: String(n.id),
    type: n.type === 'check' ? 'check' : 'text',
    title: typeof n.title === 'string' ? n.title : '',
    body: typeof n.body === 'string' ? n.body : '',   // 일반 텍스트 (검색·미리보기·예전 버전 호환)
    html: typeof n.html === 'string' ? n.html : '',   // 서식 있는 본문
    items: Array.isArray(n.items) ? n.items.map(i => ({ id: String(i.id || uid()), text: String(i.text ?? ''), done: !!i.done })) : [],
    color: COLOR_IDS.includes(n.color) ? n.color : 'yellow',
    folderId: typeof n.folderId === 'string' ? n.folderId : '',
    pinned: !!n.pinned, deleted: !!n.deleted, deletedAt: Number(n.deletedAt) || 0,
    createdAt: Number(n.createdAt) || now, updatedAt: Number(n.updatedAt) || now,
  };
}
function normalizeFolder(f) {
  const now = Date.now();
  return {
    id: String(f.id), name: String(f.name || '새 폴더').slice(0, 60),
    color: COLOR_IDS.includes(f.color) ? f.color : 'yellow',
    createdAt: Number(f.createdAt) || now, updatedAt: Number(f.updatedAt) || now,
  };
}
const folderOf = n => (n.folderId && S.folders.has(n.folderId) ? n.folderId : '');
const isEmpty = n => !n.title.trim() && !n.body.replace(/[☐☑]/g, '').trim() && !n.items.some(i => i.text.trim());
function displayTitle(n) {
  if (n.title.trim()) return n.title.trim();
  const line = n.type === 'check' ? n.items.find(i => i.text.trim())?.text : n.body.split('\n').find(l => l.trim());
  return (line || '').trim() || '제목 없음';
}
const searchText = n => (n.title + '\n' + n.body + '\n' + n.items.map(i => i.text).join('\n')).toLowerCase();
function fmtDate(ms) {
  const d = new Date(ms), now = new Date();
  const hm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return hm;
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}
const daysLeft = n => Math.max(0, TRASH_DAYS - Math.floor((Date.now() - n.deletedAt) / DAY));
function setColorClass(node, color) {
  COLOR_IDS.forEach(c => node.classList.remove('c-' + c));
  node.classList.add('c-' + color);
}

/* ================= 서식 있는 본문 (HTML) ================= */
const ALLOWED_TAGS = new Set(['DIV', 'P', 'BR', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'H1', 'H2', 'H3']);
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'LINK', 'META', 'VIDEO', 'AUDIO', 'FORM', 'INPUT', 'TEXTAREA', 'BUTTON']);
const KEEP_STYLES = ['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration'];

// 동기화로 들어온 HTML도 안전한 태그·스타일만 남긴다
function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html || '';
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      if (DROP_TAGS.has(ch.tagName)) { ch.remove(); return; }
      if (!ALLOWED_TAGS.has(ch.tagName)) { walk(ch); ch.replaceWith(...ch.childNodes); return; }
      const cls = ch.classList;
      const isCb = cls.contains('cb'), on = cls.contains('on'), done = cls.contains('done');
      const keep = KEEP_STYLES.map(p => [p, ch.style.getPropertyValue(p)]).filter(([, v]) => v && !/url|expression/i.test(v));
      [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
      keep.forEach(([p, v]) => ch.style.setProperty(p, v));
      if (isCb) {
        ch.className = 'cb' + (on ? ' on' : '');
        ch.setAttribute('contenteditable', 'false');
        ch.textContent = '';
        return;
      }
      if (done) ch.className = 'done';
      walk(ch);
    });
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
const makeCb = on => { const s = el('span', 'cb' + (on ? ' on' : '')); s.setAttribute('contenteditable', 'false'); return s; };

function textToHtml(text) {
  if (!text) return '';
  return text.split('\n').map(line => {
    const m = line.match(/^([☐☑])\s?(.*)$/);
    if (m) {
      const on = m[1] === '☑';
      return `<div${on ? ' class="done"' : ''}><span class="cb${on ? ' on' : ''}" contenteditable="false"></span>${esc(m[2]) || '<br>'}</div>`;
    }
    return `<div>${esc(line) || '<br>'}</div>`;
  }).join('');
}
const BLOCK_RE = /^(DIV|P|H1|H2|H3)$/;
function htmlToPlain(root) {
  const lines = [];
  let cur = '';
  const walk = n => {
    for (const ch of n.childNodes) {
      if (ch.nodeType === 3) { cur += ch.nodeValue; continue; }
      if (ch.nodeType !== 1) continue;
      if (ch.tagName === 'BR') { if (ch.nextSibling || !BLOCK_RE.test(n.tagName)) { lines.push(cur); cur = ''; } continue; }
      if (ch.classList.contains('cb')) { cur += ch.classList.contains('on') ? '☑ ' : '☐ '; continue; }
      const block = BLOCK_RE.test(ch.tagName);
      if (block && cur) { lines.push(cur); cur = ''; }
      walk(ch);
      if (block) { lines.push(cur); cur = ''; }
    }
  };
  walk(root);
  if (cur) lines.push(cur);
  return lines.join('\n').replace(/ /g, ' ').replace(/\s+$/, '');
}

/* ================= 시작 ================= */
function boot() {
  document.querySelectorAll('[data-icon]').forEach(e => { e.innerHTML = svg(e.dataset.icon); });
  applyTheme();
  buildColorUI();
  bindUI();
  bindRich();
  trackViewport();

  const hasConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
  if (hasConfig) {
    try { S.fb = initFirebase(firebaseConfig); } catch (e) { console.error(e); S.fbError = e; }
  }
  if (S.fb) {
    S.fb.onUser(user => {
      if (user) useCloud(user);
      else if (pref.get('mode') === 'local') useLocal();
      else showLogin();
    });
  } else if (pref.get('mode') === 'local') useLocal();
  else showLogin();
}

// 폰 키보드가 올라오면 편집기 높이를 화면에 보이는 영역에 맞춰 하단 도구가 키보드 위에 오게 함
function trackViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const fit = () => document.documentElement.style.setProperty('--vvh', vv.height + 'px');
  vv.addEventListener('resize', fit);
  fit();
}

function showScreen(id) {
  $('login').classList.toggle('hidden', id !== 'login');
  $('main').classList.toggle('hidden', id !== 'main');
}

function showLogin() {
  stopStore();
  showScreen('login');
  $('btnGoogle').classList.toggle('hidden', !S.fb);
  const n = $('loginNotice');
  if (!S.fb) {
    n.textContent = S.fbError
      ? 'Firebase 설정을 읽지 못했어요: ' + S.fbError.message
      : '아직 Firebase 설정(firebase-config.js)이 비어 있어서 기기 간 동기화를 쓸 수 없어요. 지금은 이 기기에만 저장하는 모드로 쓸 수 있습니다.';
    n.classList.remove('hidden');
  } else n.classList.add('hidden');
}
const loginError = msg => { $('loginError').textContent = msg || ''; };

function authErrorText(e) {
  const c = e?.code || '';
  if (/cancel|popup-closed|12501/.test(c) || /cancel/i.test(e?.message || '')) return '';
  if (c === 'auth/network-request-failed') return '인터넷 연결이 필요해요. 처음 로그인할 때만 연결되면 되고, 그 다음부턴 오프라인에서도 쓸 수 있어요.';
  if (c === 'auth/operation-not-allowed' || c === 'auth/configuration-not-found') return 'Firebase 콘솔에서 Authentication > Google 로그인을 켜주세요.';
  if (c === 'auth/invalid-credential') return 'Google 토큰이 거부됐어요. Firebase Google 로그인 설정의 "외부 클라이언트 ID 허용 목록"에 PC용 클라이언트 ID를 추가했는지 확인하세요.';
  if (c === 'auth/unauthorized-domain') return '이 주소가 Firebase 승인된 도메인에 없어요.';
  return '로그인 실패: ' + (e?.message || c);
}

async function doSignIn() {
  loginError('');
  try { await S.fb.signIn(); }
  catch (e) {
    console.error(e);
    const msg = authErrorText(e);
    if (!msg) return;
    if (S.store) toast(msg); else loginError(msg);
  }
}

function useLocal() {
  pref.set('mode', 'local');
  S.user = null;
  startStore(new LocalStore());
}

function useCloud(user) {
  pref.set('mode', 'cloud');
  S.user = user;
  const store = S.fb.storeFor(user);
  startStore(store);
  // 로그인 전 이 기기에만 저장했던 노트를 계정으로 옮기기
  const local = LocalStore.peek();
  const localFolders = LocalStore.peekFolders();
  if (local.length && !pref.get('migrated.' + user.uid)) {
    pref.set('migrated.' + user.uid, '1');
    setTimeout(() => {
      if (confirm(`이 기기에만 저장된 노트 ${local.length}개가 있어요. Google 계정으로 옮겨서 동기화할까요?`)) {
        localFolders.forEach(f => store.saveFolder(normalizeFolder(f)).catch(e => console.error(e)));
        store.saveMany(local.map(normalize)).catch(e => console.error(e));
        LocalStore.clear();
        toast(`${local.length}개 노트를 계정으로 옮겼어요`);
      }
    }, 300);
  }
}

function startStore(store) {
  stopStore();
  S.store = store;
  S.notes = new Map();
  S.folders = new Map();
  S.folder = null;
  S.purged = false;
  showScreen('main');
  updateAccountUI();
  renderList();
  S.unsub = store.subscribe(onNotes, setStatus, onFolders);
}
function stopStore() {
  if (S.unsub) { S.unsub(); S.unsub = null; }
  S.store = null;
}

function onNotes(list) {
  S.notes = new Map(list.map(n => { const x = normalize(n); return [x.id, x]; }));
  purgeTrash();
  renderList();
  syncOpenEditor();
}
function onFolders(list) {
  S.folders = new Map(list.map(f => { const x = normalizeFolder(f); return [x.id, x]; }));
  renderList();
  if (S.draft) updateMeta();
}

// 휴지통에 들어간 지 30일 지난 노트는 영구 삭제 (앱을 켤 때 한 번)
function purgeTrash() {
  if (S.purged || !S.store || !S.notes.size) return;
  S.purged = true;
  const cutoff = Date.now() - TRASH_DAYS * DAY;
  [...S.notes.values()]
    .filter(n => n.deleted && n.deletedAt && n.deletedAt < cutoff)
    .forEach(n => Promise.resolve(S.store.remove(n.id)).catch(e => console.error(e)));
}

/* ================= 동기화 상태 ================= */
function setStatus(s, err) {
  if (s) S.status = s;
  if (err) {
    console.error(err);
    toast(err.code === 'permission-denied'
      ? '동기화 권한 오류: Firestore 보안 규칙을 확인하세요.'
      : '동기화 오류: ' + (err.code || err.message));
  }
  let st = S.status;
  if (st !== 'local' && !navigator.onLine) st = 'offline';
  const [label, cls] = {
    local: ['이 기기에만 저장', 'gray'],
    synced: ['동기화됨', 'ok'],
    pending: ['동기화 중…', 'warn'],
    cache: ['연결 중…', 'warn'],
    offline: ['오프라인 · 연결되면 자동 동기화', 'gray'],
    error: ['동기화 오류', 'bad'],
  }[st];
  const box = $('syncBtn');
  box.className = 'sync ' + cls + (S.syncing ? ' spin' : '');
  box.querySelector('b').textContent = label;
  box.title = label + ' · 누르면 지금 동기화';
}

// 동기화 버튼: 평소엔 자동으로 동기화되지만, 누르면 서버에 다시 연결해서 즉시 맞춘다
async function syncNow() {
  if (S.syncing) return;
  if (!S.user) {
    if (S.fb) return doSignIn();
    return toast('동기화하려면 Firebase 설정이 필요해요 (설정방법.md 참고)');
  }
  if (!navigator.onLine) return toast('오프라인이에요. 인터넷이 연결되면 자동으로 동기화돼요');
  flush();
  S.syncing = true; setStatus();
  try {
    await S.store.syncNow();
    toast('동기화 완료');
  } catch (e) {
    console.error(e);
    toast('서버에 연결하지 못했어요. 연결되면 자동으로 동기화돼요');
  } finally {
    S.syncing = false; setStatus();
  }
}
addEventListener('online', () => setStatus());
addEventListener('offline', () => setStatus());

function updateAccountUI() {
  $('acctInfo').textContent = S.user
    ? `${S.user.displayName || ''} ${S.user.email || ''}`.trim() + ' · 동기화 켜짐'
    : '로컬 모드 · 이 기기에만 저장돼요';
  $('mLogin').classList.toggle('hidden', !!S.user || !S.fb);
  $('mLogout').classList.toggle('hidden', !S.user);
}

/* ================= 목록 ================= */
function buildColorUI() {
  const bar = $('colorFilter');
  const all = el('button', 'chip active'); all.textContent = '전체'; all.dataset.color = '';
  bar.append(all);
  COLORS.forEach(([c, name]) => {
    const b = el('button', 'chip dot c-' + c); b.dataset.color = c; b.title = name; b.setAttribute('aria-label', name);
    bar.append(b);
  });
  bar.onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    S.color = b.dataset.color && S.color !== b.dataset.color ? b.dataset.color : null;
    bar.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', (x.dataset.color || null) === S.color));
    renderList();
  };

  const pal = $('edPalette');
  COLORS.forEach(([c, name]) => {
    const b = el('button', 'swatch c-' + c); b.dataset.color = c; b.title = name; b.setAttribute('aria-label', name);
    pal.append(b);
  });
  pal.onclick = e => {
    const b = e.target.closest('.swatch'); if (!b || !S.draft) return;
    S.draft.color = b.dataset.color;
    pref.set('lastColor', b.dataset.color);
    setColorClass($('editor'), b.dataset.color);
    markPalette();
    edited();
  };
}
function markPalette() {
  $('edPalette').querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === S.draft?.color));
}

function renderList() {
  if (S.folder && !S.folders.has(S.folder)) S.folder = null;
  const q = S.query.trim().toLowerCase();
  const inFolder = !S.trash && !q ? S.folder : null;
  let list = [...S.notes.values()].filter(n => n.deleted === S.trash);
  if (!S.trash && !q) list = list.filter(n => folderOf(n) === (inFolder || ''));
  if (S.color) list = list.filter(n => n.color === S.color);
  if (q) list = list.filter(n => searchText(n).includes(q));
  const cmp = {
    updated: (a, b) => b.updatedAt - a.updatedAt,
    created: (a, b) => b.createdAt - a.createdAt,
    color: (a, b) => COLOR_IDS.indexOf(a.color) - COLOR_IDS.indexOf(b.color) || b.updatedAt - a.updatedAt,
    title: (a, b) => displayTitle(a).localeCompare(displayTitle(b), 'ko'),
  }[S.sort] || ((a, b) => b.updatedAt - a.updatedAt);
  if (S.trash) list.sort((a, b) => b.deletedAt - a.deletedAt);
  else list.sort((a, b) => (b.pinned - a.pinned) || cmp(a, b));

  // 폴더 카드 (맨 바깥 목록에서만)
  const showFolders = !S.trash && !q && !inFolder && S.folders.size > 0;
  const fbox = $('folders');
  fbox.classList.toggle('hidden', !showFolders);
  if (showFolders) {
    const counts = {};
    S.notes.forEach(n => { if (!n.deleted && folderOf(n)) counts[n.folderId] = (counts[n.folderId] || 0) + 1; });
    const fl = [...S.folders.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    fbox.replaceChildren(...fl.map(f => folderCard(f, counts[f.id] || 0)));
  }

  // 폴더 경로 표시
  $('crumb').classList.toggle('hidden', !inFolder);
  if (inFolder) {
    $('crumbName').textContent = S.folders.get(inFolder).name;
    setColorClass($('crumb'), S.folders.get(inFolder).color);
  }

  const box = $('notes');
  box.className = 'notes ' + S.view;
  box.replaceChildren(...list.map(card));

  const empty = $('empty');
  empty.classList.toggle('hidden', list.length > 0 || showFolders);
  empty.textContent = S.trash ? '휴지통이 비어 있어요.'
    : (q || S.color) ? '찾는 노트가 없어요.'
    : inFolder ? '이 폴더에 노트가 없어요. 오른쪽 아래 + 버튼으로 만들어 보세요.'
    : '아직 노트가 없어요. 오른쪽 아래 + 버튼으로 만들어 보세요.';

  $('trashLabel').classList.toggle('hidden', !S.trash);
  $('trashNote').classList.toggle('hidden', !S.trash);
  $('mTrash').textContent = S.trash ? '노트 목록으로' : '휴지통';
  $('mEmptyTrash').classList.toggle('hidden', !S.trash);
  $('fabWrap').classList.toggle('hidden', S.trash);
  $('newFolderBtn').classList.toggle('hidden', !!inFolder);
  $('btnView').innerHTML = svg(S.view === 'grid' ? 'list' : 'grid');
  $('btnView').title = S.view === 'grid' ? '목록으로 보기' : '격자로 보기';
  $('sortMenu').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.sort === S.sort));
}

function folderCard(f, count) {
  const c = el('button', 'fcard');
  setColorClass(c, f.color);
  c.title = f.name;
  const ic = el('span', 'fcard-icon'); ic.innerHTML = svg('folder');
  const cnt = el('span', 'fcard-count'); cnt.textContent = count;
  const name = el('span', 'fcard-name'); name.textContent = f.name;
  c.append(ic, cnt, name);
  let timer = 0, longPressed = false;
  c.onpointerdown = () => { longPressed = false; timer = setTimeout(() => { longPressed = true; folderActions(f.id); }, 550); };
  c.onpointerup = c.onpointerleave = c.onpointercancel = () => clearTimeout(timer);
  c.onclick = () => { if (!longPressed) openFolder(f.id); };
  c.oncontextmenu = e => { e.preventDefault(); clearTimeout(timer); folderActions(f.id); };
  return c;
}

function card(n) {
  const c = el('article', 'card');
  setColorClass(c, n.color);
  c.tabIndex = 0;
  if (n.pinned && !n.deleted) { const p = el('span', 'card-pin'); p.innerHTML = svg('pin'); c.append(p); }
  const t = el('div', 'card-title'); t.textContent = displayTitle(n);
  const body = el('div', 'card-body');
  let extra = '';
  if (n.type === 'check') {
    const items = n.items.filter(i => i.text.trim());
    const rest = n.title.trim() ? items : items.slice(1);
    rest.slice(0, 10).forEach(i => {
      const r = el('div', 'card-ck' + (i.done ? ' done' : ''));
      r.textContent = (i.done ? '☑ ' : '☐ ') + i.text;
      body.append(r);
    });
    if (items.length) extra = `${items.filter(i => i.done).length}/${items.length}`;
  } else {
    let txt = n.body;
    if (!n.title.trim()) txt = txt.replace(/^\s*[^\n]*\n?/, '');
    body.textContent = txt.trim().slice(0, 500);
  }
  if (S.query && folderOf(n)) extra = '📁 ' + S.folders.get(n.folderId).name;
  const meta = el('div', 'card-meta');
  const d = el('span');
  d.textContent = n.deleted ? `${daysLeft(n)}일 후 삭제` : fmtDate(n.updatedAt);
  const x = el('span'); x.textContent = extra;
  meta.append(d, x);
  c.append(t, body, meta);
  // 우클릭(폰은 길게 누르기)하면 편집기 상단과 같은 기능 메뉴
  let timer = 0, longPressed = false;
  c.onpointerdown = e => {
    longPressed = false;
    if (e.pointerType === 'mouse') return;
    timer = setTimeout(() => { longPressed = true; noteActions(n.id); }, 550);
  };
  c.onpointerup = c.onpointerleave = c.onpointercancel = () => clearTimeout(timer);
  c.oncontextmenu = e => { e.preventDefault(); clearTimeout(timer); if (!longPressed) noteActions(n.id); };
  c.onclick = () => { if (!longPressed) openNote(n.id); };
  c.onkeydown = e => { if (e.key === 'Enter') openNote(n.id); };
  return c;
}

/* ================= 노트 카드 메뉴 ================= */
function saveNote(n, patch) {
  const nn = { ...n, ...patch, updatedAt: Date.now() };
  S.notes.set(nn.id, nn);
  Promise.resolve(S.store.save(nn)).catch(e => { console.error(e); toast('저장 실패: ' + (e.code || e.message)); });
  renderList();
  return nn;
}
async function noteActions(id) {
  const n = S.notes.get(id); if (!n) return;
  if (n.deleted) {
    const v = await pickSheet(displayTitle(n), [
      { label: '복원', value: 'restore' },
      { label: '영구 삭제', value: 'purge', danger: true },
    ]);
    if (v === 'restore') { restoreNote(n); toast('노트를 복원했어요'); }
    else if (v === 'purge' && confirm('이 노트를 영구 삭제할까요? 되돌릴 수 없어요.')) S.store.remove(id);
    return;
  }
  const v = await pickSheet(displayTitle(n), [
    { label: n.pinned ? '고정 해제' : '상단 고정', value: 'pin' },
    { label: n.type === 'check' ? '텍스트 노트로 전환' : '체크리스트로 전환', value: 'type' },
    { label: '폴더로 옮기기', value: 'folder' },
    { label: '색상 바꾸기', value: 'color' },
    { label: '삭제', value: 'delete', danger: true },
  ]);
  const cur = S.notes.get(id); if (!cur || !v) return;
  if (v === 'pin') saveNote(cur, { pinned: !cur.pinned });
  else if (v === 'type') saveNote(cur, convertType(clone(cur)));
  else if (v === 'folder') {
    const f = await chooseFolder(folderOf(cur));
    if (f === null) return;
    saveNote(S.notes.get(id) || cur, { folderId: f });
    toast(f ? `'${S.folders.get(f)?.name}' 폴더로 옮겼어요` : '폴더 밖으로 옮겼어요');
  } else if (v === 'color') {
    const c = await pickColor('노트 색상', cur.color);
    if (c && c !== cur.color) { saveNote(cur, { color: c }); pref.set('lastColor', c); }
  } else if (v === 'delete') {
    const copy = clone(cur);
    saveNote(cur, { deleted: true, deletedAt: Date.now() });
    toast(`휴지통으로 옮겼어요 (${TRASH_DAYS}일 후 자동 삭제)`, '실행 취소', () => restoreNote(copy));
  }
}
function pickColor(title, current) {
  return openModal((box, done) => {
    const h = el('h3'); h.textContent = title;
    const pal = el('div', 'modal-palette');
    COLORS.forEach(([c, name]) => {
      const b = el('button', 'swatch c-' + c + (c === current ? ' active' : ''));
      b.title = name; b.setAttribute('aria-label', name);
      b.onclick = () => done(c);
      pal.append(b);
    });
    const row = el('div', 'modal-actions');
    const cancel = el('button', 'btn-plain'); cancel.textContent = '닫기'; cancel.onclick = () => done(null);
    row.append(cancel);
    box.append(h, pal, row);
  });
}

/* ================= 폴더 ================= */
function openFolder(id) {
  S.folder = id;
  S.color = null;
  $('colorFilter').querySelectorAll('.chip').forEach(x => x.classList.toggle('active', !x.dataset.color));
  renderList();
  scrollTo(0, 0);
}
function leaveFolder() {
  S.folder = null;
  renderList();
  scrollTo(0, 0);
}
async function createFolder() {
  const name = (await askText('새 폴더', '', '만들기', '폴더 이름'))?.trim();
  if (!name) return null;
  const now = Date.now();
  const f = { id: uid(), name: name.slice(0, 60), color: 'yellow', createdAt: now, updatedAt: now };
  S.folders.set(f.id, f);
  Promise.resolve(S.store.saveFolder(f)).catch(e => { console.error(e); toast('폴더 저장 실패: ' + (e.code || e.message)); });
  renderList();
  return f.id;
}
async function renameFolder(id) {
  const f = S.folders.get(id); if (!f) return;
  const name = (await askText('폴더 이름 바꾸기', f.name, '저장', '폴더 이름'))?.trim();
  if (!name || name === f.name) return;
  const nf = { ...f, name: name.slice(0, 60), updatedAt: Date.now() };
  S.folders.set(id, nf);
  S.store.saveFolder(nf);
  renderList();
}
function deleteFolder(id) {
  const f = S.folders.get(id); if (!f) return;
  const inside = [...S.notes.values()].filter(n => n.folderId === id);
  const live = inside.filter(n => !n.deleted).length;
  const msg = live
    ? `'${f.name}' 폴더를 삭제할까요?\n안에 있는 노트 ${live}개는 지워지지 않고 폴더 밖으로 옮겨져요.`
    : `'${f.name}' 폴더를 삭제할까요?`;
  if (!confirm(msg)) return;
  if (inside.length) S.store.saveMany(inside.map(n => ({ ...n, folderId: '', updatedAt: Date.now() })));
  S.folders.delete(id);
  S.store.removeFolder(id);
  if (S.folder === id) S.folder = null;
  renderList();
  toast(`'${f.name}' 폴더를 삭제했어요`);
}
async function folderActions(id) {
  const f = S.folders.get(id); if (!f) return;
  const v = await pickSheet(f.name, [
    { label: '이름 바꾸기', value: 'rename' },
    { label: '색상 바꾸기', value: 'color' },
    { label: '폴더 삭제', value: 'delete', danger: true },
  ]);
  if (v === 'rename') renameFolder(id);
  else if (v === 'color') recolorFolder(id);
  else if (v === 'delete') deleteFolder(id);
}
async function recolorFolder(id) {
  const f = S.folders.get(id); if (!f) return;
  const c = await pickColor('폴더 색상', f.color);
  if (!c || c === f.color) return;
  const nf = { ...f, color: c, updatedAt: Date.now() };
  S.folders.set(id, nf);
  Promise.resolve(S.store.saveFolder(nf)).catch(e => { console.error(e); toast('폴더 저장 실패: ' + (e.code || e.message)); });
  renderList();
}
// 옮길 폴더 고르기: 폴더 id, '' (폴더 없음), null (취소)
async function chooseFolder(cur) {
  const opts = [{ label: '폴더 없음', value: '', active: !cur }]
    .concat([...S.folders.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map(f => ({ label: '📁 ' + f.name, value: f.id, active: cur === f.id })))
    .concat([{ label: '+ 새 폴더 만들기', value: '__new' }]);
  let v = await pickSheet('폴더로 옮기기', opts);
  if (v === null || v === undefined) return null;
  if (v === '__new') { v = await createFolder(); if (!v) return null; }
  return v === cur ? null : v;
}
async function moveDraftToFolder() {
  const d = S.draft; if (!d) return;
  const v = await chooseFolder(folderOf(d));
  if (v === null) return;
  d.folderId = v;
  edited();
  updateMeta();
  toast(v ? `'${S.folders.get(v)?.name}' 폴더로 옮겼어요` : '폴더 밖으로 옮겼어요');
}

/* ================= 대화상자 ================= */
function openModal(build) {
  closeModal();
  const box = $('modalBox');
  box.replaceChildren();
  $('modal').classList.remove('hidden');
  return new Promise(resolve => {
    S.modalClose = v => { $('modal').classList.add('hidden'); S.modalClose = null; resolve(v); };
    build(box, v => S.modalClose?.(v));
  });
}
function closeModal() { if (S.modalClose) S.modalClose(null); }

function askText(title, value, okLabel, placeholder) {
  return openModal((box, done) => {
    const h = el('h3'); h.textContent = title;
    const inp = el('input', 'modal-input'); inp.value = value || ''; inp.placeholder = placeholder || ''; inp.maxLength = 60;
    const row = el('div', 'modal-actions');
    const cancel = el('button', 'btn-plain'); cancel.textContent = '취소'; cancel.onclick = () => done(null);
    const ok = el('button', 'btn-main'); ok.textContent = okLabel || '확인'; ok.onclick = () => done(inp.value);
    inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done(inp.value); } };
    row.append(cancel, ok);
    box.append(h, inp, row);
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  });
}
function pickSheet(title, options) {
  return openModal((box, done) => {
    const h = el('h3'); h.textContent = title;
    const list = el('div', 'sheet-list');
    options.forEach(o => {
      const b = el('button', 'sheet-item' + (o.active ? ' active' : '') + (o.danger ? ' danger' : ''));
      b.textContent = o.label;
      b.onclick = () => done(o.value);
      list.append(b);
    });
    const row = el('div', 'modal-actions');
    const cancel = el('button', 'btn-plain'); cancel.textContent = '닫기'; cancel.onclick = () => done(null);
    row.append(cancel);
    box.append(h, list, row);
  });
}

/* ================= 편집기 ================= */
function newNote(type) {
  const now = Date.now();
  S.draft = {
    id: uid(), type, title: '', body: '', html: '',
    items: type === 'check' ? [{ id: uid(), text: '', done: false }] : [],
    color: pref.get('lastColor', 'yellow'), folderId: S.folder || '',
    pinned: false, deleted: false, deletedAt: 0,
    createdAt: now, updatedAt: now,
  };
  S.isNew = true;
  openEditorUI();
}
function openNote(id) {
  const n = S.notes.get(id); if (!n) return;
  S.draft = clone(n);
  S.isNew = false;
  openEditorUI();
}
function openEditorUI() {
  S.dirty = false;
  S.richDirty = false;
  S.range = null;
  hidePop();
  $('edPalette').classList.add('hidden');
  fillEditor(false);
  resetHist();
  $('editor').classList.remove('hidden');
  $('backdrop').classList.remove('hidden');
  history.pushState({ sn: 'editor' }, '');
  if (S.isNew) {
    if (S.draft.type === 'check') $('edList').querySelector('.ck-text')?.focus();
    else $('edRich').focus();
  }
}

function setVal(input, v, preserve) {
  if (input.value === v) return;
  if (preserve && document.activeElement === input) {
    const s = input.selectionStart, e = input.selectionEnd;
    input.value = v;
    input.setSelectionRange(Math.min(s, v.length), Math.min(e, v.length));
  } else input.value = v;
}

function fillEditor(preserve) {
  const d = S.draft, trash = d.deleted;
  setColorClass($('editor'), d.color);
  markPalette();
  $('edTrashBanner').classList.toggle('hidden', !trash);
  if (trash) $('edTrashBanner').textContent = `휴지통에 있는 노트예요. ${daysLeft(d)}일 후 자동으로 삭제돼요. 위의 복원 버튼으로 되살릴 수 있어요.`;
  $('edRestore').classList.toggle('hidden', !trash);
  ['edPin', 'edType', 'edColor', 'edFolder'].forEach(id => $(id).classList.toggle('hidden', trash));
  $('edPin').classList.toggle('on', d.pinned);
  $('edPin').title = d.pinned ? '고정 해제' : '상단 고정';
  $('edType').innerHTML = svg(d.type === 'check' ? 'text' : 'check');
  $('edType').title = d.type === 'check' ? '텍스트 노트로 전환' : '체크리스트로 전환';
  $('edDelete').title = trash ? '영구 삭제' : '삭제';
  setVal($('edTitle'), d.title, preserve);
  $('edTitle').readOnly = trash;
  const isCheck = d.type === 'check';
  $('edRich').classList.toggle('hidden', isCheck);
  $('edList').classList.toggle('hidden', !isCheck);
  $('edTools').classList.toggle('hidden', isCheck || trash);
  if (isCheck) { hidePop(); renderItems(preserve ? focusedItem() : null); }
  else setRich(d.html || textToHtml(d.body), preserve, trash);
  updateMeta();
}
function updateMeta() {
  const d = S.draft; if (!d) return;
  const f = folderOf(d) ? '📁 ' + S.folders.get(d.folderId).name + ' · ' : '';
  $('edMeta').textContent = f + (S.isNew ? '새 노트' : `수정 ${new Date(d.updatedAt).toLocaleString('ko-KR')}`);
}
function focusedItem() {
  const a = document.activeElement;
  return a?.classList.contains('ck-text') ? { id: a.dataset.id, pos: a.selectionStart } : null;
}

function renderItems(focus) {
  const box = $('edList'), d = S.draft, trash = d.deleted;
  box.replaceChildren();
  const focusAt = (id, pos) => renderItems({ id, pos });
  d.items.forEach((it, i) => {
    const row = el('div', 'ck-row' + (it.done ? ' done' : ''));
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = it.done; cb.disabled = trash;
    cb.onchange = () => { it.done = cb.checked; row.classList.toggle('done', it.done); edited(); };
    const inp = el('input', 'ck-text');
    inp.value = it.text; inp.dataset.id = it.id; inp.readOnly = trash; inp.placeholder = '항목';
    inp.oninput = () => { it.text = inp.value; edited(); };
    inp.onkeydown = e => {
      if (e.isComposing || e.keyCode === 229 || trash) return;
      const pos = inp.selectionStart;
      if (e.key === 'Enter') {
        e.preventDefault();
        const n = { id: uid(), text: it.text.slice(pos), done: false };
        it.text = it.text.slice(0, pos);
        d.items.splice(i + 1, 0, n);
        edited(); focusAt(n.id, 0);
      } else if (e.key === 'Backspace' && pos === 0 && inp.selectionEnd === 0 && i > 0) {
        e.preventDefault();
        const prev = d.items[i - 1], len = prev.text.length;
        prev.text += it.text;
        d.items.splice(i, 1);
        edited(); focusAt(prev.id, len);
      } else if (e.key === 'ArrowUp' && i > 0) {
        e.preventDefault(); box.querySelectorAll('.ck-text')[i - 1].focus();
      } else if (e.key === 'ArrowDown' && i < d.items.length - 1) {
        e.preventDefault(); box.querySelectorAll('.ck-text')[i + 1].focus();
      }
    };
    row.append(cb, inp);
    if (!trash) {
      const del = el('button', 'icon-btn ck-del'); del.innerHTML = svg('close'); del.title = '항목 삭제'; del.tabIndex = -1;
      del.onclick = () => { d.items.splice(i, 1); edited(); renderItems(); };
      row.append(del);
    }
    box.append(row);
  });
  if (!trash) {
    const add = el('button', 'ck-add');
    add.innerHTML = svg('add') + '<span>항목 추가</span>';
    add.onclick = () => { const n = { id: uid(), text: '', done: false }; d.items.push(n); edited(); focusAt(n.id, 0); };
    box.append(add);
  }
  if (focus) {
    const t = box.querySelector(`.ck-text[data-id="${CSS.escape(focus.id)}"]`);
    if (t) { t.focus(); const p = focus.pos ?? t.value.length; t.setSelectionRange(p, p); }
  }
}

/* ---------- 서식 있는 본문 편집 ---------- */
const rich = () => $('edRich');

function setRich(html, preserve, readOnly) {
  const r = rich();
  r.contentEditable = readOnly ? 'false' : 'true';
  const clean = sanitizeHtml(html);
  if (r.innerHTML !== clean) {
    const off = preserve && document.activeElement === r ? caretOffset(r) : null;
    r.innerHTML = clean;
    if (off !== null) setCaretOffset(r, off);
    if (preserve) snapshot();
  }
  markEmpty();
}
const markEmpty = () => { const r = rich(); r.classList.toggle('is-empty', !r.textContent.trim() && !r.querySelector('.cb')); };

// 편집 중인 서식 본문을 노트 데이터(html + 일반 텍스트)에 반영
function pullRich() {
  const d = S.draft;
  if (!d || d.type !== 'text' || !S.richDirty) return;
  normalizeSpans();
  d.html = sanitizeHtml(rich().innerHTML);
  d.body = htmlToPlain(rich());
  S.richDirty = false;
}

function caretOffset(root) {
  const s = getSelection();
  if (!s.rangeCount || !root.contains(s.anchorNode)) return null;
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(s.anchorNode, s.anchorOffset);
  return r.toString().length;
}
function setCaretOffset(root, off) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node, left = off;
  while ((node = w.nextNode())) {
    if (left <= node.length) { placeCaret(node, left); return; }
    left -= node.length;
  }
  caretToEnd(root);
}
function placeCaret(node, offset) {
  const r = document.createRange();
  r.setStart(node, offset); r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function caretToEnd(root) {
  const r = document.createRange();
  r.selectNodeContents(root); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

// 커서가 있는 줄(본문 바로 아래 블록)
function currentBlock() {
  const r = rich(), s = getSelection();
  if (!s.rangeCount || !r.contains(s.anchorNode)) return null;
  let n = s.anchorNode;
  if (n === r) n = r.childNodes[Math.min(s.anchorOffset, r.childNodes.length - 1)];
  while (n && n.parentNode !== r) n = n.parentNode;
  return n && n.nodeType === 1 ? n : null;
}
function blockOf(node) {
  const r = rich();
  while (node && node.parentNode !== r) node = node.parentNode;
  return node && node.nodeType === 1 ? node : null;
}

// 브라우저 서식 명령이 만든 흔적 정리: 기본색/배경없음 표시 제거, 글자 크기 적용
function normalizeSpans() {
  const r = rich();
  r.querySelectorAll('font').forEach(f => {
    const sp = el('span');
    if (f.getAttribute('size') === '7') sp.style.fontSize = S.fontPx + 'px';
    if (f.color) sp.style.color = f.color;
    sp.append(...f.childNodes);
    f.replaceWith(sp);
  });
  r.querySelectorAll('[style]').forEach(e => {
    if (e.style.color === SENT_FG) e.style.removeProperty('color');
    if (e.style.backgroundColor === SENT_BG) e.style.removeProperty('background-color');
    if (/xxx-large/.test(e.style.fontSize)) e.style.fontSize = S.fontPx + 'px';
    if (!e.getAttribute('style')) {
      e.removeAttribute('style');
      if (e.tagName === 'SPAN' && !e.className) e.replaceWith(...e.childNodes);
    }
  });
}

function restoreSel() {
  const r = rich();
  if (document.activeElement !== r) r.focus({ preventScroll: true });
  if (S.range && r.contains(S.range.startContainer)) {
    const s = getSelection(); s.removeAllRanges(); s.addRange(S.range);
  }
}
function exec(cmd, val) {
  restoreSel();
  snapshot();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(cmd, false, val);
  afterFormat();
}
function afterFormat() {
  normalizeSpans();
  S.richDirty = true;
  markEmpty();
  snapshot();
  edited();
  updateFmtState();
}

// 선택 위치를 노드 기준으로 저장/복원 (줄을 감싸거나 바꿔도 글자 노드는 그대로라 유지됨)
function saveRange() {
  const s = getSelection(), r = rich();
  if (!s.rangeCount || !r.contains(s.anchorNode)) return null;
  const rg = s.getRangeAt(0);
  const pt = (c, o) => {
    if (c !== r) return [c, o];
    const n = r.childNodes[o];
    return n ? [n, 0] : [r, r.childNodes.length];
  };
  return [...pt(rg.startContainer, rg.startOffset), ...pt(rg.endContainer, rg.endOffset)];
}
function loadRange(v, swap) {
  if (!v) return;
  const fix = n => (swap && swap.get(n)) || n;
  try {
    const rg = document.createRange();
    rg.setStart(fix(v[0]), v[0] === rich() ? rich().childNodes.length : v[1]);
    rg.setEnd(fix(v[2]), v[2] === rich() ? rich().childNodes.length : v[3]);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  } catch {}
}
// 본문 맨 위에 줄 블록 없이 놓인 글자들을 <div> 줄로 감싼다
function ensureBlocks() {
  const r = rich();
  if (!r.firstChild) { r.innerHTML = '<div><br></div>'; placeCaret(r.firstChild, 0); return; }
  let run = [];
  const wrap = () => {
    if (!run.length) return;
    const d = el('div');
    run[0].before(d);
    run.forEach(n => d.append(n));
    run = [];
  };
  [...r.childNodes].forEach(n => { if (n.nodeType === 1 && BLOCK_RE.test(n.tagName)) wrap(); else run.push(n); });
  wrap();
}
// 선택한 줄들의 스타일(제목1~3/본문)을 바꾼다
function setBlockTag(tag) {
  restoreSel();
  snapshot();
  const saved = saveRange();
  ensureBlocks();
  loadRange(saved);
  const s = getSelection();
  if (!s.rangeCount) return;
  const rg = s.getRangeAt(0);
  const a = blockOf(rg.startContainer === rich() ? rich().childNodes[rg.startOffset] || rich().lastChild : rg.startContainer);
  const b = blockOf(rg.endContainer === rich() ? rich().childNodes[rg.endOffset - 1] || rich().lastChild : rg.endContainer) || a;
  if (!a) return;
  const list = [];
  for (let n = a; n; n = n.nextElementSibling) { list.push(n); if (n === b) break; }
  const sel = saveRange();
  const swap = new Map();
  list.forEach(blk => {
    if (blk.tagName.toLowerCase() === tag) return;
    const nb = document.createElement(tag);
    if (blk.className) nb.className = blk.className;
    nb.append(...blk.childNodes);
    blk.replaceWith(nb);
    swap.set(blk, nb);
  });
  loadRange(sel, swap);
  afterFormat();
}

function insertCheckbox() {
  restoreSel();
  snapshot();
  const saved = saveRange();
  ensureBlocks();
  loadRange(saved);
  const blk = currentBlock();
  if (!blk) return;
  const ex = blk.querySelector(':scope > .cb');
  if (ex) {
    ex.remove();
    blk.classList.remove('done');
    if (!blk.firstChild) blk.innerHTML = '<br>';
  } else {
    const cb = makeCb(false);
    blk.prepend(cb);
    const s = getSelection();
    if (s.rangeCount && s.anchorNode === blk && s.anchorOffset === 0) {
      const rg = document.createRange(); rg.setStartAfter(cb); rg.collapse(true); s.removeAllRanges(); s.addRange(rg);
    }
  }
  afterFormat();
}

// 되돌리기 / 다시 실행 (서식 변경까지 포함해서 직접 관리)
function resetHist() {
  clearTimeout(S.histTimer);
  S.hist = [rich().innerHTML];
  S.histIdx = 0;
  updateUndoBtns();
}
function snapshot() {
  clearTimeout(S.histTimer);
  const h = rich().innerHTML;
  if (S.hist[S.histIdx] === h) return;
  S.hist = S.hist.slice(0, S.histIdx + 1);
  S.hist.push(h);
  if (S.hist.length > 100) S.hist.shift();
  S.histIdx = S.hist.length - 1;
  updateUndoBtns();
}
const scheduleSnapshot = () => { clearTimeout(S.histTimer); S.histTimer = setTimeout(snapshot, 600); };
function undo() { snapshot(); if (S.histIdx <= 0) return; S.histIdx--; applyHist(); }
function redo() { if (S.histIdx >= S.hist.length - 1) return; S.histIdx++; applyHist(); }
function applyHist() {
  const r = rich();
  r.innerHTML = S.hist[S.histIdx];
  r.focus({ preventScroll: true });
  caretToEnd(r);
  S.richDirty = true;
  markEmpty();
  edited();
  updateUndoBtns();
}
function updateUndoBtns() {
  $('fmtUndo').disabled = S.histIdx <= 0;
  $('fmtRedo').disabled = S.histIdx >= S.hist.length - 1;
}

// 커서 위치의 글자 크기·굵게 상태를 도구 막대에 표시
function updateFmtState() {
  const s = getSelection();
  if (!s.rangeCount || !rich().contains(s.anchorNode)) return;
  let n = s.anchorNode;
  if (n.nodeType === 3) n = n.parentNode;
  if (n && n.nodeType === 1) $('fmtSize').textContent = Math.round(parseFloat(getComputedStyle(n).fontSize));
  try { $('fmtBold').classList.toggle('on', document.queryCommandState('bold')); } catch {}
}

/* 서식 팝업 (글자 색, 배경색, 스타일, 크기) */
function hidePop() { $('fmtPop').classList.add('hidden'); $('fmtPop').dataset.kind = ''; }
function showPop(kind) {
  const pop = $('fmtPop');
  if (pop.dataset.kind === kind && !pop.classList.contains('hidden')) { hidePop(); return; }
  pop.dataset.kind = kind;
  pop.replaceChildren();
  const head = el('div', 'pop-head');
  const h = el('b');
  h.textContent = { color: '텍스트 색상', hilite: '글자 배경색', style: '글자 스타일', size: '글자 크기' }[kind];
  const x = el('button', 'icon-btn pop-x'); x.innerHTML = svg('close'); x.onclick = hidePop;
  head.append(h, x);
  const body = el('div', 'pop-body ' + kind);
  if (kind === 'color' || kind === 'hilite') {
    (kind === 'color' ? TEXT_COLORS : HILITES).forEach(([name, c]) => {
      const b = el('button', 'pop-swatch' + (c ? '' : ' none'));
      b.title = name; b.setAttribute('aria-label', name);
      if (c) b.style.background = c;
      b.onclick = () => {
        if (kind === 'color') { exec('foreColor', c || SENT_FG); $('fmtColorBar').style.background = c || 'currentColor'; }
        else { exec('backColor', c || SENT_BG); $('fmtHiliteBar').style.background = c || 'transparent'; }
        hidePop();
      };
      body.append(b);
    });
  } else if (kind === 'style') {
    restoreSel();
    const curTag = (currentBlock()?.tagName || '').toLowerCase();
    STYLES.forEach(([name, tag]) => {
      const b = el('button', 'pop-row s-' + tag + (curTag === tag || (tag === 'div' && !/^h[1-3]$/.test(curTag)) ? ' active' : ''));
      b.textContent = name;
      b.onclick = () => { setBlockTag(tag); hidePop(); };
      body.append(b);
    });
  } else if (kind === 'size') {
    const cur = Number($('fmtSize').textContent);
    SIZES.forEach(px => {
      const b = el('button', 'pop-size' + (px === cur ? ' active' : ''));
      b.textContent = px;
      b.onclick = () => { S.fontPx = px; exec('fontSize', '7'); $('fmtSize').textContent = px; hidePop(); };
      body.append(b);
    });
  }
  pop.append(head, body);
  pop.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => e.preventDefault()));
  pop.classList.remove('hidden');
}

function bindRich() {
  const r = rich();
  r.addEventListener('input', () => {
    normalizeSpans();
    S.richDirty = true;
    markEmpty();
    scheduleSnapshot();
    edited();
  });
  r.addEventListener('beforeinput', e => {
    if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
    if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
    if (e.inputType !== 'insertParagraph') return;
    // 체크박스 줄에서 엔터: 빈 줄이면 체크박스 끝내기, 아니면 다음 줄에도 체크박스
    const blk = currentBlock();
    const cb = blk?.querySelector(':scope > .cb');
    if (!cb) return;
    if (!blk.textContent.trim()) {
      e.preventDefault();
      snapshot();
      cb.remove(); blk.classList.remove('done');
      if (!blk.firstChild) blk.innerHTML = '<br>';
      placeCaret(blk, 0);
      afterFormat();
      return;
    }
    snapshot();
    setTimeout(() => {
      const nb = currentBlock();
      if (!nb || nb === blk) return;
      nb.classList.remove('done');
      nb.querySelectorAll('.cb').forEach(x => x.remove());
      const ncb = makeCb(false);
      nb.prepend(ncb);
      const rg = document.createRange(); rg.setStartAfter(ncb); rg.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
      afterFormat();
    }, 0);
  });
  // 체크박스 누르면 체크/해제
  r.addEventListener('click', e => {
    const cb = e.target.closest?.('.cb');
    if (!cb || S.draft?.deleted) return;
    e.preventDefault();
    snapshot();
    cb.classList.toggle('on');
    blockOf(cb)?.classList.toggle('done', cb.classList.contains('on'));
    afterFormat();
  });
  // 붙여넣기는 글자만 (다른 곳의 서식·이미지가 섞이지 않게)
  r.addEventListener('paste', e => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    if (s.rangeCount && r.contains(s.anchorNode)) { S.range = s.getRangeAt(0).cloneRange(); updateFmtState(); }
  });

  // 하단 서식 도구
  const tools = $('edTools');
  tools.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => e.preventDefault()));
  tools.onclick = e => {
    const b = e.target.closest('[data-fmt]'); if (!b || !S.draft) return;
    const f = b.dataset.fmt;
    if (f === 'check') { hidePop(); insertCheckbox(); }
    else if (f === 'bold') { hidePop(); exec('bold'); }
    else if (f === 'undo') { hidePop(); undo(); }
    else if (f === 'redo') { hidePop(); redo(); }
    else showPop(f);
  };
}

// 입력할 때마다 0.5초 뒤 저장 → 다른 기기에 즉시 반영
function edited() {
  S.dirty = true;
  S.lastEdit = Date.now();
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(flush, 500);
}
function flush() {
  clearTimeout(S.saveTimer);
  if (!S.dirty || !S.draft || !S.store) return;
  pullRich();
  S.dirty = false;
  const d = S.draft;
  if (S.isNew && isEmpty(d) && !d.deleted) return;
  S.isNew = false;
  d.updatedAt = Date.now();
  Promise.resolve(S.store.save(clone(d))).catch(e => { console.error(e); toast('저장 실패: ' + (e.code || e.message)); });
  updateMeta();
}

// 다른 기기에서 지금 열려있는 노트를 고쳤을 때 반영
function syncOpenEditor() {
  const d = S.draft; if (!d) return;
  const remote = S.notes.get(d.id);
  if (!remote) {
    if (!S.isNew && !S.dirty) { closeEditorNow(true); toast('다른 기기에서 삭제된 노트예요'); }
    return;
  }
  if (S.dirty || S.richDirty || Date.now() - S.lastEdit < 1500) {
    clearTimeout(S.recheck);
    S.recheck = setTimeout(syncOpenEditor, 1600);
    return;
  }
  if (remote.updatedAt <= d.updatedAt) return;
  S.draft = clone(remote);
  fillEditor(true);
}

function requestClose() {
  if (history.state?.sn === 'editor') history.back();
  else closeEditorNow();
}
function closeEditorNow(skipSave) {
  if (!S.draft) return;
  if (!skipSave) flush();
  const d = S.draft;
  if (!skipSave && !d.deleted && isEmpty(d) && S.notes.has(d.id)) S.store?.remove(d.id); // 빈 노트는 버림
  S.draft = null; S.isNew = false; S.dirty = false; S.richDirty = false;
  clearTimeout(S.recheck);
  hidePop();
  $('editor').classList.add('hidden');
  $('backdrop').classList.add('hidden');
  $('edPalette').classList.add('hidden');
  if (document.activeElement && $('editor').contains(document.activeElement)) document.activeElement.blur();
  renderList();
}

function toggleType() {
  const d = S.draft;
  pullRich();
  convertType(d);
  edited();
  fillEditor(false);
  resetHist();
  if (d.type === 'text') rich().focus();
}
// 텍스트 ↔ 체크리스트 변환 (노트 객체를 직접 고치고 그대로 돌려줌)
function convertType(d) {
  if (d.type === 'text') {
    const lines = d.body.split('\n').filter(l => l.replace(/^[☐☑]\s?/, '').trim());
    d.items = (lines.length ? lines : ['']).map(l => {
      const m = l.match(/^([☐☑])\s?(.*)$/);
      return { id: uid(), text: m ? m[2] : l, done: m ? m[1] === '☑' : false };
    });
    d.body = ''; d.html = ''; d.type = 'check';
  } else {
    d.body = d.items.map(i => i.text).join('\n');
    d.html = textToHtml(d.body);
    d.items = []; d.type = 'text';
  }
  return d;
}

function restoreNote(copy) {
  const n = { ...copy, deleted: false, deletedAt: 0, updatedAt: Date.now() };
  S.store.save(n);
}

/* ================= 이벤트 ================= */
const MENUS = ['sortMenu', 'moreMenu', 'fabMenu', 'folderMenu'];
function closeMenus(except) {
  MENUS.forEach(id => { if (id !== except) $(id).classList.add('hidden'); });
}
function toggleMenu(id) {
  closeMenus(id);
  $(id).classList.toggle('hidden');
}

function bindUI() {
  $('btnGoogle').onclick = doSignIn;
  $('btnLocal').onclick = () => { loginError(''); useLocal(); };

  $('search').oninput = e => { S.query = e.target.value; renderList(); };
  $('btnView').onclick = () => { S.view = S.view === 'grid' ? 'list' : 'grid'; pref.set('view', S.view); renderList(); };
  $('btnSort').onclick = e => { e.stopPropagation(); toggleMenu('sortMenu'); };
  $('sortMenu').onclick = e => {
    const b = e.target.closest('[data-sort]'); if (!b) return;
    S.sort = b.dataset.sort; pref.set('sort', S.sort); closeMenus(); renderList();
  };
  $('btnMore').onclick = e => { e.stopPropagation(); toggleMenu('moreMenu'); };
  $('fab').onclick = e => { e.stopPropagation(); toggleMenu('fabMenu'); };
  $('fabMenu').onclick = e => {
    const b = e.target.closest('[data-new]'); if (!b) return;
    closeMenus();
    if (b.dataset.new === 'folder') createFolder();
    else newNote(b.dataset.new);
  };
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap, .fab-wrap')) closeMenus(); });

  // 폴더 경로
  $('crumbHome').onclick = leaveFolder;
  $('btnFolderMore').onclick = e => { e.stopPropagation(); toggleMenu('folderMenu'); };
  $('fRename').onclick = () => { closeMenus(); renameFolder(S.folder); };
  $('fDelete').onclick = () => { closeMenus(); deleteFolder(S.folder); };

  $('mTrash').onclick = () => { S.trash = !S.trash; closeMenus(); renderList(); scrollTo(0, 0); };
  $('mEmptyTrash').onclick = () => {
    closeMenus();
    const del = [...S.notes.values()].filter(n => n.deleted);
    if (!del.length) return toast('휴지통이 이미 비어 있어요');
    if (!confirm(`휴지통의 노트 ${del.length}개를 영구 삭제할까요? 되돌릴 수 없어요.`)) return;
    del.forEach(n => S.store.remove(n.id));
  };
  $('mTheme').onclick = () => {
    S.theme = { auto: 'light', light: 'dark', dark: 'auto' }[S.theme] || 'auto';
    pref.set('theme', S.theme); applyTheme();
  };
  $('syncBtn').onclick = syncNow;
  $('mLogin').onclick = () => { closeMenus(); doSignIn(); };
  $('mLogout').onclick = () => {
    closeMenus();
    if (!confirm('로그아웃할까요? 이 기기의 동기화 캐시가 지워지고, 노트는 계정에 그대로 남아 있어요.')) return;
    pref.set('mode', '');
    S.fb.signOut();
  };

  // 대화상자 바깥을 누르면 닫기
  $('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };

  // 편집기
  $('edBack').onclick = requestClose;
  $('backdrop').onclick = requestClose;
  $('edTitle').oninput = e => { S.draft.title = e.target.value; edited(); };
  $('edTitle').onkeydown = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    if (S.draft.type === 'check') $('edList').querySelector('.ck-text')?.focus(); else rich().focus();
  };
  $('edPin').onclick = () => { S.draft.pinned = !S.draft.pinned; edited(); fillEditor(true); };
  $('edType').onclick = toggleType;
  $('edFolder').onclick = moveDraftToFolder;
  $('edColor').onclick = () => $('edPalette').classList.toggle('hidden');
  $('edRestore').onclick = () => {
    S.draft.deleted = false; S.draft.deletedAt = 0; edited(); flush(); fillEditor(false); toast('노트를 복원했어요');
  };
  $('edDelete').onclick = () => {
    const d = S.draft;
    if (d.deleted) {
      if (!confirm('이 노트를 영구 삭제할까요? 되돌릴 수 없어요.')) return;
      S.store.remove(d.id); S.dirty = false; S.isNew = false;
      closeEditorAfterDelete();
      return;
    }
    pullRich();
    if (S.isNew && isEmpty(d)) { requestClose(); return; }
    d.deleted = true; d.deletedAt = Date.now();
    S.isNew = false; S.dirty = true; flush();
    const copy = clone(d);
    closeEditorAfterDelete();
    toast(`휴지통으로 옮겼어요 (${TRASH_DAYS}일 후 자동 삭제)`, '실행 취소', () => restoreNote(copy));
  };

  addEventListener('popstate', () => { if (S.draft) closeEditorNow(); });
  if (platform === 'android') bindAndroidBack();
  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (S.modalClose) { closeModal(); return; }
      if (!S.draft) return;
      if (!$('fmtPop').classList.contains('hidden')) hidePop();
      else if (!$('edPalette').classList.contains('hidden')) $('edPalette').classList.add('hidden');
      else requestClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && S.store && !S.draft) { e.preventDefault(); newNote('text'); }
  });
  // 앱을 내리거나 닫을 때 바로 저장
  addEventListener('pagehide', flush);
  addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
// 안드로이드 뒤로가기: 열린 것부터 하나씩 닫고, 노트 목록 맨 바깥에서 누를 때만 앱 종료
async function bindAndroidBack() {
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    const openMenu = MENUS.some(id => !$(id).classList.contains('hidden'));
    if (S.modalClose) {
      closeModal();
    } else if (S.draft) {
      if (!$('fmtPop').classList.contains('hidden')) hidePop();
      else if (!$('edPalette').classList.contains('hidden')) $('edPalette').classList.add('hidden');
      else requestClose();
    } else if (openMenu) {
      closeMenus();
    } else if (S.trash) {
      S.trash = false; renderList(); scrollTo(0, 0);
    } else if (S.query) {
      S.query = ''; $('search').value = ''; $('search').blur(); renderList();
    } else if (S.folder) {
      leaveFolder();
    } else {
      flush();
      App.exitApp();
    }
  });
}

function closeEditorAfterDelete() {
  // 삭제 후 닫기: 빈 노트 정리 로직이 다시 지우지 않도록 skipSave
  const inHistory = history.state?.sn === 'editor';
  closeEditorNow(true);
  if (inHistory) history.back(); // popstate 시점엔 S.draft가 비어 있어 아무 일도 안 함
}

function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
  $('mTheme').textContent = '테마: ' + { auto: '시스템 따라가기', light: '밝게', dark: '어둡게' }[S.theme];
}

/* ================= 토스트 ================= */
let toastTimer = 0;
function toast(msg, actionLabel, action) {
  const t = $('toast');
  t.replaceChildren();
  const s = el('span'); s.textContent = msg; t.append(s);
  if (actionLabel) {
    const b = el('button'); b.textContent = actionLabel;
    b.onclick = () => { t.classList.add('hidden'); action(); };
    t.append(b);
  }
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), actionLabel ? 6000 : 3500);
}

document.documentElement.dataset.platform = platform;
boot();
