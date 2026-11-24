// 미니드라이브: 폰 ↔ PC 파일 주고받기
// - 파일 목록(이름·크기·보낸 기기)은 Firestore 문서 users/{uid}/drive/{파일id} 로 실시간 동기화
// - 파일 내용은 768KB씩 잘라 users/{uid}/drive/{파일id}/chunks/{번호} 에 저장 (Firestore REST 직접 호출)
//   → Firebase 무료(Spark) 요금제 그대로, 추가 설정 없이 동작. 대신 용량 제한이 있어 아래 숫자로 막아둠.
import { platform } from './store.js';

/* ---------- 바꿔도 되는 설정값 ---------- */
const CHUNK = 768 * 1024;              // 조각 크기 (Firestore 문서 1MB 제한 때문에 이보다 키우면 안 됨)
const MAX_FILE = 300 * 1024 * 1024;    // 파일 하나 최대 300MB
const MAX_TOTAL = 900 * 1024 * 1024;   // 서버에 쌓아둘 수 있는 총량 (Firestore 무료 1GB)
const KEEP_DAYS = 7;                   // 서버에 올린 파일은 7일 뒤 자동 삭제 (받은 파일은 기기에 그대로 남음)
const PARALLEL = 4;                    // 동시에 주고받는 조각 수

const DAY = 86400000;
const ICONS = {
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  video: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
};
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const pref = {
  get(k, d = null) { try { const v = localStorage.getItem('sn.drive.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sn.drive.' + k, v); } catch {} },
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fmtSize(n) {
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + 'KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + 'GB';
}
function fmtTime(ms) {
  const d = new Date(ms), now = new Date();
  const hm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString() ? hm : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
}

/* ---------- 이 기기 ---------- */
const DEVICE = (() => {
  let id = pref.get('dev');
  if (!id) { id = newId(); pref.set('dev', id); }
  return { id, name: { desktop: 'PC', android: '폰', browser: '웹' }[platform] };
})();
// 이 기기에서 이미 받은 파일: { 파일id: 저장된 위치 }
const got = (() => { try { return JSON.parse(pref.get('got', '{}')) || {}; } catch { return {}; } })();
const saveGot = () => pref.set('got', JSON.stringify(got));
// 자동 받기는 '미니드라이브를 처음 켠 시각' 이후에 올라온 파일만 (새로 설치했을 때 옛 파일이 우르르 받아지는 것 방지)
const SINCE = (() => {
  let s = Number(pref.get('since'));
  if (!s) { s = Date.now(); pref.set('since', String(s)); }
  return s;
})();

const D = {
  api: null, unsub: null, files: [], jobs: new Map(), cancelled: new Set(),
  visible: false, cleaned: false, queue: [], working: false, toast: () => {}, onShare: () => {},
  folderLabel: '', native: null,
};

/* ================= 서버(Firestore REST) ================= */
const docsUrl = () => `https://firestore.googleapis.com/v1/projects/${D.api.projectId}/databases/(default)/documents`;
const chunkPath = (fileId, i) => `users/${D.api.uid}/drive/${fileId}/chunks/${i}`;

async function rest(method, url, body) {
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, {
        method,
        headers: { Authorization: 'Bearer ' + await D.api.token(), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) return await r.json();
      const text = (await r.text()).slice(0, 300);
      lastErr = new Error(r.status === 429 || /RESOURCE_EXHAUSTED/.test(text)
        ? '오늘 무료 사용량을 다 썼어요. 내일 다시 시도하세요.'
        : `서버 오류 ${r.status}`);
      lastErr.status = r.status;
      if (r.status >= 400 && r.status < 500 && r.status !== 429) throw lastErr; // 다시 해도 안 되는 오류
    } catch (e) {
      if (e.status && e.status < 500 && e.status !== 429) throw e;
      lastErr = e.status ? e : new Error('인터넷 연결을 확인하세요');
    }
    await sleep(600 * (attempt + 1) ** 2);
  }
  throw lastErr;
}
const putChunk = (fileId, i, b64) =>
  rest('PATCH', `${docsUrl()}/${chunkPath(fileId, i)}`, { fields: { d: { bytesValue: b64 } } });
const getChunk = async (fileId, i) =>
  (await rest('GET', `${docsUrl()}/${chunkPath(fileId, i)}`)).fields?.d?.bytesValue || '';
async function deleteChunks(fileId, count) {
  const prefix = `projects/${D.api.projectId}/databases/(default)/documents/`;
  for (let i = 0; i < count; i += 200) {
    const writes = [];
    for (let j = i; j < Math.min(count, i + 200); j++) writes.push({ delete: prefix + chunkPath(fileId, j) });
    await rest('POST', `${docsUrl()}:commit`, { writes });
  }
}

/* ================= 보낼 파일 읽기 / 받은 파일 쓰기 ================= */
// 보낼 파일(source): { name, size, type, read(offset, length) → base64, thumbBlob?(), done?() }
function blobSource(file) {
  return {
    name: file.name || '파일', size: file.size, type: file.type || '',
    read: (off, len) => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).slice(String(fr.result).indexOf(',') + 1));
      fr.onerror = () => rej(fr.error || new Error('파일을 읽지 못했어요'));
      fr.readAsDataURL(file.slice(off, off + len));
    }),
    thumbBlob: async () => file,
  };
}
// 폰에서 '공유'로 넘어온 파일 (네이티브 쪽이 앱 임시 폴더에 복사해 둔 것)
function sharedSource(f) {
  return {
    name: f.name, size: f.size, type: f.type || '',
    read: async (off, len) => (await D.native.readChunk({ path: f.path, offset: off, length: len })).data,
    thumbBlob: async () => {
      if (f.size > 40 * 1024 * 1024) return null;
      const { Capacitor } = await import('@capacitor/core');
      return (await fetch(Capacitor.convertFileSrc(f.path))).blob();
    },
    done: () => D.native.removeShared({ path: f.path }).catch(() => {}),
  };
}

// 받은 파일 쓰기(sink): append(base64) 를 순서대로 부르고 finish() → 저장된 위치
async function openSink(meta) {
  if (platform === 'desktop') {
    const id = await window.syncnote.driveSaveBegin(await desktopFolder(), meta.name);
    return {
      append: b64 => window.syncnote.driveSaveAppend(id, b64),
      finish: () => window.syncnote.driveSaveFinish(id),
      abort: () => window.syncnote.driveSaveAbort(id).catch(() => {}),
    };
  }
  if (platform === 'android') {
    const { id } = await D.native.beginSave({ name: meta.name, type: meta.type || '' });
    return {
      append: data => D.native.appendSave({ id, data }),
      finish: async () => (await D.native.finishSave({ id })).uri,
      abort: () => D.native.abortSave({ id }).catch(() => {}),
    };
  }
  // 브라우저(개발용): 메모리에 모았다가 다운로드
  const parts = [];
  return {
    append: async b64 => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      parts.push(u8);
    },
    finish: async () => {
      const a = el('a');
      a.href = URL.createObjectURL(new Blob(parts, { type: meta.type || 'application/octet-stream' }));
      a.download = meta.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      return '다운로드 폴더';
    },
    abort: async () => {},
  };
}

/* ================= 저장 폴더 ================= */
async function desktopFolder() {
  return pref.get('folder') || await window.syncnote.driveDefaultFolder();
}
async function refreshFolder() {
  try {
    if (platform === 'desktop') D.folderLabel = await desktopFolder();
    else if (platform === 'android') D.folderLabel = (await D.native.getFolder()).label;
    else D.folderLabel = '브라우저 다운로드 폴더';
  } catch (e) { console.error(e); D.folderLabel = '(알 수 없음)'; }
  $('dvFolder').textContent = D.folderLabel;
  $('dvFolder').title = D.folderLabel;
}
async function pickFolder() {
  try {
    if (platform === 'desktop') {
      const p = await window.syncnote.drivePickFolder(await desktopFolder());
      if (p) pref.set('folder', p);
    } else if (platform === 'android') {
      await D.native.pickFolder();
    } else return D.toast('브라우저에서는 저장 폴더를 바꿀 수 없어요');
    refreshFolder();
  } catch (e) { console.error(e); D.toast('폴더를 바꾸지 못했어요: ' + e.message); }
}
function openFolder() {
  if (platform === 'desktop') desktopFolder().then(p => window.syncnote.driveOpen(p, true));
  else D.toast('파일 앱에서 "' + D.folderLabel + '" 폴더를 열어 보세요');
}

/* ================= 보내기 ================= */
async function makeThumb(src) {
  if (!/^image\//.test(src.type) || !src.thumbBlob) return '';
  try {
    const blob = await src.thumbBlob();
    if (!blob) return '';
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 96 / Math.max(bmp.width, bmp.height));
    const c = el('canvas');
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return c.toDataURL('image/jpeg', 0.6);
  } catch { return ''; }
}

export async function sendSources(sources) {
  if (!sources.length) return;
  if (!D.api) { sources.forEach(s => s.done?.()); return D.toast('파일을 보내려면 Google 로그인이 필요해요'); }
  if (!navigator.onLine) { sources.forEach(s => s.done?.()); return D.toast('오프라인이에요. 인터넷에 연결한 뒤 다시 보내세요'); }
  let used = D.files.reduce((a, f) => a + (f.size || 0), 0);
  for (const src of sources) {
    if (src.size > MAX_FILE) { D.toast(`'${src.name}' 은(는) ${fmtSize(MAX_FILE)}보다 커서 보낼 수 없어요`); src.done?.(); continue; }
    if (used + src.size > MAX_TOTAL) { D.toast('미니드라이브가 가득 찼어요. 목록에서 파일을 지운 뒤 다시 보내세요'); src.done?.(); continue; }
    used += src.size;
    upload(src); // 여러 개는 동시에 올라감 (조각 단위로 번갈아)
  }
}

async function upload(src) {
  const id = newId();
  const meta = {
    id, name: String(src.name).slice(0, 200), size: src.size, type: src.type,
    chunks: Math.ceil(src.size / CHUNK), from: DEVICE.id, fromName: DEVICE.name,
    createdAt: Date.now(), state: 'uploading', thumb: await makeThumb(src), got: {},
  };
  const job = { kind: 'up', done: 0, total: meta.chunks };
  D.jobs.set(id, job);
  D.api.saveMeta(meta).catch(e => console.error(e));
  got[id] = ''; saveGot(); // 내가 보낸 파일은 내가 다시 받지 않음
  try {
    let next = 0;
    const worker = async () => {
      while (next < meta.chunks) {
        if (D.cancelled.has(id)) throw new Error('cancelled');
        const i = next++;
        await putChunk(id, i, await src.read(i * CHUNK, CHUNK));
        job.done++;
        paintProgress(id);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    if (D.cancelled.has(id)) throw new Error('cancelled');
    D.jobs.delete(id);
    D.api.patchMeta(id, { state: 'ready' }).catch(e => console.error(e));
    D.toast(`'${meta.name}' 보냄`);
  } catch (e) {
    D.jobs.delete(id);
    if (e.message !== 'cancelled') { console.error(e); D.toast(`'${meta.name}' 보내기 실패: ${e.message}`); }
    // 올리다 만 조각 정리
    deleteChunks(id, meta.chunks).catch(() => {});
    D.api.removeMeta(id).catch(() => {});
  } finally {
    src.done?.();
    render();
  }
}

/* ================= 받기 ================= */
function enqueue(meta, manual) {
  if (D.jobs.has(meta.id) || D.queue.some(q => q.meta.id === meta.id)) return;
  D.jobs.set(meta.id, { kind: 'down', done: 0, total: meta.chunks, waiting: true });
  D.queue.push({ meta, manual });
  render();
  pump();
}
async function pump() {
  if (D.working) return;
  D.working = true;
  while (D.queue.length) {
    const { meta, manual } = D.queue.shift();
    await download(meta, manual);
  }
  D.working = false;
}
async function download(meta, manual) {
  const id = meta.id, job = D.jobs.get(id);
  job.waiting = false;
  let sink;
  try {
    sink = await openSink(meta);
    const pending = new Map();
    let next = 0;
    for (let i = 0; i < meta.chunks; i++) {
      while (next < meta.chunks && pending.size < PARALLEL) {
        const p = getChunk(id, next); p.catch(() => {});
        pending.set(next++, p);
      }
      if (D.cancelled.has(id)) throw new Error('cancelled');
      const b64 = await pending.get(i);
      pending.delete(i);
      if (!b64 && meta.size) throw new Error('파일 조각이 없어요 (이미 삭제된 파일)');
      await sink.append(b64);
      job.done++;
      paintProgress(id);
    }
    const where = await sink.finish();
    got[id] = where || 'ok'; saveGot();
    D.jobs.delete(id);
    D.api.patchMeta(id, { ['got.' + DEVICE.id]: Date.now() }).catch(() => {});
    D.toast(`'${meta.name}' 받음`, platform === 'browser' ? null : '열기', () => openFile(meta));
    if (!manual && document.hidden) notify(`${meta.fromName || '다른 기기'}에서 파일 도착`, meta.name);
  } catch (e) {
    D.jobs.delete(id);
    await sink?.abort();
    if (e.message !== 'cancelled') {
      console.error(e);
      D.toast(`'${meta.name}' 받기 실패: ${e.message}`);
      got[id] = ''; saveGot(); // 자동으로 계속 다시 시도하지 않게. 목록의 받기 버튼으로 다시 받을 수 있음
    }
  }
  render();
}
function notify(title, body) {
  try { if (platform === 'desktop') new Notification(title, { body }); } catch {}
}
function openFile(meta) {
  const where = got[meta.id];
  if (!where) return;
  if (platform === 'desktop') {
    window.syncnote.driveOpen(where, false).then(err => { if (err) D.toast('파일을 열지 못했어요. 옮겼거나 지운 파일일 수 있어요'); });
  } else if (platform === 'android') {
    D.native.openFile({ uri: where, type: meta.type || '' }).catch(() => D.toast('이 파일을 열 수 있는 앱이 없어요'));
  }
}

/* ================= 삭제 / 정리 ================= */
async function removeFile(meta) {
  D.cancelled.add(meta.id);
  D.queue = D.queue.filter(q => q.meta.id !== meta.id);
  if (D.jobs.get(meta.id)?.waiting) D.jobs.delete(meta.id);
  try {
    await deleteChunks(meta.id, meta.chunks || 0);
    await D.api.removeMeta(meta.id);
  } catch (e) { console.error(e); D.toast('삭제 실패: ' + e.message); }
}
// 7일 지난 파일, 하루 넘게 '올리는 중'으로 멈춘 파일 정리 (앱 켤 때 한 번)
function cleanup() {
  if (D.cleaned || !navigator.onLine) return;
  D.cleaned = true;
  const now = Date.now();
  D.files.forEach(f => {
    const old = now - f.createdAt > KEEP_DAYS * DAY;
    const stuck = f.state !== 'ready' && now - f.createdAt > DAY && !D.jobs.has(f.id);
    if (old || stuck) removeFile(f);
  });
  // 서버에서 사라진 파일의 '받은 기록'도 정리
  const alive = new Set(D.files.map(f => f.id));
  let changed = false;
  Object.keys(got).forEach(id => { if (!alive.has(id) && !D.jobs.has(id)) { delete got[id]; changed = true; } });
  if (changed) saveGot();
}

/* ================= 화면 ================= */
function onFiles(list) {
  D.files = list.filter(f => f && f.name).sort((a, b) => b.createdAt - a.createdAt);
  cleanup();
  // 다른 기기가 올린 새 파일 자동 받기
  if (pref.get('auto', '1') === '1' && platform !== 'browser') {
    D.files.forEach(f => {
      if (f.state === 'ready' && f.from !== DEVICE.id && !(f.id in got) && !f.got?.[DEVICE.id] && f.createdAt >= SINCE) enqueue(f, false);
    });
  }
  render();
}

function render() {
  if (!D.visible) return;
  const loggedIn = !!D.api;
  $('dvNeedLogin').classList.toggle('hidden', loggedIn);
  $('dvBody').classList.toggle('hidden', !loggedIn);
  if (!loggedIn) return;

  const used = D.files.reduce((a, f) => a + (f.size || 0), 0);
  $('dvUsageBar').style.width = Math.min(100, used / MAX_TOTAL * 100) + '%';
  $('dvUsageText').textContent = `${fmtSize(used)} / ${fmtSize(MAX_TOTAL)} 사용 · 올린 파일은 ${KEEP_DAYS}일 뒤 서버에서 자동 삭제 (받은 파일은 그대로 남아요)`;

  $('dvList').replaceChildren(...D.files.map(row));
  $('dvEmpty').classList.toggle('hidden', D.files.length > 0);
}

function row(f) {
  const r = el('div', 'dv-row');
  r.dataset.id = f.id;
  const ic = el('div', 'dv-ic');
  if (f.thumb && /^data:image\//.test(f.thumb)) { const im = el('img'); im.src = f.thumb; im.alt = ''; ic.append(im); }
  else ic.innerHTML = svg(/^image\//.test(f.type) ? 'image' : /^video\//.test(f.type) ? 'video' : 'file');

  const mine = f.from === DEVICE.id;
  const job = D.jobs.get(f.id);
  const info = el('div', 'dv-info');
  const name = el('div', 'dv-name', f.name); name.title = f.name;
  const left = Math.max(0, KEEP_DAYS - Math.floor((Date.now() - f.createdAt) / DAY));
  let state;
  if (job) state = job.waiting ? '받기 대기 중' : '';
  else if (f.state !== 'ready') state = mine ? '보내기 중단됨' : `${f.fromName || '다른 기기'}에서 올리는 중…`;
  else if (mine) state = Object.keys(f.got || {}).some(d => d !== DEVICE.id) ? '상대 기기가 받음 ✓' : '보냄 · 상대 기기가 아직 안 받음';
  else state = got[f.id] ? '받음 ✓' : '아직 안 받음';
  const sub = el('div', 'dv-sub',
    `${mine ? '이 기기에서 보냄' : (f.fromName || '다른 기기') + '에서'} · ${fmtSize(f.size || 0)} · ${fmtTime(f.createdAt)}${state ? ' · ' + state : ''} · ${left}일 후 삭제`);
  info.append(name, sub);
  if (job && !job.waiting) {
    const bar = el('div', 'dv-prog'); const fill = el('i'); bar.append(fill);
    const pt = el('div', 'dv-sub dv-pt');
    info.append(bar, pt);
  }

  const btns = el('div', 'dv-btns');
  if (!job && f.state === 'ready') {
    if (got[f.id] && platform !== 'browser') {
      const b = el('button', 'icon-btn'); b.innerHTML = svg('open'); b.title = '열기'; b.onclick = () => openFile(f);
      btns.append(b);
    }
    if (!mine || !got[f.id]) {
      const b = el('button', 'icon-btn'); b.innerHTML = svg('download');
      b.title = got[f.id] ? '다시 받기' : '받기';
      b.onclick = () => { D.cancelled.delete(f.id); enqueue(f, true); };
      btns.append(b);
    }
  }
  const del = el('button', 'icon-btn'); del.innerHTML = svg('delete');
  del.title = job ? '취소' : '서버에서 삭제';
  del.onclick = () => {
    if (!job && !confirm(`'${f.name}' 을(를) 미니드라이브에서 삭제할까요?\n이미 받아서 저장한 파일은 지워지지 않아요.`)) return;
    removeFile(f);
  };
  btns.append(del);

  r.append(ic, info, btns);
  if (job && !job.waiting) setTimeout(() => paintProgress(f.id));
  return r;
}
function paintProgress(id) {
  const job = D.jobs.get(id);
  const r = D.visible && job && $('dvList').querySelector(`.dv-row[data-id="${id}"]`);
  if (!r) return;
  const pct = job.total ? Math.round(job.done / job.total * 100) : 100;
  const fill = r.querySelector('.dv-prog i'), pt = r.querySelector('.dv-pt');
  if (!fill) return render();
  fill.style.width = pct + '%';
  pt.textContent = `${job.kind === 'up' ? '보내는 중' : '받는 중'} ${pct}%`;
}

/* ================= 바깥(app.js)에서 쓰는 함수 ================= */
export async function driveInit({ toast, onShare }) {
  D.toast = toast; D.onShare = onShare || (() => {});
  $('dvSendIcon').innerHTML = svg('upload');
  $('dvFolderIcon').innerHTML = svg('folder');
  $('dvHint').textContent = platform === 'android'
    ? '갤러리나 파일 앱에서 공유 → 미니노트를 고르면 바로 보내져요.'
    : platform === 'desktop' ? '이 화면에 파일을 끌어다 놓거나, 복사한 이미지를 Ctrl+V 해도 돼요.' : '';
  $('dvSend').onclick = () => $('dvInput').click();
  $('dvInput').onchange = e => { sendSources([...e.target.files].map(blobSource)); e.target.value = ''; };
  $('dvPick').onclick = pickFolder;
  $('dvOpen').onclick = openFolder;
  $('dvOpen').classList.toggle('hidden', platform !== 'desktop');
  const auto = $('dvAuto');
  auto.checked = pref.get('auto', '1') === '1';
  auto.onchange = () => { pref.set('auto', auto.checked ? '1' : '0'); if (auto.checked) onFiles(D.files); };
  $('dvAutoRow').classList.toggle('hidden', platform === 'browser');

  // PC: 끌어다 놓기, 붙여넣기
  addEventListener('dragover', e => { if (D.visible && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); $('drive').classList.add('dragging'); } });
  addEventListener('dragleave', e => { if (!e.relatedTarget) $('drive').classList.remove('dragging'); });
  addEventListener('drop', e => {
    $('drive').classList.remove('dragging');
    if (!D.visible || !e.dataTransfer?.files?.length) return;
    e.preventDefault();
    sendSources([...e.dataTransfer.files].filter(f => f.size || f.type).map(blobSource));
  });
  addEventListener('paste', e => {
    if (!D.visible || !e.clipboardData?.files?.length) return;
    e.preventDefault();
    sendSources([...e.clipboardData.files].map(f => {
      const s = blobSource(f);
      if (f.name === 'image.png') s.name = `붙여넣기 ${new Date().toLocaleString('ko-KR').replace(/[:.]/g, '-')}.png`;
      return s;
    }));
  });

  // 폰: '공유'로 들어온 파일
  if (platform === 'android') {
    const { registerPlugin } = await import('@capacitor/core');
    D.native = registerPlugin('MiniDrive');
    D.native.addListener('shared', takeShared);
    takeShared();
  }
  refreshFolder();
}
async function takeShared() {
  try {
    const { files } = await D.native.getShared();
    if (!files?.length) return;
    D.onShare();
    // 로그인 확인이 끝날 때까지 잠깐 기다림 (앱이 꺼져 있다가 공유로 켜진 경우)
    for (let i = 0; i < 40 && !D.api; i++) await sleep(250);
    sendSources(files.map(sharedSource));
  } catch (e) { console.error(e); }
}

export function driveStart(api) {
  driveStop();
  D.api = api;
  D.cleaned = false;
  D.unsub = api.subscribe(onFiles, e => { console.error(e); D.toast('미니드라이브 목록 오류: ' + (e.code || e.message)); });
  render();
}
export function driveStop() {
  if (D.unsub) { D.unsub(); D.unsub = null; }
  D.api = null; D.files = []; D.queue = [];
  render();
}
export function driveSetVisible(on) {
  D.visible = on;
  $('drive').classList.toggle('hidden', !on);
  if (on) { refreshFolder(); render(); }
}
