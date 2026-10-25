import { Button } from '@/components/primitives';

export interface ScreenCommandsProps {
  /** Edit mode, the page overview or a widget being dragged: the commands are out of the way. */
  hidden?: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onEdit: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * The three things the screen does by touch and shows no button for (ADR-0016, C3): edit the
 * layout (a long press on an empty place), the page before and the page after (a swipe; the
 * indicator is out of sight). They stay in the tab order and in the reading order of assistive
 * technology, invisible until one has the keyboard focus (appShell.css), so whoever cannot swipe or
 * press and hold still reaches them. «Modifica la disposizione» is not «Modifica le pagine», which
 * is the bar of edit mode that opens the page editor.
 */
export function ScreenCommands({
  hidden = false,
  canGoBack,
  canGoForward,
  onEdit,
  onPrevious,
  onNext,
}: ScreenCommandsProps) {
  return (
    <div
      className="aca-screen-commands"
      role="group"
      aria-label="Comandi della schermata"
      inert={hidden || undefined}
      aria-hidden={hidden || undefined}
      data-no-long-press
    >
      <Button
        variant="control"
        size="md"
        className="aca-frame-pill"
        onClick={onEdit}
        data-launcher-edit
      >
        Modifica la disposizione
      </Button>
      <Button
        variant="control"
        size="md"
        className="aca-frame-pill"
        disabled={!canGoBack}
        onClick={onPrevious}
      >
        Pagina precedente
      </Button>
      <Button
        variant="control"
        size="md"
        className="aca-frame-pill"
        disabled={!canGoForward}
        onClick={onNext}
      >
        Pagina successiva
      </Button>
    </div>
  );
}
