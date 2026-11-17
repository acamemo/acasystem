/** Iscrizione alla casa: credenziali transitorie, identità e password restano in HA. */
export const USER_COLORS = ['#6b8afd', '#e879a0', '#46a990', '#da9c41', '#9c7be8', '#dc765d'] as const;
export interface RegistrationInput {
  attemptId: string;
  name: string;
  username: string;
  password: string;
  color?: string;
}
export interface RegistrationStatus { ready: boolean }
export interface RegistrationResult {
  attemptId: string;
  status: 'created' | 'pending' | 'failed';
  userId: string | null;
}
