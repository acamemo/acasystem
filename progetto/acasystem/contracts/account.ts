/** Personalizzazione dell'identità personale; distinta dai profili della dashboard. */
export interface AccountMetadata {
  userId: string;
  name: string;
  color: string;
  revision: number;
  avatarRevision: number | null;
  coverRevision: number | null;
}
export type AccountImageKind = 'avatar' | 'cover';
export interface AccountAvatarVersion { userId: string; avatarRevision: number }
export const AVATAR_MAX_BYTES = 256 * 1024;
export const COVER_MAX_BYTES = 768 * 1024;
export const ACCOUNT_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
