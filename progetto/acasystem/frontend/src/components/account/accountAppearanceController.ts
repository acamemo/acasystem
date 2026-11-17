import { removeAccountImage, saveAccountColor, saveAccountImage, type AccountImageKind, type AccountMetadata } from '@/api/accountApi';
import type { ClientSession } from '@/api/clientSession';
import type { HomeAssistantRequestHeaders } from '@/api/apiAuth';

export type AppearanceChange = { kind: 'color'; color: string } | { kind: AccountImageKind; dataUrl?: string };
/** Both the settings editor and the post-login handoff use this protected writer. */
export function commitAccountAppearance(account: AccountMetadata, change: AppearanceChange,
  headers?: HomeAssistantRequestHeaders, session?: ClientSession): Promise<AccountMetadata> {
  if (change.kind === 'color') return saveAccountColor(account.revision, change.color, headers, session);
  return change.dataUrl ? saveAccountImage(change.kind, account.revision, change.dataUrl, headers, session)
    : removeAccountImage(change.kind, account.revision, headers, session);
}
