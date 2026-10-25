import { Body, Button, Caption, Sheet } from '@/components/primitives';
import { CATEGORY_PAGES, categoryPageSeeds } from './categoryPages';

export function CategoryPageSheet({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (category?: string) => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuova pagina"
      description="Scegli una griglia vuota o una categoria con i widget già presenti."
    >
      <div className="aca-settings">
        <Button variant="control" onClick={() => onChoose('tutte')}>
          Tutte le categorie
        </Button>
        <Button variant="control" onClick={() => onChoose()}>
          Griglia vuota
        </Button>
        {CATEGORY_PAGES.map((category) => (
          <Button key={category.id} variant="control" onClick={() => onChoose(category.id)}>
            <Body size="sm">{category.label}</Body>
            <Caption tone="muted">
              {categoryPageSeeds(category.id, 'anteprima').length} widget
            </Caption>
          </Button>
        ))}
        <Caption tone="muted">Collega i dispositivi toccando il widget da collegare.</Caption>
      </div>
    </Sheet>
  );
}
