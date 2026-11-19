import { firebaseConfig } from './firebase-config.js';
import { LocalStore, initFirebase, platform } from './store.js';

const COLORS = [
  ['red', '빨강'], ['orange', '주황'], ['yellow', '노랑'], ['green', '초록'], ['blue', '파랑'],
  ['purple', '보라'], ['black', '검정'], ['gray', '회색'], ['white', '흰색'],
];
const COLOR_IDS = COLORS.map(c => c[0]);

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
};

const $ = id => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));
const pref = {
  get(k, d = null) { try { const v = localStorage.getItem('sn.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sn.' + k, v); } catch {} },
};

const S = {
  notes: new Map(), store: null, fb: null, fbError: null, user: null, unsub: null,
  view: pref.get('view', 'grid'), sort: pref.get('sort', 'updated'), theme: pref.get('theme', 'auto'),
  color: null, query: '', trash: false,
  syncing: false, draft: null, isNew: false, dirty: false, saveTimer: 0, lastEdit: 0, recheck: 0, status: 'local',
};

/* ================= 데이터 도우미 ================= */
function normalize(n) {
  const now = Date.now();
  return {
    id: String(n.id),
    type: n.type === 'check' ? 'check' : 'text',
    title: typeof n.title === 'string' ? n.title : '',
    body: typeof n.body === 'string' ? n.body : '',
    items: Array.isArray(n.items) ? n.items.map(i => ({ id: String(i.id || uid()), text: String(i.text ?? ''), done: !!i.done })) : [],
    color: COLOR_IDS.includes(n.color) ? n.color : 'yellow',
    pinned: !!n.pinned, deleted: !!n.deleted, deletedAt: Number(n.deletedAt) || 0,
    createdAt: Number(n.createdAt) || now, updatedAt: Number(n.updatedAt) || now,
  };
}
const isEmpty = n => !n.title.trim() && !n.body.trim() && !n.items.some(i => i.text.trim());
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
function setColorClass(node, color) {
  COLOR_IDS.forEach(c => node.classList.remove('c-' + c));
  node.classList.add('c-' + color);
}

/* ================= 시작 ================= */
function boot() {
  document.querySelectorAll('[data-icon]').forEach(e => { e.innerHTML = svg(e.dataset.icon); });
  applyTheme();
  buildColorUI();
  bindUI();

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
  if (local.length && !pref.get('migrated.' + user.uid)) {
    pref.set('migrated.' + user.uid, '1');
    setTimeout(() => {
      if (confirm(`이 기기에만 저장된 노트 ${local.length}개가 있어요. Google 계정으로 옮겨서 동기화할까요?`)) {
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
  showScreen('main');
  updateAccountUI();
  renderList();
  S.unsub = store.subscribe(onNotes, setStatus);
}
function stopStore() {
  if (S.unsub) { S.unsub(); S.unsub = null; }
  S.store = null;
}

function onNotes(list) {
  S.notes = new Map(list.map(n => { const x = normalize(n); return [x.id, x]; }));
  renderList();
  syncOpenEditor();
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
  const q = S.query.trim().toLowerCase();
  let list = [...S.notes.values()].filter(n => n.deleted === S.trash);
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

  const box = $('notes');
  box.className = 'notes ' + S.view;
  box.replaceChildren(...list.map(card));

  const empty = $('empty');
  empty.classList.toggle('hidden', list.length > 0);
  empty.textContent = S.trash ? '휴지통이 비어 있어요.'
    : (q || S.color) ? '찾는 노트가 없어요.'
    : '아직 노트가 없어요. 오른쪽 아래 + 버튼으로 만들어 보세요.';

  $('trashLabel').classList.toggle('hidden', !S.trash);
  $('mTrash').textContent = S.trash ? '노트 목록으로' : '휴지통';
  $('mEmptyTrash').classList.toggle('hidden', !S.trash);
  $('fabWrap').classList.toggle('hidden', S.trash);
  $('btnView').innerHTML = svg(S.view === 'grid' ? 'list' : 'grid');
  $('btnView').title = S.view === 'grid' ? '목록으로 보기' : '격자로 보기';
  $('sortMenu').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.sort === S.sort));
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
  const meta = el('div', 'card-meta');
  const d = el('span'); d.textContent = fmtDate(n.deleted ? n.deletedAt : n.updatedAt);
  const x = el('span'); x.textContent = extra;
  meta.append(d, x);
  c.append(t, body, meta);
  c.onclick = () => openNote(n.id);
  c.onkeydown = e => { if (e.key === 'Enter') openNote(n.id); };
  return c;
}

/* ================= 편집기 ================= */
function newNote(type) {
  const now = Date.now();
  S.draft = {
    id: uid(), type, title: '', body: '',
    items: type === 'check' ? [{ id: uid(), text: '', done: false }] : [],
    color: pref.get('lastColor', 'yellow'), pinned: false, deleted: false, deletedAt: 0,
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
  $('edPalette').classList.add('hidden');
  fillEditor(false);
  $('editor').classList.remove('hidden');
  $('backdrop').classList.remove('hidden');
  history.pushState({ sn: 'editor' }, '');
  if (S.isNew) {
    if (S.draft.type === 'check') $('edList').querySelector('.ck-text')?.focus();
    else $('edText').focus();
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
  $('edRestore').classList.toggle('hidden', !trash);
  ['edPin', 'edType', 'edColor'].forEach(id => $(id).classList.toggle('hidden', trash));
  $('edPin').classList.toggle('on', d.pinned);
  $('edPin').title = d.pinned ? '고정 해제' : '상단 고정';
  $('edType').innerHTML = svg(d.type === 'check' ? 'text' : 'check');
  $('edType').title = d.type === 'check' ? '텍스트 노트로 전환' : '체크리스트로 전환';
  $('edDelete').title = trash ? '영구 삭제' : '삭제';
  setVal($('edTitle'), d.title, preserve);
  $('edTitle').readOnly = trash;
  const isCheck = d.type === 'check';
  $('edText').classList.toggle('hidden', isCheck);
  $('edList').classList.toggle('hidden', !isCheck);
  if (isCheck) renderItems(preserve ? focusedItem() : null);
  else { setVal($('edText'), d.body, preserve); $('edText').readOnly = trash; }
  updateMeta();
}
function updateMeta() {
  const d = S.draft; if (!d) return;
  $('edMeta').textContent = S.isNew ? '새 노트' : `수정 ${new Date(d.updatedAt).toLocaleString('ko-KR')}`;
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
  if (S.dirty || Date.now() - S.lastEdit < 1500) {
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
  S.draft = null; S.isNew = false; S.dirty = false;
  clearTimeout(S.recheck);
  $('editor').classList.add('hidden');
  $('backdrop').classList.add('hidden');
  $('edPalette').classList.add('hidden');
  if (document.activeElement && $('editor').contains(document.activeElement)) document.activeElement.blur();
  renderList();
}

function toggleType() {
  const d = S.draft;
  if (d.type === 'text') {
    const lines = d.body.split('\n').filter(l => l.trim());
    d.items = (lines.length ? lines : ['']).map(text => ({ id: uid(), text, done: false }));
    d.body = ''; d.type = 'check';
  } else {
    d.body = d.items.map(i => i.text).join('\n');
    d.items = []; d.type = 'text';
  }
  edited();
  fillEditor(false);
  if (d.type === 'text') $('edText').focus();
}

function restoreNote(copy) {
  const n = { ...copy, deleted: false, deletedAt: 0, updatedAt: Date.now() };
  S.store.save(n);
}

/* ================= 이벤트 ================= */
function closeMenus(except) {
  ['sortMenu', 'moreMenu', 'fabMenu'].forEach(id => { if (id !== except) $(id).classList.add('hidden'); });
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
  $('fabMenu').onclick = e => { const b = e.target.closest('[data-new]'); if (b) { closeMenus(); newNote(b.dataset.new); } };
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap, .fab-wrap')) closeMenus(); });

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

  // 편집기
  $('edBack').onclick = requestClose;
  $('backdrop').onclick = requestClose;
  $('edTitle').oninput = e => { S.draft.title = e.target.value; edited(); };
  $('edTitle').onkeydown = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    if (S.draft.type === 'check') $('edList').querySelector('.ck-text')?.focus(); else $('edText').focus();
  };
  $('edText').oninput = e => { S.draft.body = e.target.value; edited(); };
  $('edPin').onclick = () => { S.draft.pinned = !S.draft.pinned; edited(); fillEditor(true); };
  $('edType').onclick = toggleType;
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
    if (S.isNew && isEmpty(d)) { requestClose(); return; }
    d.deleted = true; d.deletedAt = Date.now();
    S.isNew = false; S.dirty = true; flush();
    const copy = clone(d);
    closeEditorAfterDelete();
    toast('휴지통으로 옮겼어요', '실행 취소', () => restoreNote(copy));
  };

  addEventListener('popstate', () => { if (S.draft) closeEditorNow(); });
  if (platform === 'android') bindAndroidBack();
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.draft) {
      if (!$('edPalette').classList.contains('hidden')) $('edPalette').classList.add('hidden');
      else requestClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && S.store && !S.draft) { e.preventDefault(); newNote('text'); }
  });
  // 앱을 내리거나 닫을 때 바로 저장
  addEventListener('pagehide', flush);
  addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
// 안드로이드 뒤로가기: 열린 것부터 하나씩 닫고, 노트 목록에서 누를 때만 앱 종료
async function bindAndroidBack() {
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    const openMenu = ['sortMenu', 'moreMenu', 'fabMenu'].some(id => !$(id).classList.contains('hidden'));
    if (S.draft) {
      if (!$('edPalette').classList.contains('hidden')) $('edPalette').classList.add('hidden');
      else requestClose();
    } else if (openMenu) {
      closeMenus();
    } else if (S.trash) {
      S.trash = false; renderList(); scrollTo(0, 0);
    } else if (S.query) {
      S.query = ''; $('search').value = ''; $('search').blur(); renderList();
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
