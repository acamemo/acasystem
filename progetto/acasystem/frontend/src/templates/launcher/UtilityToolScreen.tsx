import { useLayoutEffect } from 'react';
import { Console } from '@/components/primitives';
import { TavanoTool } from '@/components/widgets/utilities/tavano/TavanoDetails';

/** A direct catalog entry uses the same content as the placed utility, without inventing a widget. */
export function UtilityToolScreen({ open, onClose, onPinUtility, onOpenChange, onExited }: {
  open: boolean;
  onClose: () => void;
  onPinUtility: () => void;
  onOpenChange: (open: boolean) => void;
  onExited: () => void;
}) {
  useLayoutEffect(() => { onOpenChange(open); return () => onOpenChange(false); }, [open, onOpenChange]);
  return <Console open={open} onClose={onClose} title="Tavano" onExited={onExited}>
    <TavanoTool onPinUtility={onPinUtility} />
  </Console>;
}
