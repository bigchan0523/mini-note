const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('syncnote', {
  googleSignIn: (clientId, clientSecret) => ipcRenderer.invoke('google-sign-in', clientId, clientSecret),
  // 미니드라이브: 받은 파일을 PC 폴더에 저장
  driveDefaultFolder: () => ipcRenderer.invoke('drive-default-folder'),
  drivePickFolder: current => ipcRenderer.invoke('drive-pick-folder', current),
  driveSaveBegin: (folder, name) => ipcRenderer.invoke('drive-save-begin', folder, name),
  driveSaveAppend: (id, b64) => ipcRenderer.invoke('drive-save-append', id, b64),
  driveSaveFinish: id => ipcRenderer.invoke('drive-save-finish', id),
  driveSaveAbort: id => ipcRenderer.invoke('drive-save-abort', id),
  driveOpen: (p, isFolder) => ipcRenderer.invoke('drive-open', p, isFolder),
});
