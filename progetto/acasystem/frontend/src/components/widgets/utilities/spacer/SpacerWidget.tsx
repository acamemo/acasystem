import { Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { settingString } from '../shared/entity';
import '../utilities.css';

type Align = 'left' | 'center' | 'right';

/**
 * Layout separator (`spacer_card_*`, legacy SpacerCard): an empty gap or a hairline divider
 * with an optional heading. Visible only as space; in edit mode it shows a light outline.
 */
export function SpacerWidget({ settings, editMode }: WidgetProps) {
  const variant = settings.variant === 'divider' ? 'divider' : 'spacer';
  const heading = settingString(settings, 'heading')?.trim() ?? '';
  const align: Align =
    settings.headingAlign === 'left' || settings.headingAlign === 'right'
      ? settings.headingAlign
      : 'center';

  return (
    <div
      className="utility-spacer"
      data-editing={editMode ? 'true' : undefined}
      role={variant === 'divider' ? 'separator' : 'presentation'}
      aria-label={variant === 'divider' && heading ? heading : undefined}
    >
      {variant === 'divider' && (
        <div className="utility-divider" aria-hidden={heading ? true : undefined}>
          {heading && align !== 'left' && <span className="utility-divider__line" />}
          {heading ? (
            <Caption tone="muted" className="utility-truncate">
              {heading}
            </Caption>
          ) : (
            <span className="utility-divider__line" />
          )}
          {heading && align !== 'right' && <span className="utility-divider__line" />}
        </div>
      )}
      {editMode && variant === 'spacer' && <span className="sr-only">Spazio vuoto</span>}
    </div>
  );
}
