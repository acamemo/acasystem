import { useState, type ReactNode } from 'react';
import { Body, Button, Caption, Icon } from '@/components/primitives';
import type { DiscoveredDeviceDto, EntryDto } from '@/@types/devices';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { ignoreDiscovered, toDeviceError } from '@/api/devicesApi';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { IdentifyButton } from '@/components/system/identify/IdentifyButton';
import { useAddWidgetRequest } from '@/hooks/launcher/AddWidgetRequestContext';
import { useDiscoveredFlow } from '@/hooks/launcher/DiscoveredFlowContext';
import { useOptionalLauncher } from '@/hooks/launcher/LauncherContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  PLATFORM_FAMILY,
  type DeviceFamily,
  type DiscoveredDevice,
} from '@/utils/devices/classify';
import { selectionForNewEntry } from '@/utils/devices/entrySelection';
import { widgetPages } from '@/utils/launcher/deviceMemory';
import { DetailsBody, Section } from '../shared/details';
import { Notice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { FAMILY_ICON } from './familyIcon';
import { useDiscoveredDevices } from './useDiscoveredDevices';
import { useUnboundDevices } from './useUnboundDevices';

const subtitleOf = (device: DiscoveredDevice): string =>
  device.entityIds.length > 1 ? `${device.entityIds.length} entità` : device.primaryEntityId;

/** A device Home Assistant found on the network: its icon, name, model and the two answers. */
function FoundRow({
  device,
  canAdd,
  busy,
  error,
  onAdd,
  onIgnore,
}: {
  device: DiscoveredDeviceDto;
  canAdd: boolean;
  busy: boolean;
  error: string | null;
  onAdd: () => void;
  onIgnore: () => void;
}) {
  return (
    <li className="utility-found-row">
      <UtilityIcon name={device.family ? FAMILY_ICON[device.family] : 'wifi'} size="md" />
      <span className="utility-found-row__text">
        <Body as="span" size="sm" className="utility-truncate">
          {device.name}
        </Body>
        {device.model && <Caption className="utility-truncate">{device.model}</Caption>}
        {!device.addable && device.reason && <Caption>{device.reason}</Caption>}
        {error && (
          <Caption tone="danger" role="alert">
            {error}
          </Caption>
        )}
      </span>
      <span className="utility-found-row__actions">
        {device.addable && (
          <Button
            variant="primary"
            size="sm"
            disabled={!canAdd || busy}
            aria-label={`Aggiungi ${device.name}`}
            onClick={onAdd}
          >
            Aggiungi
          </Button>
        )}
        <Button
          variant="control"
          size="sm"
          disabled={busy}
          aria-label={`Non mi interessa: ${device.name}`}
          onClick={onIgnore}
        >
          Non mi interessa
        </Button>
      </span>
    </li>
  );
}

/**
 * Two lists. «Trovati in rete»: what Home Assistant found by itself (SSDP, mDNS, DHCP...), each
 * with «Aggiungi» (the flow of «Aggiungi un dispositivo» opens in place, then «Aggiungi un
 * widget» on the new device) and «Non mi interessa». «Non lo trovi? Aggiungi per marca» opens the
 * same flow from the catalogue of brands, for a device nobody discovered (a TV by its address).
 * «Pronti da aggiungere»: the devices already in Home Assistant that no widget shows; a tap closes
 * the details and opens «Aggiungi un widget» with the device selected, and «Fai lampeggiare»
 * makes the device show which one it is. The sheet and the flow belong to the launcher screen, which
 * offers them through `AddWidgetRequestContext` and `DiscoveredFlowContext` (a widget cannot
 * import the screen); without a launcher (previews) the rows are inert.
 */
export function DiscoverDetails({ id, onClose }: WidgetDetailsProps) {
  const requestAdd = useAddWidgetRequest();
  const Flow = useDiscoveredFlow();
  const launcher = useOptionalLauncher();
  const runtime = useWidgetRuntime();
  const state = useUnboundDevices();
  // The flow is open: a discovery to take over, or (flowId null) the catalogue of brands.
  const [adding, setAdding] = useState<{ flowId: string | null; family: DeviceFamily | null } | null>(
    null
  );
  const [working, setWorking] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const found = useDiscoveredDevices(adding !== null);

  const targetPage = (): string => {
    const pages = launcher?.layout.pages ?? [];
    return (
      [...(launcher ? (widgetPages(launcher.layout).get(id) ?? []) : [])][0] ??
      pages.find((page) => page.kind === 'widgets')?.id ??
      'home'
    );
  };

  const add = (device: DiscoveredDevice) => {
    if (!requestAdd) return;
    const pageId = targetPage();
    onClose();
    requestAdd(pageId, {
      type: device.widgetType,
      entityIds: device.entityIds,
      ...(device.remoteId ? { remoteId: device.remoteId } : {}),
    });
  };

  /** The device is in Home Assistant: find the widget it belongs to and open the add sheet. */
  const finishAdding = async (entry: EntryDto, family: DeviceFamily | null) => {
    const pageId = targetPage();
    const newEntry = {
      deviceId: entry.device?.id ?? null,
      entityIds: entry.entities,
      mediaPlayerEntityId: entry.mediaPlayerEntityId,
    };
    let selection = null;
    try {
      if (runtime.conn) {
        const [devices, entityRegistry] = await Promise.all([
          getDeviceRegistry(runtime.conn),
          getEntityRegistry(runtime.conn),
        ]);
        selection = selectionForNewEntry(
          { devices, entityRegistry, entities: runtime.entities },
          newEntry,
          family
        );
      }
    } catch {
      // The registries are a way to be precise; the family of the integration still decides.
    }
    selection ??= selectionForNewEntry(
      { devices: [], entityRegistry: [], entities: runtime.entities },
      newEntry,
      family
    );
    onClose();
    if (selection && requestAdd) requestAdd(pageId, selection);
  };

  const ignore = (device: DiscoveredDeviceDto) => {
    setWorking((previous) => new Set(previous).add(device.flowId));
    setErrors(({ [device.flowId]: _gone, ...rest }) => rest);
    ignoreDiscovered(device.flowId)
      .then(() => found.remove(device.flowId))
      .catch((failure: unknown) => {
        setErrors((previous) => ({ ...previous, [device.flowId]: toDeviceError(failure).message }));
      })
      .finally(() => {
        setWorking((previous) => {
          const next = new Set(previous);
          next.delete(device.flowId);
          return next;
        });
      });
  };

  if (adding && Flow) {
    return (
      <DetailsBody label="Rileva dispositivi">
        <Flow
          flowId={adding.flowId}
          family={adding.family}
          onExit={() => {
            setAdding(null);
            found.refresh();
          }}
          onDone={(entry) =>
            // A brand picked from the catalogue has no family yet: the integration gives it.
            void finishAdding(entry, adding.family ?? PLATFORM_FAMILY[entry.domain] ?? null)
          }
        />
      </DetailsBody>
    );
  }

  let network: ReactNode = null;
  if (found.status === 'unavailable') {
    network = found.message ? <Notice icon="warning">{found.message}</Notice> : null;
  } else if (found.status === 'ready') {
    network =
      found.devices.length === 0 ? (
        <Notice icon="ok">Nessun dispositivo nuovo trovato in rete.</Notice>
      ) : (
        <ul className="utility-stack" aria-label="Dispositivi trovati in rete">
          {found.devices.map((device) => (
            <FoundRow
              key={device.flowId}
              device={device}
              canAdd={Flow !== null}
              busy={working.has(device.flowId)}
              error={errors[device.flowId] ?? null}
              onAdd={() => setAdding({ flowId: device.flowId, family: device.family })}
              onIgnore={() => ignore(device)}
            />
          ))}
        </ul>
      );
  }

  let body: ReactNode;
  if (state.status === 'loading') {
    body = <Notice icon="refresh">Leggo i dispositivi di Home Assistant…</Notice>;
  } else if (state.status === 'error') {
    body = (
      <Notice tone="danger" icon="warning">
        Non riesco a leggere i dispositivi di Home Assistant.
      </Notice>
    );
  } else if (state.devices.length === 0) {
    body = (
      <Notice icon="ok">
        Nessun dispositivo nuovo: quelli di Home Assistant sono già nei widget.
      </Notice>
    );
  } else {
    const { devices, identify } = state;
    body = FAMILY_ORDER.map((family) => {
      const inFamily = devices.filter((device) => device.family === family);
      if (inFamily.length === 0) return null;
      return (
        <div key={family} role="group" aria-label={FAMILY_LABEL[family]} className="utility-stack">
          <Caption as="p">{FAMILY_LABEL[family]}</Caption>
          {inFamily.map((device) => (
            <div key={device.deviceId} className="utility-device-line">
              <Button
                variant="control"
                size="sm"
                disabled={!requestAdd}
                onClick={() => add(device)}
                className="utility-device-row"
                contentClassName="utility-device-row__content"
              >
                <span className="utility-device-row__text">
                  <Body as="span" size="sm" className="utility-truncate">
                    {device.name}
                  </Body>
                  <Caption className="utility-truncate">{subtitleOf(device)}</Caption>
                </span>
                <Icon name="add" size="md" />
              </Button>
              <IdentifyButton action={identify.get(device.deviceId)} name={device.name} />
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <DetailsBody label="Rileva dispositivi">
      {network && (
        <Section title="Trovati in rete" icon="wifi">
          {network}
        </Section>
      )}
      <Section title="Pronti da aggiungere" icon="widgetAdd">
        {body}
      </Section>
      <Section title="Per marca" icon="add">
        <Button
          variant="control"
          size="sm"
          disabled={Flow === null}
          className="utility-device-row"
          contentClassName="utility-device-row__content"
          onClick={() => setAdding({ flowId: null, family: null })}
        >
          <span className="utility-device-row__text">
            <Body as="span" size="sm">
              Non lo trovi? Aggiungi per marca
            </Body>
            <Caption>Scegli la marca dall’elenco e segui i passi.</Caption>
          </span>
          <Icon name="add" size="md" />
        </Button>
      </Section>
    </DetailsBody>
  );
}
