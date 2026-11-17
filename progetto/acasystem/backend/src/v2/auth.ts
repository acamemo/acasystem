import type { Request } from 'express';
import { getBearerToken } from '../middlewares/homeAssistantAuth.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import type { HaCurrentSession } from '../services/devices/haAdapter.ts';
import { isHaError } from '../services/devices/haTransport.ts';
import { CollaborationError, type CollaborationStore, type V2Identity } from './store.ts';

export type SessionLoader = (token: string) => Promise<HaCurrentSession>;
export function createCollaborationAuth(store: CollaborationStore, devices: DeviceModule, load: SessionLoader = token => devices.adapter.withWs(token, api => api.currentSession())) {
  const cache = new WeakMap<Request, Promise<{ identity: V2Identity; accessToken: string }>>();
  const resolve = (req: Request, fresh = false) => {
    if (!fresh) { const prior = cache.get(req); if (prior) return prior; }
    const pending = (async () => {
      const token = getBearerToken(req);
      if (!token) throw new CollaborationError(401, 'HA_AUTH_REQUIRED', 'Accedi con il tuo account.');
      store.assertAccessTokenActive(token);
      let session: HaCurrentSession;
      try { session = await load(token); }
      catch (error) {
        if (isHaError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) throw new CollaborationError(401, 'HA_SESSION_INVALID', 'La sessione non è valida. Accedi di nuovo.');
        throw new CollaborationError(503, 'HA_SESSION_UNAVAILABLE', 'Home Assistant non risponde. La sessione e le bozze sono conservate: riprova.');
      }
      if (!session.refreshTokenId || session.tokenType !== 'normal') throw new CollaborationError(409, 'SESSION_LOGIN_REQUIRED', 'Accedi con il tuo account per collegare questo dispositivo.');
      if (session.user.isAdmin) devices.keeper.offerAdmin({ token, user: { id: session.user.id, name: session.user.name } });
      const identity: V2Identity = { userId: session.user.id, userName: session.user.name, refreshTokenId: session.refreshTokenId, tokenType: session.tokenType };
      store.noteAccessToken(identity, token);
      // Consulted even for bootstrap: a revoked token cannot re-register its old access.
      store.sessionClient(identity);
      return { identity, accessToken: token };
    })();
    cache.set(req, pending); return pending;
  };
  return {
    resolve,
    authorize: async (req: Request) => { const current = await resolve(req); return { actor: store.actor(current.identity), accessToken: current.accessToken }; },
    authorizeUsage: async (req: Request, profileId?: string) => {
      const current = await resolve(req);
      const actor = store.actor(current.identity);
      if (profileId !== undefined) store.profile(actor.userId, profileId);
      const usage = store.requireUsage(actor, { leaseId: req.get('x-aca-usage-lease'), usageSessionId: req.get('x-aca-usage-session') }, profileId);
      return { actor, accessToken: current.accessToken, usageLeaseId: usage.id };
    },
  };
}
export type CollaborationAuth = ReturnType<typeof createCollaborationAuth>;
