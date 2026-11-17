import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Caption, Icon, Surface } from '@/components/primitives';
import type { AccountImageKind } from '@/api/accountApi';
import { AccountImageCropper } from './AccountImageCropper';
import { accountInitialInk } from './appearanceDraft';
import './account.css';

/** One complete editor; hosts own identity/authentication and the controller owns persistence. */
export function AccountAppearanceEditor({ name, color, avatar, cover, hasAvatar = Boolean(avatar), hasCover = Boolean(cover), compact = false,
  disabled = false, onColor, onImage, onRemove }: {
  name: string; color: string; avatar: string | null; cover: string | null; hasAvatar?: boolean; hasCover?: boolean;
  compact?: boolean; disabled?: boolean; onColor: (color: string) => void;
  onImage: (kind: AccountImageKind, dataUrl: string) => Promise<void>; onRemove: (kind: AccountImageKind) => void;
}) {
  const [editing, setEditing] = useState(!compact);
  const [pending, setPending] = useState<{ kind: AccountImageKind; file: File } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const focusedForOpen = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!editing) { focusedForOpen.current = false; return; }
    if (disabled || focusedForOpen.current) return;
    const first = actions.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    if (first) { focusedForOpen.current = true; first.focus({ preventScroll: true }); first.scrollIntoView?.({ block: 'nearest' }); }
  }, [editing, disabled]);
  const initial = Array.from((name.trim() || 'A').toLocaleUpperCase('it-IT'))[0];
  const choose = (kind: AccountImageKind, file?: File) => { if (file && !disabled) setPending({ kind, file }); };
  const portalRoot = typeof document === 'undefined' ? null : document.body;
  return <div className={`aca-appearance${compact ? ' aca-appearance--compact' : ''}`}>
    {(!compact || hasCover) && <div className="aca-appearance__cover">{cover && <img src={cover} alt="Sfondo del mio account" />}</div>}
    <div className="aca-appearance__identity">
      {(!compact || hasAvatar) && <Button variant="plain" className="aca-appearance__avatar" aria-label="Personalizza foto e colore del mio account" disabled={disabled} onClick={() => setEditing((value) => !value)}>
        <span className="aca-account-avatar aca-account-avatar--md" role="img" aria-label={`Anteprima profilo: ${initial}`}
          style={!hasAvatar ? { backgroundColor: color, color: accountInitialInk(color) } : undefined}>
          {avatar ? <img src={avatar} alt="" /> : initial}
        </span>
      </Button>}
      {!hasAvatar && <Surface shape="pill" className="aca-connect__color-picker" contentClassName="aca-connect__color-content" aria-disabled={disabled || undefined}>
        <span className="aca-connect__color-preview" role={compact ? 'img' : undefined} aria-label={compact ? `Anteprima profilo: ${initial}` : undefined} aria-hidden={!compact || undefined} style={{ backgroundColor: color, color: accountInitialInk(color) }}>{initial}</span>
        <span className="aca-connect__color-divider" aria-hidden="true" />
        <span className="aca-connect__color-action" aria-hidden="true"><Icon name="edit" size="md" />Personalizza</span>
        <input className="aca-connect__color-input" type="color" aria-label="Personalizza colore profilo" value={color} disabled={disabled} onChange={(event) => onColor(event.target.value)} />
      </Surface>}
      {(!compact || !hasAvatar) && <Button variant="control" disabled={disabled} aria-expanded={editing} onClick={() => setEditing((value) => !value)}>{compact ? 'Foto e sfondo' : 'Personalizza account'}</Button>}
    </div>
    {editing && <div ref={actions} className="aca-appearance__actions">
      <Button variant="control" disabled={disabled} onClick={() => avatarInput.current?.click()}>{hasAvatar ? 'Sostituisci foto profilo' : 'Carica foto profilo'}</Button>
      {hasAvatar && <Button variant="control" disabled={disabled} onClick={() => onRemove('avatar')}>Rimuovi foto profilo</Button>}
      <Button variant="control" disabled={disabled} onClick={() => coverInput.current?.click()}>Sfondo account</Button>
      {hasCover && <Button variant="control" disabled={disabled} onClick={() => onRemove('cover')}>Rimuovi sfondo account</Button>}
      <Caption>Lo sfondo compare solo nell’account. La foto sostituisce il colore.</Caption>
    </div>}
    <input className="aca-visually-hidden" ref={avatarInput} aria-label="File della foto profilo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => { choose('avatar', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    <input className="aca-visually-hidden" ref={coverInput} aria-label="File dello sfondo account" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => { choose('cover', event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    {pending && portalRoot && createPortal(<AccountImageCropper file={pending.file} kind={pending.kind} onClose={() => setPending(null)} onSave={async (dataUrl) => { await onImage(pending.kind, dataUrl); if (active.current) setPending(null); }} />, portalRoot)}
  </div>;
}
