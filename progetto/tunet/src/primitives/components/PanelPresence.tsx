import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  content: ReactNode;
  open: boolean;
  exiting: boolean;
}

/** Retain the last open panel while its exit plays, including its focus/scroll shell. */
export class PanelPresence extends Component<Props, State> {
  state: State = { content: null, open: false, exiting: false };
  private timer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromProps({ children }: Props, state: State): State | null {
    const open = Boolean(children);
    if (open) return { content: children, open: true, exiting: false };
    if (state.open) return { ...state, open: false, exiting: true };
    return null;
  }

  componentDidUpdate() {
    if (!this.state.exiting) {
      clearTimeout(this.timer);
      this.timer = undefined;
    } else if (!this.timer) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // Fallback also completes exits when CSS animations cannot run (e.g. hidden tabs).
      this.timer = setTimeout(this.finishExit, reduced ? 0 : 200);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  private finishExit = () => {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.state.exiting) this.setState({ content: null, exiting: false });
  };

  render() {
    if (!this.state.content) return null;
    return (
      <div
        className="aca-panel-presence"
        data-panel-state={this.state.exiting ? 'exiting' : 'open'}
        inert={this.state.exiting}
        aria-hidden={this.state.exiting || undefined}
        onAnimationEnd={(event) => {
          if (
            (event.target as HTMLElement).getAttribute('role') === 'dialog' &&
            event.animationName === 'aca-panel-out'
          )
            this.finishExit();
        }}
      >
        {this.state.content}
      </div>
    );
  }
}
