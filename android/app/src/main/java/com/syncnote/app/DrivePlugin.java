package com.syncnote.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 미니드라이브의 폰 쪽 기능 (화면 코드는 web/drive.js)
 *  1) 다른 앱에서 "공유"로 넘어온 파일 받기  → getShared / readChunk / removeShared
 *  2) 받은 파일 저장 폴더 고르기             → pickFolder / getFolder
 *  3) 받은 파일을 폴더에 이어 쓰기           → beginSave / appendSave / finishSave / abortSave
 *  4) 저장한 파일 열기                       → openFile
 * 저장 폴더를 고르지 않았으면 "다운로드/미니드라이브"에 저장한다.
 */
@CapacitorPlugin(name = "MiniDrive")
public class DrivePlugin extends Plugin {
    private static final String DEFAULT_DIR = "미니드라이브";
    private static final String DONE_FLAG = "minidrive_done";

    private final List<Uri> pendingUris = new ArrayList<>();
    private final Map<String, SaveJob> saves = new HashMap<>();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private int saveSeq = 0;

    private static class SaveJob {
        OutputStream out;
        Uri uri;          // 저장 중인 파일 주소
        boolean media;    // MediaStore(다운로드 폴더)에 쓰는 중인지
        File file;        // 안드로이드 9 이하에서만 사용
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("minidrive", Context.MODE_PRIVATE);
    }

    private File sharedDir() {
        File d = new File(getContext().getCacheDir(), "shared");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    @Override
    public void load() {
        // 예전에 공유받고 남은 임시 파일 정리 (하루 지난 것)
        File[] old = sharedDir().listFiles();
        if (old != null) {
            long cutoff = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
            for (File f : old) if (f.lastModified() < cutoff) f.delete();
        }
        collect(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (collect(intent)) notifyListeners("shared", new JSObject());
    }

    /** 공유 인텐트에서 파일 주소를 꺼내 대기 목록에 넣는다. */
    @SuppressWarnings("deprecation")
    private boolean collect(Intent intent) {
        if (intent == null || intent.getBooleanExtra(DONE_FLAG, false)) return false;
        String action = intent.getAction();
        List<Uri> found = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) found.add(u);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) for (Uri u : list) if (u != null) found.add(u);
        }
        if (found.isEmpty()) return false;
        intent.putExtra(DONE_FLAG, true); // 같은 공유를 두 번 처리하지 않게 표시
        synchronized (pendingUris) { pendingUris.addAll(found); }
        return true;
    }

    private static String sanitize(String name) {
        if (name == null) name = "";
        name = name.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]", "_").trim();
        if (name.isEmpty()) name = "file";
        return name.length() > 180 ? name.substring(name.length() - 180) : name;
    }

    private String mimeOf(String name, String given) {
        if (given != null && !given.isEmpty()) return given;
        int dot = name.lastIndexOf('.');
        if (dot >= 0) {
            String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1).toLowerCase());
            if (m != null) return m;
        }
        return "application/octet-stream";
    }

    /* ---------- 1) 공유로 들어온 파일 ---------- */

    @PluginMethod
    public void getShared(final PluginCall call) {
        final List<Uri> uris;
        synchronized (pendingUris) {
            uris = new ArrayList<>(pendingUris);
            pendingUris.clear();
        }
        // 큰 파일 복사가 오래 걸릴 수 있어 별도 스레드에서 앱 임시 폴더로 복사
        worker.execute(() -> {
            JSArray files = new JSArray();
            ContentResolver cr = getContext().getContentResolver();
            for (Uri u : uris) {
                try {
                    String name = null;
                    try (Cursor c = cr.query(u, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
                        if (c != null && c.moveToFirst()) name = c.getString(0);
                    } catch (Exception ignored) {}
                    if (name == null) name = u.getLastPathSegment();
                    name = sanitize(name);
                    String type = cr.getType(u);
                    if (name.indexOf('.') < 0 && type != null) {
                        String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(type);
                        if (ext != null) name = name + "." + ext;
                    }
                    File out = new File(sharedDir(), System.nanoTime() + "_" + name);
                    try (InputStream in = cr.openInputStream(u); OutputStream os = new FileOutputStream(out)) {
                        if (in == null) throw new Exception("열 수 없는 파일");
                        byte[] buf = new byte[256 * 1024];
                        int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                    }
                    JSObject f = new JSObject();
                    f.put("path", out.getAbsolutePath());
                    f.put("name", name);
                    f.put("size", out.length());
                    f.put("type", mimeOf(name, type));
                    files.put(f);
                } catch (Exception e) {
                    android.util.Log.e("MiniDrive", "공유 파일 복사 실패: " + u, e);
                }
            }
            JSObject ret = new JSObject();
            ret.put("files", files);
            call.resolve(ret);
        });
    }

    /** 임시 폴더 안의 파일인지 확인 (다른 경로는 읽거나 지우지 못하게) */
    private File sharedFile(String path) throws Exception {
        File f = new File(path == null ? "" : path).getCanonicalFile();
        if (!f.getPath().startsWith(sharedDir().getCanonicalPath() + File.separator)) throw new Exception("잘못된 경로");
        return f;
    }

    @PluginMethod
    public void readChunk(PluginCall call) {
        try {
            File f = sharedFile(call.getString("path"));
            long offset = call.getLong("offset", 0L);
            int length = call.getInt("length", 0);
            byte[] buf = new byte[length];
            int total = 0;
            try (RandomAccessFile raf = new RandomAccessFile(f, "r")) {
                raf.seek(offset);
                while (total < length) {
                    int n = raf.read(buf, total, length - total);
                    if (n < 0) break;
                    total += n;
                }
            }
            JSObject ret = new JSObject();
            ret.put("data", Base64.encodeToString(buf, 0, total, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("파일을 읽지 못했어요: " + e.getMessage());
        }
    }

    @PluginMethod
    public void removeShared(PluginCall call) {
        try { sharedFile(call.getString("path")).delete(); } catch (Exception ignored) {}
        call.resolve();
    }

    /* ---------- 2) 저장 폴더 ---------- */

    private JSObject folderInfo() {
        JSObject o = new JSObject();
        String tree = prefs().getString("tree", null);
        String label = "다운로드/" + DEFAULT_DIR;
        if (tree != null) {
            try {
                String id = DocumentsContract.getTreeDocumentId(Uri.parse(tree)); // 예: primary:Download/받은파일
                int colon = id.indexOf(':');
                String vol = colon >= 0 ? id.substring(0, colon) : "";
                String rest = colon >= 0 ? id.substring(colon + 1) : id;
                label = ("primary".equals(vol) ? "내장 저장공간" : "SD카드") + (rest.isEmpty() ? "" : "/" + rest);
            } catch (Exception e) {
                label = tree;
            }
        }
        o.put("custom", tree != null);
        o.put("label", label);
        return o;
    }

    @PluginMethod
    public void getFolder(PluginCall call) {
        call.resolve(folderInfo());
    }

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK && data != null && data.getData() != null) {
            Uri u = data.getData();
            try {
                getContext().getContentResolver().takePersistableUriPermission(u,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                prefs().edit().putString("tree", u.toString()).apply();
            } catch (Exception e) {
                call.reject("이 폴더는 쓸 수 없어요: " + e.getMessage());
                return;
            }
        }
        call.resolve(folderInfo());
    }

    /* ---------- 3) 받은 파일 저장 ---------- */

    @PluginMethod
    public void beginSave(PluginCall call) {
        String name = sanitize(call.getString("name", "file"));
        String type = mimeOf(name, call.getString("type", ""));
        ContentResolver cr = getContext().getContentResolver();
        SaveJob job = new SaveJob();
        try {
            // (가) 사용자가 고른 폴더
            String tree = prefs().getString("tree", null);
            if (tree != null) {
                try {
                    Uri treeUri = Uri.parse(tree);
                    Uri dir = DocumentsContract.buildDocumentUriUsingTree(treeUri, DocumentsContract.getTreeDocumentId(treeUri));
                    job.uri = DocumentsContract.createDocument(cr, dir, type, name);
                    if (job.uri != null) job.out = cr.openOutputStream(job.uri);
                } catch (Exception e) {
                    android.util.Log.w("MiniDrive", "고른 폴더에 저장 실패 → 기본 폴더 사용", e);
                    job.uri = null;
                    job.out = null;
                }
            }
            // (나) 기본: 다운로드/미니드라이브
            if (job.out == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, type);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + DEFAULT_DIR);
                    v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    job.uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (job.uri == null) throw new Exception("다운로드 폴더에 파일을 만들 수 없어요");
                    job.media = true;
                    job.out = cr.openOutputStream(job.uri);
                } else {
                    File dir = new File(getContext().getExternalFilesDir(null), DEFAULT_DIR);
                    dir.mkdirs();
                    File f = new File(dir, name);
                    for (int i = 1; f.exists(); i++) f = new File(dir, "(" + i + ") " + name);
                    job.file = f;
                    job.out = new FileOutputStream(f);
                }
            }
            if (job.out == null) throw new Exception("파일을 열 수 없어요");
            String id;
            synchronized (saves) {
                id = "s" + (++saveSeq);
                saves.put(id, job);
            }
            JSObject ret = new JSObject();
            ret.put("id", id);
            call.resolve(ret);
        } catch (Exception e) {
            discard(job);
            call.reject("저장을 시작하지 못했어요: " + e.getMessage());
        }
    }

    private SaveJob job(PluginCall call, boolean remove) {
        synchronized (saves) {
            String id = call.getString("id");
            return remove ? saves.remove(id) : saves.get(id);
        }
    }

    @PluginMethod
    public void appendSave(PluginCall call) {
        SaveJob j = job(call, false);
        if (j == null) { call.reject("저장 작업을 찾을 수 없어요"); return; }
        try {
            j.out.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) {
            call.reject("저장 실패(저장공간을 확인하세요): " + e.getMessage());
        }
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        SaveJob j = job(call, true);
        if (j == null) { call.reject("저장 작업을 찾을 수 없어요"); return; }
        try {
            j.out.close();
            if (j.media) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(j.uri, v, null, null);
            }
            if (j.file != null) {
                j.uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", j.file);
            }
            JSObject ret = new JSObject();
            ret.put("uri", j.uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            discard(j);
            call.reject("저장 마무리 실패: " + e.getMessage());
        }
    }

    @PluginMethod
    public void abortSave(PluginCall call) {
        discard(job(call, true));
        call.resolve();
    }

    /** 받다 만 파일 지우기 */
    private void discard(SaveJob j) {
        if (j == null) return;
        try { if (j.out != null) j.out.close(); } catch (Exception ignored) {}
        try {
            ContentResolver cr = getContext().getContentResolver();
            if (j.file != null) j.file.delete();
            else if (j.media && j.uri != null) cr.delete(j.uri, null, null);
            else if (j.uri != null) DocumentsContract.deleteDocument(cr, j.uri);
        } catch (Exception ignored) {}
    }

    /* ---------- 4) 저장한 파일 열기 ---------- */

    @PluginMethod
    public void openFile(PluginCall call) {
        try {
            Uri u = Uri.parse(call.getString("uri", ""));
            String type = call.getString("type", "");
            if (type == null || type.isEmpty()) type = getContext().getContentResolver().getType(u);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(u, type == null ? "*/*" : type);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("열 수 있는 앱이 없어요");
        }
    }
}
