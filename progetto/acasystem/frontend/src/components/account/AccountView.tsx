import { useEffect, useRef } from 'react';
import { Body, Button, Icon, Surface, Title } from '@/components/primitives';
import { useClientSession } from '@/hooks/client/ClientAccessGate';
import { AccountAppearanceEditor } from './AccountAppearanceEditor';
import { useAccountAppearance } from './useAccountAppearance';
import './account.css';

export function AccountView({ onClose }: { onClose: () => void }) {
  const session = useClientSession();
  const appearance = useAccountAppearance(session);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  const { account } = appearance;
  const name = account?.name || session?.user.name || 'Il mio account';
  return <main className="aca-account">
    <header className="aca-account__bar">
      <Button variant="control" onClick={onClose}><Icon name="chevronLeft" />Torna a Sistema</Button>
      <Title level={1} tabIndex={-1} ref={title}>Il mio account</Title>
    </header>
    <Surface contentClassName="aca-appearance-host">
      <Title level={2}>{name}</Title>
      <AccountAppearanceEditor key={`${session?.houseId}:${session?.user.id}:${session?.client.id}`} name={name} color={account?.color || session?.user.color || '#6b8afd'}
        avatar={appearance.images.avatar} cover={appearance.images.cover}
        hasAvatar={account?.avatarRevision != null} hasCover={account?.coverRevision != null}
        disabled={!account || appearance.busy || session?.offline}
        onColor={(color) => { void appearance.change({ kind: 'color', color }).catch(() => undefined); }}
        onImage={(kind, dataUrl) => appearance.change({ kind, dataUrl })}
        onRemove={(kind) => { void appearance.change({ kind }).catch(() => undefined); }} />
    </Surface>
    {appearance.error && <Body role="alert">{appearance.error}</Body>}
    {appearance.notice && <Body role="status">{appearance.notice}</Body>}
    {!account && <Button variant="control" onClick={() => { void appearance.reload().catch(() => undefined); }}>Riprova</Button>}
  </main>;
}
