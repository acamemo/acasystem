import { IconText, Surface, type IconName } from '@/components/primitives';
import type { ToastType } from '@/@types/dashboard';
import { useToast } from '@/hooks/context/ToastContext';
import './toast.css';

const ICON: Record<ToastType, IconName> = { error: 'warning', success: 'done', info: 'info' };
const TONE = { error: 'danger', success: 'active', info: 'info' } as const;

/**
 * Toasts of the app (failed service calls and the like), at the bottom centre above the page
 * indicator. Errors are announced at once, the others politely; the icon and the words carry
 * the kind, the LED marks errors.
 */
export function ToastHost() {
  const { toasts } = useToast();
  return (
    <div className="aca-toasts" aria-label="Notifiche">
      {toasts.map((toast) => {
        const type: ToastType = toast.type ?? 'error';
        return (
          <div key={toast.id} className="aca-toast" role={type === 'error' ? 'alert' : 'status'}>
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
