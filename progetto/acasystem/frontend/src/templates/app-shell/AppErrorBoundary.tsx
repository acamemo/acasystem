import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Body, Button, Icon, Surface, Title } from '@/components/primitives';
import { isChunkLoadError, reloadForChunkErrorOnce } from '@/utils/launcher/chunkReload';
import './appShell.css';

interface AppErrorBoundaryState {
  failed: boolean;
}

/** Last safety net of the app: an Italian message in the kit and a way to reload. */
export class AppErrorBoundary extends Component<{ children?: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('App Error:', error, info.componentStack);
    if (isChunkLoadError(error)) reloadForChunkErrorOnce();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="aca-app-error">
        <Surface>
          <div className="aca-app-error__content">
            <Icon name="warning" size="lg" className="aca-app-error__icon" />
            <Title level={1}>Qualcosa non ha funzionato</Title>
            <Body tone="muted">
              L’interfaccia ha incontrato un errore imprevisto. Ricaricala per ripartire: le
              impostazioni salvate restano.
            </Body>
            <Button variant="primary" onClick={() => globalThis.window?.history.go(0)}>
              Ricarica
            </Button>
          </div>
        </Surface>
      </div>
    );
  }
}
