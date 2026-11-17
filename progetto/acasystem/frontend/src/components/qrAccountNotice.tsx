import { useEffect, useState } from 'react';
import { Body, Button } from '@/components/primitives';
import { QR_PREFERENCES_EVENT, readQrPreferences } from '@/api/qrPairing';
import { useHomeAssistantMeta } from '@/hooks/context/HomeAssistantContext';
import { useConnectPageControl } from '@/hooks/context/ConfigContext';

export function QrAccountNotice() {
  const { haUser } = useHomeAssistantMeta();
  const control = useConnectPageControl();
  const [preferences, setPreferences] = useState(readQrPreferences);
  useEffect(() => {
    const changed = () => setPreferences(readQrPreferences());
    window.addEventListener(QR_PREFERENCES_EVENT, changed);
    return () => window.removeEventListener(QR_PREFERENCES_EVENT, changed);
  }, []);
  if (!haUser || preferences?.mode !== 'account' || !preferences.accountUserId
    || preferences.accountUserId === haUser.id) return null;
  return <div role="alert" className="aca-system__stack">
    <Body size="sm">Per condividere le modifiche, accedi con lo stesso account ACA del PC che ha generato il codice.</Body>
    {control?.open && <Button variant="control" onClick={control.open}>Accedi con l’account del PC</Button>}
  </div>;
}
