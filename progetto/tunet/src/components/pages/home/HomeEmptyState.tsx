import { Button, Container, Flex, Heading, Icon, Text } from '../../../primitives';
import type { Translate } from '../../../types/home';

export interface HomeEmptyStateProps {
  totalCards: number;
  onAddCard: () => void;
  onLoadProfile: () => void;
  t: Translate;
}

export default function HomeEmptyState({
  totalCards,
  onAddCard,
  onLoadProfile,
  t,
}: HomeEmptyStateProps) {
  return (
    <Flex className="animate-in fade-in zoom-in min-h-[60vh] flex-col items-center justify-center p-8 text-center font-sans opacity-90 duration-500">
      <Container className="mb-6 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 shadow-lg shadow-black/5">
        <Icon name="grid" className="h-12 w-12 text-[var(--text-primary)] opacity-80" />
      </Container>
      <Heading
        level={2}
        className="mb-3 text-3xl font-light tracking-tight text-[var(--text-primary)] uppercase"
      >
        {t('welcome.title')}
      </Heading>
      <Text as="p" className="mb-8 max-w-md text-lg leading-relaxed text-[var(--text-secondary)]">
        {t('welcome.subtitle')}
      </Text>
      <Flex className="flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={onAddCard}>
          <Icon name="add" className="h-5 w-5" />
          {t('welcome.addCard')}
        </Button>
        {totalCards === 0 && (
          <Button variant="secondary" onClick={onLoadProfile}>
            <Icon name="profile" className="h-5 w-5" />
            {t('welcome.restoreProfile')}
          </Button>
        )}
      </Flex>
    </Flex>
  );
}
