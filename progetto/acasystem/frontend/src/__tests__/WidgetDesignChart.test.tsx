import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WidgetDesignChart } from '@/pages/ui-kit/WidgetDesignChart';
import { profilesFor } from '@/pages/ui-kit/widgetDesignModel';
import type { TimePoint } from '@/utils/sensorHistory';

const sensorCap = profilesFor('sensor')[0]!.capabilities;
const lightCap = profilesFor('light')[0]!.capabilities;
const fanCap = profilesFor('fan')[0]!.capabilities;
const coverCap = profilesFor('cover')[0]!.capabilities;

describe('WidgetDesignChart (Fase 3: Grafici operativi con dati storici HA)', () => {
  it('renders simulated curve by default when no history points are provided', () => {
    render(
      <WidgetDesignChart
        type="sensor"
        capabilities={sensorCap}
        values={{ temperature: 21.5 }}
        status="available"
      />
    );
    const img = screen.getByRole('img', { name: /Visualizzazione simulata/ });
    expect(img).toBeInTheDocument();
    expect(screen.getByText(/serie simulata/)).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });

  it('renders simulated ring for cover opening', () => {
    const { container } = render(
      <WidgetDesignChart
        type="cover"
        capabilities={coverCap}
        values={{ position: 75 }}
        status="available"
      />
    );
    expect(screen.getByText('Simulazione')).toBeInTheDocument();
    expect(container.querySelector('circle[stroke-dasharray="75 100"]')).toBeInTheDocument();
  });

  it('renders real telemetry curve when historyPoints are supplied', () => {
    const now = Date.now();
    const historyPoints: TimePoint[] = [
      { time: new Date(now - 3600 * 4000), value: 18.0 },
      { time: new Date(now - 3600 * 3000), value: 19.2 },
      { time: new Date(now - 3600 * 2000), value: 20.5 },
      { time: new Date(now - 3600 * 1000), value: 21.8 },
      { time: new Date(now), value: 22.4 },
    ];

    const { container } = render(
      <WidgetDesignChart
        type="sensor"
        capabilities={sensorCap}
        values={{ temperature: 22.4 }}
        status="available"
        historyPoints={historyPoints}
      />
    );

    const img = screen.getByRole('img', { name: /Cronologia delle ultime 24 ore/ });
    expect(img).toBeInTheDocument();
    expect(screen.getByText(/ultime 24 ore/)).toBeInTheDocument();
    expect(screen.queryByText(/serie simulata/)).not.toBeInTheDocument();

    const area = container.querySelector('.uikwa-chart__area');
    expect(area).toHaveAttribute('d', expect.stringContaining('M16'));
    expect(area).toHaveAttribute('d', expect.stringContaining('L284 116 L16 116 Z'));
  });

  it('handles flat sensor telemetry without NaN or division by zero', () => {
    const now = Date.now();
    const historyPoints: TimePoint[] = [
      { time: new Date(now - 3600 * 2000), value: 20.0 },
      { time: new Date(now - 3600 * 1000), value: 20.0 },
      { time: new Date(now), value: 20.0 },
    ];

    const { container } = render(
      <WidgetDesignChart
        type="sensor"
        capabilities={sensorCap}
        values={{ temperature: 20.0 }}
        status="available"
        historyPoints={historyPoints}
      />
    );

    const area = container.querySelector('.uikwa-chart__area');
    expect(area?.getAttribute('d')).not.toContain('NaN');
    expect(screen.getByText(/ultime 24 ore/)).toBeInTheDocument();
  });

  it('renders real telemetry bars for fan speed or cost', () => {
    const now = Date.now();
    const historyPoints: TimePoint[] = Array.from({ length: 8 }, (_, i) => ({
      time: new Date(now - (7 - i) * 3600 * 1000),
      value: (i + 1) * 12,
    }));

    const { container } = render(
      <WidgetDesignChart
        type="fan"
        capabilities={fanCap}
        values={{ speed: 80 }}
        status="available"
        historyPoints={historyPoints}
      />
    );

    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(8);
    for (const rect of rects) {
      expect(rect.getAttribute('y')).not.toContain('NaN');
      expect(rect.getAttribute('height')).not.toContain('NaN');
    }
  });

  it('displays loading state with aria-busy and caption notice', () => {
    render(
      <WidgetDesignChart
        type="light"
        capabilities={lightCap}
        values={{ brightness: 60 }}
        status="available"
        loading
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Aggiornamento in corso...')).toBeInTheDocument();
  });
});
