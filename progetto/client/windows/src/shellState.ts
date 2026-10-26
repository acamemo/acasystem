/** Stato delle pagine locali del guscio, passato dal processo principale alla pagina. */
export type ShellState =
  | { view: 'loading'; shellVersion: string }
  | { view: 'wizard'; shellVersion: string; host: string; port: string; message?: string }
  | { view: 'error'; shellVersion: string; message: string }
  | { view: 'fatal'; shellVersion: string; message: string };

export interface SubmitResult {
  ok: boolean;
  message?: string;
}
