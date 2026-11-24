// 저장소 두 가지: LocalStore(이 기기에만 저장) / FirebaseStore(Firestore 실시간 동기화 + 오프라인 캐시)
// 공통 인터페이스: subscribe(onNotes, onStatus, onFolders) → unsubscribe,
//   save(note), remove(id), saveMany(notes), saveFolder(folder), removeFolder(id)
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  GoogleAuthProvider, signInWithCredential, signInWithPopup, onAuthStateChanged, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, terminate, clearIndexedDbPersistence,
  disableNetwork, enableNetwork, waitForPendingWrites,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

export const platform = Capacitor.isNativePlatform() ? 'android' : (window.syncnote ? 'desktop' : 'browser');

const LS_KEY = 'sn.localNotes';
const LS_FKEY = 'sn.localFolders';
function readLocal(key = LS_KEY) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}
function writeLocal(obj, key = LS_KEY) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { console.error(e); }
}

export class LocalStore {
  constructor() {
    this.kind = 'local';
    this.listeners = new Set();
    this.fListeners = new Set();
    this._onStorage = e => { if (e.key === LS_KEY || e.key === LS_FKEY) this._emit(); };
    addEventListener('storage', this._onStorage);
  }
  static peek() { return Object.values(readLocal()); }
  static peekFolders() { return Object.values(readLocal(LS_FKEY)); }
  static clear() { try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_FKEY); } catch {} }
  _emit() {
    const list = Object.values(readLocal());
    const folders = Object.values(readLocal(LS_FKEY));
    this.fListeners.forEach(f => f(folders));
    this.listeners.forEach(f => f(list));
  }
  subscribe(onNotes, onStatus, onFolders) {
    this.listeners.add(onNotes);
    if (onFolders) { this.fListeners.add(onFolders); onFolders(Object.values(readLocal(LS_FKEY))); }
    onNotes(Object.values(readLocal()));
    onStatus?.('local');
    return () => {
      this.listeners.delete(onNotes); this.fListeners.delete(onFolders);
      removeEventListener('storage', this._onStorage);
    };
  }
  async save(note) { const o = readLocal(); o[note.id] = note; writeLocal(o); this._emit(); }
  async remove(id) { const o = readLocal(); delete o[id]; writeLocal(o); this._emit(); }
  async saveMany(notes) { const o = readLocal(); notes.forEach(n => { o[n.id] = n; }); writeLocal(o); this._emit(); }
  async saveFolder(f) { const o = readLocal(LS_FKEY); o[f.id] = f; writeLocal(o, LS_FKEY); this._emit(); }
  async removeFolder(id) { const o = readLocal(LS_FKEY); delete o[id]; writeLocal(o, LS_FKEY); this._emit(); }
}

// 폰/PC 앱은 웹 팝업 로그인이 막혀 있어서, 각 플랫폼 방식으로 Google ID 토큰을 받아 Firebase에 넘긴다.
async function nativeGoogleCredential(config) {
  if (platform === 'android') {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const r = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    return GoogleAuthProvider.credential(r.credential?.idToken, r.credential?.accessToken);
  }
  if (platform === 'desktop') {
    const c = config.googleDesktop || {};
    if (!c.clientId) {
      throw Object.assign(new Error('PC용 OAuth 클라이언트 ID(googleDesktop)가 firebase-config.js에 없어요.'), { code: 'app/no-desktop-client' });
    }
    const t = await window.syncnote.googleSignIn(c.clientId, c.clientSecret || '');
    return GoogleAuthProvider.credential(t.idToken, t.accessToken);
  }
  return null;
}

export function initFirebase(config) {
  const { googleDesktop, ...options } = config;
  const app = initializeApp(options);
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    ...(platform === 'browser' ? { popupRedirectResolver: browserPopupRedirectResolver } : {}),
  });
  let db;
  try {
    // 오프라인 캐시: 인터넷 없이도 읽기/쓰기 → 연결되면 자동 동기화
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn('오프라인 캐시 사용 불가', e);
    db = getFirestore(app);
  }

  return {
    onUser: cb => onAuthStateChanged(auth, cb),
    async signIn() {
      const cred = await nativeGoogleCredential(config);
      if (cred) return signInWithCredential(auth, cred);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    async signOut() {
      await signOut(auth);
      if (platform === 'android') {
        try { (await import('@capacitor-firebase/authentication')).FirebaseAuthentication.signOut(); } catch {}
      }
      // 이 기기에 남은 동기화 캐시 삭제
      try { await terminate(db); await clearIndexedDbPersistence(db); } catch (e) { console.warn(e); }
      location.reload();
    },
    storeFor: user => new FirebaseStore(db, user),
  };
}

class FirebaseStore {
  constructor(db, user) {
    this.kind = 'cloud';
    this.db = db;
    this.col = collection(db, 'users', user.uid, 'notes');
    this.fcol = collection(db, 'users', user.uid, 'folders');
  }
  subscribe(onNotes, onStatus, onFolders) {
    const offFolders = onFolders
      ? onSnapshot(this.fcol, snap => onFolders(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
          err => onStatus?.('error', err))
      : () => {};
    const offNotes = onSnapshot(this.col, { includeMetadataChanges: true }, snap => {
      onNotes(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      const m = snap.metadata;
      onStatus?.(m.hasPendingWrites ? 'pending' : m.fromCache ? 'cache' : 'synced');
    }, err => onStatus?.('error', err));
    return () => { offNotes(); offFolders(); };
  }
  saveFolder(f) { return setDoc(doc(this.fcol, f.id), f); }
  removeFolder(id) { return deleteDoc(doc(this.fcol, id)); }
  // 오프라인이면 서버 응답이 올 때까지 promise가 대기 → await 하지 않는다 (로컬 캐시엔 즉시 반영)
  save(note) { return setDoc(doc(this.col, note.id), note); }
  remove(id) { return deleteDoc(doc(this.col, id)); }
  // 연결을 끊었다 다시 붙여서 즉시 재동기화 → 보내지 못한 변경이 서버에 올라갈 때까지 대기(최대 10초)
  async syncNow() {
    await disableNetwork(this.db);
    await enableNetwork(this.db);
    await Promise.race([
      waitForPendingWrites(this.db),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);
  }
  saveMany(notes) {
    const jobs = [];
    for (let i = 0; i < notes.length; i += 400) {
      const b = writeBatch(this.db);
      notes.slice(i, i + 400).forEach(n => b.set(doc(this.col, n.id), n));
      jobs.push(b.commit());
    }
    return Promise.all(jobs);
  }
}
