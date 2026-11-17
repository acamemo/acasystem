import { backendRequest } from './backendClient';
import type { ActivityExport, ActivityPage, ActivityQuery } from '../../../contracts/activity';
export type { ActivityEvent, ActivityExport, ActivityKind, ActivityOutcome, ActivityPage, ActivityQuery } from '../../../contracts/activity';

export const ACTIVITY_CHANGED_EVENT = 'acasystem:activity-changed';
export const notifyActivityChanged = (): void => { window.dispatchEvent(new Event(ACTIVITY_CHANGED_EVENT)); };
const queryString = (query: ActivityQuery): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params.size ? `?${params}` : '';
};
export const readActivity = async (query: ActivityQuery = {}): Promise<ActivityPage> =>
  await backendRequest(`/v2/activity${queryString(query)}`) as ActivityPage;
export const previewActivityExport = async (query: ActivityQuery = {}): Promise<ActivityExport> =>
  await backendRequest(`/v2/activity/export${queryString(query)}`) as ActivityExport;
export const downloadActivityExport = (data: ActivityExport): void => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'acasystem-tavano.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
