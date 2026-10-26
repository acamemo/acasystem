/** Stato delle pagine locali del guscio, passato dal processo principale alla pagina. */
export interface SetupStepView {
  label: string;
  status: 'pending' | 'running' | 'done';
}

/** Dati della casa rilevati da HA, da confermare (come il passo «core_config» di HA). */
export interface HomeView {
  location_name?: string;
  country: string;
  currency: string;
  time_zone: string;
  unit_system: 'metric' | 'us_customary';
  latitude?: number;
  longitude?: number;
}

export type ShellState =
  | { view: 'loading'; shellVersion: string }
  | { view: 'wizard'; shellVersion: string; host: string; port: string; message?: string }
  | { view: 'error'; shellVersion: string; message: string }
  | { view: 'fatal'; shellVersion: string; message: string }
  // Configurazione del mini PC (REP-20261026-005, S5).
  | { view: 'setup-owner'; shellVersion: string; host: string; message?: string }
  | { view: 'setup-admin'; shellVersion: string; host: string; message?: string }
  | { view: 'setup-home'; shellVersion: string; home: HomeView }
  | { view: 'setup-progress'; shellVersion: string; steps: SetupStepView[]; message?: string };

export interface SubmitResult {
  ok: boolean;
  message?: string;
}
