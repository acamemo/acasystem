import { useCallback, useEffect, useRef, useState } from 'react';
import { readAccount, readOwnAccountImage, type AccountMetadata } from '@/api/accountApi';
import type { ClientSession } from '@/api/clientSession';
import { isObject } from '@/validators/guards';
import { commitAccountAppearance, type AppearanceChange } from './accountAppearanceController';

export function useAccountAppearance(session: ClientSession | null) {
  const key = `${session?.houseId}:${session?.user.id}:${session?.client.id}`;
  const current = useRef(key); current.current = key;
  const currentSession = useRef(session); currentSession.current = session;
  const epoch = useRef(0);
  const [account, setAccount] = useState<AccountMetadata | null>(null);
  const accountScope = useRef(key);
  const [images, setImages] = useState<{ avatar: string | null; cover: string | null }>({ avatar: null, cover: null });
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const belongs = accountScope.current === key;
  const avatarRevision = belongs ? account?.avatarRevision : null;
  const coverRevision = belongs ? account?.coverRevision : null;
  const reload = useCallback(async () => {
    const request = epoch.current;
    const value = await readAccount(undefined, currentSession.current ?? undefined);
    if (request === epoch.current && key === current.current) { accountScope.current = key; setAccount(value); setError(''); }
    return value;
  }, [key]);
  useEffect(() => {
    epoch.current += 1; saving.current = false; setBusy(false); setAccount(null); setError(''); setNotice('');
    void reload().catch(() => { if (key === current.current) setError('Non riesco a leggere il tuo account. Riprova.'); });
    return () => { epoch.current += 1; };
  }, [key, reload]);
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    setImages({ avatar: null, cover: null });
    for (const kind of ['avatar', 'cover'] as const) {
      if ((kind === 'avatar' ? avatarRevision : coverRevision) == null) continue;
      void readOwnAccountImage(kind).then((blob) => {
        if (!blob || !active) return;
        const url = URL.createObjectURL(blob); urls.push(url);
        setImages((value) => ({ ...value, [kind]: url }));
      }).catch(() => { if (active) setError('Immagine non disponibile. Il tuo account resta utilizzabile.'); });
    }
    return () => { active = false; for (const url of urls) URL.revokeObjectURL(url); };
  }, [key, avatarRevision, coverRevision]);
  const change = async (value: AppearanceChange) => {
    if (!account || !belongs || saving.current || session?.offline || current.current !== key) return;
    const request = epoch.current;
    saving.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const updated = await commitAccountAppearance(account, value, undefined, session ?? undefined);
      if (request === epoch.current && current.current === key) { setAccount(updated); setNotice('Personalizzazione aggiornata.'); }
    } catch (failure) {
      if (request !== epoch.current || current.current !== key) return;
      if (isObject(failure) && failure.status === 409) {
        try { await reload(); setError('L’account è cambiato su un altro dispositivo. Verifica i dati aggiornati e riprova.'); }
        catch { setError('Non riesco a rileggere l’account. Il ritaglio resta disponibile: riprova.'); }
      } else setError(failure instanceof Error ? failure.message : 'Personalizzazione non salvata. Riprova.');
      throw failure;
    } finally {
      if (request === epoch.current && current.current === key) { saving.current = false; setBusy(false); }
    }
  };
  return { account: belongs ? account : null, images: belongs ? images : { avatar: null, cover: null }, busy, error, notice, reload, change };
}
