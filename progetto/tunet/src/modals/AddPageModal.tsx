import { useId, useState } from 'react';
import IconPicker from '../components/ui/IconPicker';
import { Button, Choice, Container, Flex, Icon, Input, Modal, Text } from '../primitives';
import type { IconProps } from '../primitives/components/Icon';
import type { AddPageProps } from '../types/management';

export default function AddPageModal({
  isOpen,
  onClose,
  t,
  newPageLabel,
  setNewPageLabel,
  newPageIcon,
  setNewPageIcon,
  onCreate,
  onCreateMedia,
  onCreateSonos,
  onCreateLights,
  onCreateBattery,
  onCreateRoomExplorer,
}: AddPageProps) {
  const [activeTab, setActiveTab] = useState('standard');
  const nameId = useId();
  const types: {
    id: string;
    icon: IconProps['name'];
    label: string;
    description?: string;
    create: () => void;
  }[] = [
    { id: 'standard', icon: 'grid', label: 'page.create', create: onCreate },
    {
      id: 'media',
      icon: 'music',
      label: 'addCard.type.media',
      description: 'media.chooseMedia',
      create: onCreateMedia,
    },
    {
      id: 'sonos',
      icon: 'speaker',
      label: 'addCard.type.sonos',
      description: 'sonos.createDescription',
      create: onCreateSonos,
    },
    {
      id: 'lights',
      icon: 'light',
      label: 'addCard.type.light',
      description: 'lights.createDescription',
      create: onCreateLights,
    },
    {
      id: 'battery',
      icon: 'battery',
      label: 'addCard.type.battery',
      description: 'battery.createDescription',
      create: onCreateBattery,
    },
    {
      id: 'roomExplorer',
      icon: 'home',
      label: 'addCard.type.roomExplorer',
      description: 'roomExplorer.createDescription',
      create: onCreateRoomExplorer,
    },
  ];
  const current = types.find((type) => type.id === activeTab)!;
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      titleId="add-page-modal-title"
      title={t('modal.addPage.title')}
      closeLabel={t('common.close')}
      footer={
        <Button variant="primary" className="w-full" onClick={current.create}>
          <Icon name="add" size={20} />
          {t(activeTab === 'sonos' ? 'sonos.createPage' : 'page.create')}
        </Button>
      }
    >
      <Container className="aca-management space-y-6">
        <Text as="p" className="aca-field-label">
          {t('addCard.cardType')}
        </Text>
        <Flex className="flex-wrap gap-3 p-1" role="group" aria-label={t('addCard.cardType')}>
          {types.map((type) => (
            <Choice
              key={type.id}
              selected={activeTab === type.id}
              onClick={() => setActiveTab(type.id)}
            >
              <Icon name={type.icon} size={18} />
              {t(type.label)}
            </Choice>
          ))}
        </Flex>
        {activeTab === 'standard' ? (
          <>
            <Container className="space-y-2">
              <label htmlFor={nameId} className="aca-field-label">
                {t('form.name')}
              </label>
              <Input
                id={nameId}
                type="text"
                value={newPageLabel}
                onChange={(e) => setNewPageLabel(e.target.value)}
                placeholder={t('form.exampleName')}
              />
            </Container>
            <IconPicker
              value={newPageIcon}
              onSelect={setNewPageIcon}
              onClear={() => setNewPageIcon(null)}
              t={t}
              maxHeightClass="max-h-60"
            />
          </>
        ) : (
          <Container surface="inset" className="rounded-2xl p-5">
            <Text as="p" className="text-sm leading-relaxed">
              {t(current.description!)}
            </Text>
          </Container>
        )}
      </Container>
    </Modal>
  );
}
