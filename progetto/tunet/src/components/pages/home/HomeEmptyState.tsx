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
    <Flex className="aca-home-empty min-h-[60vh] flex-col items-center justify-center px-4 py-10 text-center font-sans sm:px-8">
      <Container surface="inset" className="aca-home-emblem mb-8 rounded-full" aria-hidden="true">
        <Container surface="raised" className="aca-home-emblem__core rounded-full">
          <Icon name="grid" className="h-12 w-12" />
        </Container>
      </Container>
      <Heading
        level={2}
        className="mb-3 text-3xl font-medium tracking-tight text-[var(--text-primary)]"
      >
        {t('welcome.title')}
      </Heading>
      <Text as="p" className="mb-9 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
        {t('welcome.subtitle')}
      </Text>
      <Flex className="aca-home-actions flex-col gap-5 sm:flex-row">
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
