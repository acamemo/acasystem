import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  /** Changing it clears a previous error (e.g. another widget id or settings key). */
  resetKey?: string;
  label?: string;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
  resetKey?: string;
}

/** Keeps a failing widget or page from taking the launcher down; shows the fallback instead. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) return { failed: false, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(
      `Launcher: ${this.props.label ?? 'component'} failed`,
      error,
      info.componentStack
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
