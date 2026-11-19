const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('syncnote', {
  googleSignIn: (clientId, clientSecret) => ipcRenderer.invoke('google-sign-in', clientId, clientSecret),
});
