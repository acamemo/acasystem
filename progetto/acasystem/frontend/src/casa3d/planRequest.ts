/**
 * The request of the Casa 3D plan API in the app: `./api/casa3d` on the same origin, with the
 * bearer token of the signed-in Home Assistant user (the backend checks it against the Home
 * Assistant it is configured with, SEC-1) and the same one retry after a 401 with OAuth as the
 * other backend calls (`backendClient.ts`).
 */
import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
} from '@/api/apiAuth';
import { createCasa3dPlanApi, type Casa3dPlanApi, type PlanRequest } from './planApi';

const API_BASE = './api/casa3d';

export const backendPlanRequest: PlanRequest = async (path, init) => {
  const send = async (forceRefreshOAuth: boolean) => {
    const auth = await getValidatedHomeAssistantRequestHeadersAsync({ forceRefreshOAuth });
    return fetch(`${API_BASE}${path}`, {
      method: init.method,
      headers: { ...init.headers, ...auth },
      // A copy typed as an ArrayBuffer view fetch accepts as it is.
      ...(init.body === undefined ? {} : { body: init.body as BodyInit }),
    });
  };

  let response = await send(false);
  if (response.status === 401 && getStoredAuthMethod() === 'oauth') response = await send(true);
  if (response.status === 401) {
    throw notifyHomeAssistantApiUnauthorized('Home Assistant authentication failed');
  }
  return response;
};

/**
 * A new plan API for one element. The revision it holds is the one of that element's document, so
 * it is never shared: a second reader would move the base of an editor with edits not yet saved.
 */
export function createElementPlanApi(): Casa3dPlanApi {
  return createCasa3dPlanApi({ request: backendPlanRequest });
}
