/** Utente Home Assistant verificato dal middleware di autenticazione. */
export interface HomeAssistantUser {
  id: string;
  name: string;
  is_admin: boolean;
  is_owner: boolean;
  /** Presente solo per l'utente fidato fornito dall'ingress del Supervisor. */
  source?: 'supervisor-ingress';
}

export interface HomeAssistantCredentials {
  haUrl: string;
  accessToken: string;
}

/** Interroga HA (o una sua controfigura nei test) e restituisce l'utente del token. */
export type HomeAssistantUserLoader = (
  credentials: HomeAssistantCredentials
) => Promise<HomeAssistantUser>;
