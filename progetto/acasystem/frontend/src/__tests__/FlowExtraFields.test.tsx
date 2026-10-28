/**
 * The fields that used to need the installer (REP-20261028-004, T7), as the person sees them:
 * a port or an entity picked from the server's list, a file sent to the server, a QR code
 * drawn on the screen and never answered. The server call of the upload is replaced.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@/templates/devices/uploadFlowFile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/templates/devices/uploadFlowFile')>()),
  uploadFlowFile: upload.send,
}));

import type { FlowFieldDto, FlowFormDto } from '@/@types/devices';
import { FlowFormStep } from '@/templates/devices/FlowFormStep';

afterEach(cleanup);

const formWith = (fields: FlowFieldDto[]): FlowFormDto => ({
  type: 'form',
  flowId: 'flow1',
  handler: 'acme',
  stepId: 'setup',
  title: 'Prova',
  description: null,
  waitSeconds: null,
  fields,
  errors: [],
});

const onSubmit = vi.fn();
const draw = (fields: FlowFieldDto[]) =>
  render(
    <FlowFormStep
      form={formWith(fields)}
      busy={false}
      extraError={null}
      onSubmit={onSubmit}
      onExit={vi.fn()}
    />
  );

beforeEach(() => {
  onSubmit.mockClear();
  upload.send.mockReset();
});

describe('a serial port', () => {
  const port: FlowFieldDto = {
    name: 'device',
    kind: 'select',
    required: true,
    label: 'Porta',
    allowCustom: true,
    options: [{ value: '/dev/ttyUSB0', label: 'Adattatore (/dev/ttyUSB0)' }],
  };

  it('is picked by name from the list and sent as its path', () => {
    draw([port]);
    fireEvent.change(screen.getByLabelText('Porta'), {
      target: { value: 'Adattatore (/dev/ttyUSB0)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).toHaveBeenCalledWith({ device: '/dev/ttyUSB0' });
  });

  it('takes a path typed by hand when the port is not listed', () => {
    draw([port]);
    fireEvent.change(screen.getByLabelText('Porta'), {
      target: { value: 'socket://192.168.1.50:6638' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).toHaveBeenCalledWith({ device: 'socket://192.168.1.50:6638' });
  });
});

describe('a file', () => {
  const file: FlowFieldDto = {
    name: 'backup',
    kind: 'file',
    required: true,
    label: 'Copia della radio',
    accept: '.json',
  };
  const pick = (container: HTMLElement, content = '{}') => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([content], 'radio.json', { type: 'application/json' })] },
    });
  };

  it('asks for the file before going on', () => {
    draw([file]);
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Nessun file scelto.')).toBeInTheDocument();
  });

  it('sends the file to the server and answers with the id it gives back', async () => {
    upload.send.mockResolvedValue({ fileId: 'a'.repeat(32), fileName: 'radio.json' });
    const { container } = draw([file]);
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', '.json');
    pick(container);
    await waitFor(() => expect(screen.getByText('radio.json')).toBeInTheDocument());
    expect(upload.send).toHaveBeenCalledWith('flow1', 'backup', expect.any(File));
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).toHaveBeenCalledWith({ backup: 'a'.repeat(32) });
  });

  it('says why a file did not go and keeps the step closed', async () => {
    upload.send.mockRejectedValue(
      Object.assign(new Error('x'), { status: 413, body: { error: 'Il file è troppo grande.' } })
    );
    const { container } = draw([file]);
    pick(container);
    expect(await screen.findByText('Il file è troppo grande.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a file over the limit without sending it', async () => {
    const { container } = draw([file]);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File(['x'], 'big.bin');
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText('Il file è troppo grande (massimo 10 MB).')).toBeInTheDocument();
    expect(upload.send).not.toHaveBeenCalled();
  });
});

describe('a QR code', () => {
  const qr: FlowFieldDto = {
    name: 'QR',
    kind: 'qr',
    required: false,
    label: 'QR',
    qr: { data: 'tuyaSmart--qrLogin?token=abc', level: 'Q' },
  };

  it('is drawn as a picture and nothing is answered for it', () => {
    const { container } = draw([qr]);
    const picture = screen.getByRole('img', { name: /Codice QR/ });
    expect(picture.tagName.toLowerCase()).toBe('svg');
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
    fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('says so when the text is too long to draw', () => {
    draw([{ ...qr, qr: { data: 'x'.repeat(5000), level: 'M' } }]);
    expect(screen.getByText('Non riesco a mostrare il codice. Esci e riprova.')).toBeInTheDocument();
  });
});
