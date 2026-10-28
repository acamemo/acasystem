import type { HomeAssistantUser } from './homeAssistant.ts';

declare module 'express-serve-static-core' {
  interface Request {
    /** Impostato dal middleware di autenticazione HA. */
    authenticatedHaUser?: HomeAssistantUser | undefined;
  }
}
