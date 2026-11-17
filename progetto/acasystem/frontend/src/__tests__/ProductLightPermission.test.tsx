import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LightDetails } from '@/components/widgets/controls/light/LightDetails';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('mantiene il rifiuto HA e non ritenta automaticamente il comando sul secondo canale', async () => {
  const callService = serviceMock(async () => { throw Object.assign(new Error('Permesso negato'), { status: 403 }); });
  const binding = { version: 1 as const, family: 'light' as const, deviceId: 'lamp', primaryEntityId: 'light.a', channelEntityIds: ['light.a', 'light.b'], secondaryEntityIds: [] };
  renderWithRuntime(<LightDetails id="light.a" settingsKey="home::lamp" settings={{ categoryWidgetType: 'light', bindingEntityId: 'light.a', productDevice: binding }} onClose={() => undefined} />, {
    entities: fixtureEntities([fixtureEntity('light.a', 'off', { friendly_name: 'Luce A', supported_color_modes: ['onoff'] }), fixtureEntity('light.b', 'off', { friendly_name: 'Luce B', supported_color_modes: ['onoff'] })]),
    conn: fakeConnection().conn, services: { light: { turn_on: {}, turn_off: {} } }, callService,
  });
  await flush();
  fireEvent.click(within(screen.getByRole('region', { name: 'Luce B' })).getByRole('button', { name: /Accensione/ }));
  await flush();
  expect(callService).toHaveBeenCalledOnce();
  expect(callService.mock.calls[0].slice(0, 3)).toEqual(['light', 'turn_on', { entity_id: 'light.b' }]);
  expect(within(screen.getByRole('region', { name: 'Luce B' })).getByText(/non riuscito|negato/i)).toBeInTheDocument();
  await flush(); expect(callService).toHaveBeenCalledOnce();
});
