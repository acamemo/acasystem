import { useCallback, useLayoutEffect, useRef } from 'react';
import { Console } from '@/components/primitives';
import {
  DiscoveryContent,
  type DiscoveryContentProps,
} from '@/components/widgets/utilities/discover/DiscoveryContent';
import './discovery.css';

export { UNDO_MS } from '@/components/widgets/utilities/discover/DiscoveryContent';
export interface DiscoveryScreenProps extends DiscoveryContentProps {
  open: boolean;
  onClose: () => void;
  searchWindow?: boolean;
  onExited?: () => void;
  onOpenChange?: (open: boolean) => void;
}

function PresentedContent({
  onPresented,
  children,
}: {
  onPresented: (present: boolean) => void;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    onPresented(true);
    return () => onPresented(false);
  }, [onPresented]);
  return children;
}

/** Fullscreen shell. The same body is used by the utility's fallback details. */
export function DiscoveryScreen({
  open,
  onClose,
  onExited,
  onOpenChange,
  searchWindow: _searchWindow,
  ...content
}: DiscoveryScreenProps) {
  const visible = useRef(open);
  visible.current = open;
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;
  const actions = useRef(content);
  actions.current = content;
  const place = useCallback(
    (id: string) => (visible.current ? actions.current.onPlaceDevice?.(id) : undefined),
    []
  );
  const show = useCallback(
    (id: string) => (visible.current ? actions.current.onOpenDevice?.(id) : undefined),
    []
  );
  const presented = useRef(false);
  const report = useCallback((present: boolean) => {
    presented.current = present;
    callback.current?.(present && visible.current);
  }, []);
  useLayoutEffect(() => {
    if (!open || presented.current) callback.current?.(open);
  }, [open]);
  return (
    <Console open={open} onClose={onClose} onExited={onExited} title="Trova dispositivi">
      <PresentedContent onPresented={report}>
        <DiscoveryContent
          {...content}
          open={open}
          onPlaceDevice={content.onPlaceDevice ? place : undefined}
          onOpenDevice={content.onOpenDevice ? show : undefined}
        />
      </PresentedContent>
    </Console>
  );
}
