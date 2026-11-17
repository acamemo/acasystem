/** Stato del collegamento locale; registrazione e accesso appartengono alla webapp. */
export type ShellState =
  | { view: 'loading'; shellVersion: string; message?: string }
  | { view: 'wizard'; shellVersion: string; host: string; port: string; message?: string }
  | { view: 'error'; shellVersion: string; message: string }
  | { view: 'fatal'; shellVersion: string; message: string };

export interface SubmitResult {
  ok: boolean;
  message?: string;
}
