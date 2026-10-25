/**
 * Choice of the quality of the Casa 3D view (ADR-0014, section 5, T5): Light, Medium or High. Used
 * in the menu of the page and in Sistema, so the two look and act the same. On a device that High
 * may slow down (isWeakDevice) the move to High asks for a confirmation first.
 */
import { useState } from 'react';
import { Body, Button, Segmented } from '@/components/primitives';
import { CASA3D_QUALITY_OPTIONS, type Casa3dQuality } from './quality';
import './casa3dQuality.css';

export interface Casa3dQualityPickerProps {
  /** The level in use. */
  value: Casa3dQuality;
  onChange: (quality: Casa3dQuality) => void;
  /** High asks for a confirmation (a device with little memory or few cores). */
  weak?: boolean;
  /** Explains why the level in use is not the saved one (the view went back to Light). */
  note?: string;
  className?: string;
}

export function Casa3dQualityPicker({
  value,
  onChange,
  weak = false,
  note,
  className,
}: Casa3dQualityPickerProps) {
  const [askHigh, setAskHigh] = useState(false);
  const hint = CASA3D_QUALITY_OPTIONS.find((option) => option.value === value)?.hint;

  const choose = (quality: Casa3dQuality) => {
    if (quality === 'high' && weak && value !== 'high') {
      setAskHigh(true);
      return;
    }
    setAskHigh(false);
    onChange(quality);
  };

  return (
    <div className={['c3d-quality', className].filter(Boolean).join(' ')}>
      <Segmented
        label="Qualità della vista 3D"
        value={value}
        options={CASA3D_QUALITY_OPTIONS.map(({ value: level, label }) => ({ value: level, label }))}
        onChange={choose}
      />
      {askHigh ? (
        <div className="c3d-quality__confirm" role="group" aria-label="Conferma del livello High">
          <Body size="sm">
            High può rallentare questo dispositivo, che ha poca memoria o pochi processori. Passare
            a High?
          </Body>
          <div className="c3d-quality__buttons">
            <Button
              variant="primary"
              onClick={() => {
                setAskHigh(false);
                onChange('high');
              }}
            >
              Passa a High
            </Button>
            <Button variant="secondary" onClick={() => setAskHigh(false)}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        hint && (
          <Body size="sm" tone="muted">
            {hint}
          </Body>
        )
      )}
      {note && (
        <Body size="sm" tone="muted" role="status">
          {note}
        </Body>
      )}
    </div>
  );
}
