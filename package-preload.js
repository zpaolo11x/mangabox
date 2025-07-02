// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const keytar = require('keytar');

contextBridge.exposeInMainWorld('electronAPI', {
	minimize: () => ipcRenderer.send('window-minimize'),
	maximize: () => ipcRenderer.send('window-maximize'),
	close: () => ipcRenderer.send('window-close'),
	onFullscreenChange: (callback) => ipcRenderer.on('fullscreen-changed', (_, isFullscreen) => callback(isFullscreen)),
	onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
	onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback),
	getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});

contextBridge.exposeInMainWorld('secureStore', {
	setCredentials: async (account, secret) => {
		return await keytar.setPassword(SERVICE, account, secret);
	},
	getCredentials: async (account) => {
		return await keytar.getPassword(SERVICE, account);
	},
	deleteCredentials: async (account) => {
		return await keytar.deletePassword(SERVICE, account);
	}
});