import { useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Disclosure,
  DisclosureGroup,
  Field,
  Heading,
} from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';
import { domainOf, friendlyName } from '../shared/entity';
import { Notice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { domainPriority } from '../fullpage/roomsData';
import { EntityRow, domainIcon } from './EntityRow';
import { RoomMissing, domainLabel } from './RoomDetails';
import { useRoomContext } from './RoomScope';
import { useRoomLights } from './useRoomLights';

export function RoomExplorer({
  pageId,
  name,
  settings,
  onBack,
}: {
  pageId: string;
  name: string;
  settings: CardSettings;
  onBack: () => void;
}) {
  const runtime = useWidgetRuntime(),
    membership = useRoomContext();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const ids = getEffectiveRoomEntityIds(settings),
    technical = new Set(membership?.technicalIds ?? []);
  const daily = ids.filter((id) => !technical.has(id));
  const lights = daily.filter((id) => id.startsWith('light.'));
  const group = useRoomLights(lights);
  const domains = [...new Set(daily.map(domainOf))].sort(
    (a, b) => domainPriority(a) - domainPriority(b)
  );
  const term = search.trim().toLocaleLowerCase('it-IT');
  const visible = daily.filter(
    (id) =>
      (filter === 'all' || domainOf(id) === filter) &&
      (!term ||
        friendlyName(runtime.entities[id], id).toLocaleLowerCase('it-IT').includes(term) ||
        id.toLowerCase().includes(term))
  );
  const rows = (list: string[]) => (
    <ul className="utility-list">
      {list.map((id) =>
        runtime.entities[id] ? (
          <EntityRow key={id} entityId={id} entity={runtime.entities[id]!} />
        ) : (
          <li key={id} className="utility-list__row">
            <Body size="sm">{id}</Body>
            <Caption>Non disponibile</Caption>
          </li>
        )
      )}
    </ul>
  );
  return (
    <div className="utility-page room-details" data-page={pageId}>
      <header className="utility-page__head">
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label="Torna alle stanze"
          onClick={onBack}
        >
          <UtilityIcon name="chevronLeft" size="md" />
        </Button>
        <div className="utility-page__title">
          <Heading level={2} size="md">
            {membership?.areaName ?? name}
          </Heading>
          <Body size="sm" tone="muted">
            {ids.length} entità
          </Body>
        </div>
      </header>
      {membership?.status !== 'ready' ? (
        <RoomMissing />
      ) : (
        <>
          <Field
            label="Cerca un dispositivo"
            icon="search"
            type="search"
            placeholder="Cerca un dispositivo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {domains.length > 1 && (
            <div className="utility-toolbar" role="group" aria-label="Filtra per tipo">
              <Button
                variant="control"
                size="sm"
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                Tutti
              </Button>
              {domains.map((domain) => (
                <Button
                  key={domain}
                  variant="control"
                  size="sm"
                  aria-pressed={filter === domain}
                  onClick={() => setFilter(filter === domain ? 'all' : domain)}
                >
                  <UtilityIcon name={domainIcon(domain)} size="sm" />
                {`${domainLabel(domain)} (${daily.filter((id) => domainOf(id) === domain).length})`}
                </Button>
              ))}
            </div>
          )}
          {lights.length > 0 && (
            <div className="utility-section">
              <div className="utility-split">
                <Body size="sm">
                  {group.lightsOn} su {lights.length} luci accese
                </Body>
                <Button
                  variant="control"
                  size="sm"
                  loading={group.lightsPending}
                  disabled={group.lightsDisabled}
                  onClick={group.toggleAllLights}
                >
                  {group.lightsOn > 0 ? 'Spegni tutte' : 'Accendi tutte'}
                </Button>
              </div>
              {group.unavailableLights > 0 && (
                <Caption>{group.unavailableLights} luci non disponibili</Caption>
              )}
              {group.lightsPending && <Caption role="status">In attesa delle luci…</Caption>}
              {group.lightsMessage && (
                <Notice icon="warning" live>
                  {group.lightsMessage}
                </Notice>
              )}
            </div>
          )}
          {visible.length === 0 && (
            <Body size="sm" tone="muted" role="status">
              {term
                ? 'Nessun dispositivo corrisponde alla ricerca.'
                : 'Nessun dispositivo in questa stanza.'}
            </Body>
          )}
          {domains.flatMap((domain) => {
            const list = visible.filter((id) => domainOf(id) === domain);
            return list.length
              ? [
                  <section className="utility-group" key={domain} aria-label={domainLabel(domain)}>
                    <div className="utility-group__head">
                      <UtilityIcon name={domainIcon(domain)} size="md" />
                      <Heading level={3} size="sm">
                        {domainLabel(domain)}
                      </Heading>
                      <span className="utility-group__rule" />
                      <Caption>{list.length}</Caption>
                    </div>
                    {rows(list)}
                  </section>,
                ]
              : [];
          })}
          {technical.size > 0 && (
            <DisclosureGroup>
              <Disclosure id="room-explorer-technical" title="Tecnica e manutenzione">
                {rows([...technical])}
              </Disclosure>
            </DisclosureGroup>
          )}
        </>
      )}
    </div>
  );
}
