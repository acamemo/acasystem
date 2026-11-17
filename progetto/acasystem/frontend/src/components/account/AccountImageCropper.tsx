import { useEffect, useRef, useState } from 'react';
import { Body, Button, Caption, Numeric, Sheet, Slider } from '@/components/primitives';
import type { AccountImageKind } from '@/api/accountApi';
import { cropDataUrl, cropGeometry, drawCrop, exportCrop, INITIAL_CROP, loadCropImage, type CropPosition } from './imageCrop';

export function AccountImageCropper({ file, kind, onSave, onClose }: {
  file: File; kind: AccountImageKind; onSave: (dataUrl: string) => Promise<void>; onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<ImageBitmap | HTMLImageElement | null>(null);
  const [position, setPosition] = useState<CropPosition>({ ...INITIAL_CROP });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; origin: CropPosition } | null>(null);
  useEffect(() => {
    let active = true; let loaded: ImageBitmap | HTMLImageElement | null = null;
    setImage(null); setPosition({ ...INITIAL_CROP }); drag.current = null;
    void loadCropImage(file).then((value) => {
      loaded = value;
      if (active) setImage(value); else if ('close' in value) value.close();
    }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Foto non leggibile.'); });
    return () => { active = false; if (loaded && 'close' in loaded) loaded.close(); };
  }, [file]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    try { drawCrop(canvas.current, image, kind, position); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Anteprima non disponibile.'); }
  }, [image, kind, position]);
  const save = async () => {
    if (!image || busy) return; setBusy(true); setError('');
    try { await onSave(await cropDataUrl(await exportCrop(image, kind, position))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Foto non salvata. Riprova.'); }
    finally { setBusy(false); }
  };
  return <Sheet open title={kind === 'avatar' ? 'Ritaglia la foto profilo' : 'Ritaglia lo sfondo account'}
    onClose={() => { if (!busy) onClose(); }} footer={<>
      <Button variant="control" disabled={busy} onClick={onClose}>Annulla</Button>
      <Button variant="primary" disabled={!image} loading={busy} onClick={() => void save()}>Usa questo ritaglio</Button>
    </>}>
    <div className="aca-account-crop">
      <Caption>Trascina la foto o usa i cursori per scegliere l’inquadratura.</Caption>
      <canvas ref={canvas} className={`aca-account-crop__preview aca-account-crop__preview--${kind}`} aria-label="Anteprima del ritaglio"
        onPointerDown={(event) => { if (busy || !image || drag.current) return; drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: position }; event.currentTarget.setPointerCapture?.(event.pointerId); }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.pointerId !== event.pointerId || !image || busy) return;
          const rect = event.currentTarget.getBoundingClientRect(); if (!rect.width || !rect.height) return;
          const geometry = cropGeometry(image.width, image.height, kind, drag.current.origin);
          setPosition({ ...drag.current.origin,
            x: Math.max(-1, Math.min(1, drag.current.origin.x + (geometry.maxX ? (event.clientX - drag.current.x) * geometry.width / rect.width / geometry.maxX : 0))),
            y: Math.max(-1, Math.min(1, drag.current.origin.y + (geometry.maxY ? (event.clientY - drag.current.y) * geometry.height / rect.height / geometry.maxY : 0))),
          });
        }} onPointerUp={(event) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }} onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }} />
      {!image && !error && <Body role="status">Preparazione della foto…</Body>}
      {(['zoom', 'x', 'y'] as const).map((key) => <div className="aca-account-crop__control" key={key}>
        <Caption>{key === 'zoom' ? 'Zoom' : key === 'x' ? 'Orizzontale' : 'Verticale'}</Caption>
        <Numeric>{key === 'zoom' ? `${position.zoom.toLocaleString('it-IT', { maximumFractionDigits: 2 })}×` : `${Math.round(position[key] * 100)}%`}</Numeric>
        <Slider label={key === 'zoom' ? 'Zoom del ritaglio' : key === 'x' ? 'Posizione orizzontale' : 'Posizione verticale'} min={key === 'zoom' ? 1 : -1} max={key === 'zoom' ? 4 : 1} step={key === 'zoom' ? 0.05 : 0.01} value={position[key]} disabled={!image || busy} onValueChange={(next) => setPosition((value) => ({ ...value, [key]: next }))} />
      </div>)}
      <Button variant="control" disabled={!image || busy} onClick={() => setPosition((value) => ({ ...value, turns: (value.turns + 1) % 4, x: 0, y: 0 }))}>Ruota di 90°</Button>
      {error && <Body role="alert">{error}</Body>}
    </div>
  </Sheet>;
}
