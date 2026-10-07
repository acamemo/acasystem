import type { HomeAssistantUser } from './homeAssistant.ts';

declare module 'express-serve-static-core' {
  interface Request {
    /** Impostato dal middleware di autenticazione HA. */
    authenticatedHaUser?: HomeAssistantUser | undefined;
    /** URL di HA con cui il token è stato verificato; null per l'ingress del Supervisor. */
    authenticatedHaUrl?: string | null | undefined;
  }
}
