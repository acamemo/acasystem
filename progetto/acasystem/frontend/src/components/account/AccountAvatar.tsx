import { useEffect, useState, type CSSProperties } from 'react';
import { accountAvatarUrl, hasAccountAvatar, subscribeAccountAvatars } from '@/api/accountApi';
import './account.css';
import { accountInitialInk } from './appearanceDraft';

export function AccountAvatar({ userId, name, color, size = 'md' }: {
  userId: string | null; name: string; color?: string; size?: 'sm' | 'md';
}) {
  const [image, setImage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!userId) { setImage(null); setPhoto(false); return; }
      void accountAvatarUrl(userId).then((url) => { if (active) { setImage(url); setPhoto(hasAccountAvatar(userId)); } });
    };
    setImage(null); setPhoto(null); load();
    const unsubscribe = subscribeAccountAvatars(load);
    return () => { active = false; unsubscribe(); };
  }, [userId]);
  const style: CSSProperties | undefined = !image && photo === false && color ? { backgroundColor: color, color: accountInitialInk(color) } : undefined;
  return <span className={`aca-account-avatar aca-account-avatar--${size}`} style={style} aria-label={name}>
    {image ? <img src={image} alt="" onError={() => setImage(null)} /> : <span aria-hidden="true">{name.trim().slice(0, 1) || '?'}</span>}
  </span>;
}
