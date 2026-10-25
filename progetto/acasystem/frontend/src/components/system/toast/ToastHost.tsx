import { IconText, Surface, type IconName } from '@/components/primitives';
import type { ToastType } from '@/@types/dashboard';
import { useToast } from '@/hooks/context/ToastContext';
import { useLeavingItems } from '@/hooks/launcher/useLeaving';
import './toast.css';

const ICON: Record<ToastType, IconName> = { error: 'warning', success: 'done', info: 'info' };
const TONE = { error: 'danger', success: 'active', info: 'info' } as const;
/** `--aca-dur-exit-sm` (tokens.css): a toast that goes stays for this long, fading (D-M14). */
export const TOAST_EXIT_MS = 160;

/**
 * Toasts of the app (failed service calls and the like), at the bottom centre above the page
 * indicator. Errors are announced at once, the others politely; the icon and the words carry
 * the kind, the LED marks errors. A toast that goes fades and shrinks a little for 160 ms instead
 * of vanishing (REP-20261023-006, D-M14); while it goes it is out of the accessibility tree.
 */
export function ToastHost() {
  const { toasts } = useToast();
  const entries = useLeavingItems(toasts, TOAST_EXIT_MS);
  return (
    <div className="aca-toasts" aria-label="Notifiche">
      {entries.map(({ item: toast, leaving }) => {
        const type: ToastType = toast.type ?? 'error';
        return (
          <div
            key={toast.id}
            className={leaving ? 'aca-toast is-leaving' : 'aca-toast'}
            role={type === 'error' ? 'alert' : 'status'}
            aria-hidden={leaving || undefined}
          >
            <Surface error={type === 'error'} contentClassName="aca-toast__content">
              <IconText icon={ICON[type]} iconTone={TONE[type]} tone="ink">
                {toast.message}
              </IconText>
            </Surface>
          </div>
        );
      })}
    </div>
  );
}
