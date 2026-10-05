import { useId } from 'react';
import IconPicker from '../components/ui/IconPicker';
import { usePages } from '../contexts';
import { Button, Choice, Container, Flex, Input, Modal, Switch, Text } from '../primitives';
import type { EditPageProps } from '../types/management';

export default function EditPageModal({
  isOpen,
  onClose,
  t,
  editingPage,
  pageSettings,
  savePageSetting,
  pageDefaults,
  onDelete,
}: EditPageProps) {
  const nameId = useId();
  const { pagesConfig } = usePages();
  const isSinglePage = (pagesConfig?.pages || []).length === 1;
  const settings = pageSettings[editingPage];
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      titleId="edit-page-modal-title"
      title={t('modal.editPage.title')}
      closeLabel={t('common.close')}
      footer={
        <Button variant="secondary" className="w-full" onClick={onClose}>
          {t('common.ok')}
        </Button>
      }
    >
      <Container className="aca-management space-y-6">
        <Container className="space-y-2">
          <label htmlFor={nameId} className="aca-field-label">
            {t('form.name')}
          </label>
          <Input
            id={nameId}
            type="text"
            value={settings?.label || pageDefaults[editingPage]?.label || editingPage}
            onChange={(e) => savePageSetting(editingPage, 'label', e.target.value)}
          />
        </Container>
        <IconPicker
          value={settings?.icon || null}
          onSelect={(icon) => savePageSetting(editingPage, 'icon', icon)}
          onClear={() => savePageSetting(editingPage, 'icon', null)}
          t={t}
          maxHeightClass="max-h-72"
        />
        <Flex className="items-center justify-between gap-4">
          <Text className="text-sm font-medium">{t('form.hidePage')}</Text>
          <Switch
            checked={!!settings?.hidden}
            aria-label={t('form.hidePage')}
            onClick={() => savePageSetting(editingPage, 'hidden', !settings?.hidden)}
          />
        </Flex>
        {isSinglePage && (
          <Flex className="items-center justify-between gap-4">
            <Text className="text-sm font-medium">{t('form.hideSinglePagePill')}</Text>
            <Switch
              checked={!!settings?.hideSinglePagePill}
              aria-label={t('form.hideSinglePagePill')}
              onClick={() =>
                savePageSetting(editingPage, 'hideSinglePagePill', !settings?.hideSinglePagePill)
              }
            />
          </Flex>
        )}
        <Container className="space-y-3">
          <Text as="p" className="aca-field-label">
            {t('form.gridColumnsPage')}
          </Text>
          <Text as="p" className="text-sm text-[var(--text-secondary)]">
            {t('form.gridColumnsPageHint')}
          </Text>
          <Flex className="gap-3 p-1" role="group" aria-label={t('form.gridColumnsPage')}>
            {[1, 2, 3, 4, 5].map((cols) => (
              <Choice
                key={cols}
                className="flex-1 px-0"
                selected={settings?.gridColumns === cols}
                onClick={() => savePageSetting(editingPage, 'gridColumns', cols)}
              >
                {cols}
              </Choice>
            ))}
          </Flex>
          {settings?.gridColumns !== undefined && (
            <Button
              variant="control"
              className="w-full rounded-xl px-4"
              onClick={() => savePageSetting(editingPage, 'gridColumns', null)}
            >
              {t('settings.useGlobal')}
            </Button>
          )}
        </Container>
        {editingPage !== 'home' && (
          <Button
            variant="control"
            className="aca-danger w-full rounded-xl px-4"
            onClick={() => onDelete(editingPage)}
          >
            {t('form.deletePage')}
          </Button>
        )}
      </Container>
    </Modal>
  );
}
