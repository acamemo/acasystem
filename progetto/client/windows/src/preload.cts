import type { ShellState, SubmitResult } from './shellState.ts';

// Preload in sandbox: CommonJS con il solo `require('electron')`.
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

/**
 * Ponte delle pagine locali del guscio (procedura guidata ed errori). Sull'interfaccia
 * scaricata non espone nulla: quelle pagine sono servite da http://127.0.0.1, non da file:.
 */
if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('acasystemShell', {
    getState: (): Promise<ShellState | null> => ipcRenderer.invoke('shell:get-state'),
    onState: (listener: (state: ShellState) => void): void => {
      ipcRenderer.on('shell:state', (_event, state: ShellState) => listener(state));
    },
    submit: (host: string, port: string): Promise<SubmitResult> => ipcRenderer.invoke('shell:submit', host, port),
    retry: (): Promise<void> => ipcRenderer.invoke('shell:retry'),
    changeAddress: (): Promise<void> => ipcRenderer.invoke('shell:change-address'),
    // Preparazione della centrale su questo PC (REP-20261120-001).
    setupChecks: (): Promise<void> => ipcRenderer.invoke('shell:setup-checks'),
    setupStart: (): Promise<void> => ipcRenderer.invoke('shell:setup-start'),
    setupCancel: (): Promise<void> => ipcRenderer.invoke('shell:setup-cancel'),
    setupRetry: (): Promise<void> => ipcRenderer.invoke('shell:setup-retry'),
    setupUseExisting: (): Promise<void> => ipcRenderer.invoke('shell:setup-use-existing'),
    setupNew: (): Promise<void> => ipcRenderer.invoke('shell:setup-new'),
    setupOpen: (): Promise<SubmitResult> => ipcRenderer.invoke('shell:setup-open'),
    openVirtualBoxDownload: (): Promise<void> => ipcRenderer.invoke('shell:open-virtualbox-download'),
    minimize: (): Promise<void> => ipcRenderer.invoke('shell:minimize'),
  });
} else if (location.protocol === 'http:' && location.hostname === '127.0.0.1') {
  // La UI applicativa legge soltanto l'indirizzo della centrale configurata.
  contextBridge.exposeInMainWorld('acasystemShell', {
    pairingEndpoint: (): Promise<{ endpoint: string | null }> => ipcRenderer.invoke('shell:pairing-endpoint'),
  });
}
