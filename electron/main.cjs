// 미니노트 PC(Windows) 앱 - Electron 메인 프로세스
const { app, BrowserWindow, ipcMain, shell, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const DIST = path.join(__dirname, '..', 'dist');
let win;

// app:// 라는 고정 주소로 화면을 띄워야 노트 캐시(IndexedDB)와 로그인 상태가 안정적으로 유지됨
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function createWindow() {
  win = new BrowserWindow({
    width: 1100, height: 760, minWidth: 360, minHeight: 480,
    title: '미니노트',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#f4f4f2',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL('app://syncnote/index.html');
  // 외부 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusWindow);
  app.whenReady().then(() => {
    protocol.handle('app', req => {
      const p = decodeURIComponent(new URL(req.url).pathname);
      const file = path.normalize(path.join(DIST, p === '/' ? 'index.html' : p));
      if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });
    ipcMain.handle('google-sign-in', (_e, clientId, clientSecret) => googleSignIn(clientId, clientSecret));
    registerDrive();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}

function focusWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

/* ---------- 미니드라이브: 받은 파일을 폴더에 저장 ---------- */
// 화면(web/drive.js)이 파일 조각을 base64로 순서대로 넘겨주면 '이름.part' 에 이어 쓰고, 다 받으면 원래 이름으로 바꾼다
const saves = new Map(); // id → { fh, tmp, dir, name }
const safeName = n => (path.basename(String(n || '')).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || '파일').slice(0, 180);
function uniquePath(dir, name) {
  const ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name);
  for (let i = 1; fs.existsSync(p); i++) p = path.join(dir, `${base} (${i})${ext}`);
  return p;
}
function registerDrive() {
  const defaultFolder = () => path.join(app.getPath('downloads'), '미니드라이브');
  ipcMain.handle('drive-default-folder', defaultFolder);
  ipcMain.handle('drive-pick-folder', async (_e, current) => {
    const r = await dialog.showOpenDialog(win, {
      title: '받은 파일을 저장할 폴더', defaultPath: current && fs.existsSync(current) ? current : app.getPath('downloads'),
      properties: ['openDirectory', 'createDirectory'],
    });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('drive-save-begin', async (_e, folder, name) => {
    const dir = folder || defaultFolder();
    await fs.promises.mkdir(dir, { recursive: true });
    const id = crypto.randomBytes(8).toString('hex');
    const tmp = uniquePath(dir, safeName(name) + '.part');
    saves.set(id, { fh: await fs.promises.open(tmp, 'w'), tmp, dir, name: safeName(name) });
    return id;
  });
  ipcMain.handle('drive-save-append', async (_e, id, b64) => {
    const s = saves.get(id);
    if (!s) throw new Error('저장 작업을 찾을 수 없어요');
    await s.fh.write(Buffer.from(b64, 'base64'));
  });
  ipcMain.handle('drive-save-finish', async (_e, id) => {
    const s = saves.get(id);
    if (!s) throw new Error('저장 작업을 찾을 수 없어요');
    saves.delete(id);
    await s.fh.close();
    const final = uniquePath(s.dir, s.name);
    await fs.promises.rename(s.tmp, final);
    return final;
  });
  ipcMain.handle('drive-save-abort', async (_e, id) => {
    const s = saves.get(id);
    if (!s) return;
    saves.delete(id);
    await s.fh.close().catch(() => {});
    await fs.promises.unlink(s.tmp).catch(() => {});
  });
  // 파일 열기 / 폴더 열기. 실패하면 오류 글자를 돌려줌 (성공은 빈 글자)
  ipcMain.handle('drive-open', async (_e, p, isFolder) => {
    if (isFolder) await fs.promises.mkdir(p, { recursive: true }).catch(() => {});
    if (!fs.existsSync(p)) return 'not found';
    return shell.openPath(p);
  });
}

/* ---------- Google 로그인 (기본 브라우저 + 루프백 + PKCE) ---------- */
const b64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function resultPage(ok, msg) {
  return `<!doctype html><meta charset="utf-8"><title>미니노트</title>
<body style="font-family:'Malgun Gothic',sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#f4f4f2">
<div style="background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center">
<div style="font-size:42px">${ok ? '✅' : '⚠️'}</div><h2>${msg}</h2><p style="color:#666">이 창은 닫아도 됩니다.</p></div></body>`;
}

function googleSignIn(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    let redirectUri;

    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      const finish = (ok, msg) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(resultPage(ok, msg));
        clearTimeout(timer); server.close(); focusWindow();
      };
      if (u.searchParams.get('state') !== state) { finish(false, '잘못된 요청이에요'); return reject(new Error('state mismatch')); }
      const err = u.searchParams.get('error');
      if (err) { finish(false, '로그인이 취소됐어요'); return reject(new Error(err === 'access_denied' ? 'cancelled' : err)); }
      try {
        const r = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: u.searchParams.get('code'), client_id: clientId, client_secret: clientSecret,
            code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error_description || j.error || ('HTTP ' + r.status));
        finish(true, '로그인 완료! 미니노트로 돌아가세요');
        resolve({ idToken: j.id_token, accessToken: j.access_token });
      } catch (e) {
        finish(false, '로그인 처리 실패');
        reject(e);
      }
    });

    const timer = setTimeout(() => { server.close(); reject(new Error('cancelled (시간 초과)')); }, 5 * 60 * 1000);
    server.on('error', e => { clearTimeout(timer); reject(e); });
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: 'openid email profile', code_challenge: challenge, code_challenge_method: 'S256',
        state, prompt: 'select_account',
      }).toString();
      shell.openExternal(auth.toString());
    });
  });
}
