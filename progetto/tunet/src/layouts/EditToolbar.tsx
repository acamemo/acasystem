import { Icon as AcaIcon, Button, Container, Flex, Text } from '../primitives';
import type { EditToolbarProps } from '../types/home';
import SettingsMenuControl from './SettingsMenuControl';

/**
 * EditToolbar — add card, done, edit toggle, settings dropdown, connection dot.
 */
export default function EditToolbar({
  editMode,
  setShowAddCardModal,
  setShowConfigModal,
  setConfigTab,
  setShowThemeSidebar,
  setShowLayoutSidebar,
  setShowHeaderEditModal,
  onToggleEdit,
  showSettingsMenu = true,
  connected,
  updateCount,
  isMobile,
  t,
}: EditToolbarProps) {
  return (
    <Flex className="relative flex flex-shrink-0 items-center justify-end gap-4 overflow-visible pb-2">
      {editMode && (
        <Button
          onClick={() => setShowAddCardModal(true)}
          variant="control"
          className="group flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap"
        >
          <Text className="rounded-full p-1">
            <AcaIcon
              name="add"
              className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90"
            />
          </Text>
          <Text className="transition-colors duration-200">{t('nav.addCard')}</Text>
        </Button>
      )}

      {!isMobile && (
        <Button
          onClick={onToggleEdit}
          variant="control"
          className="aca-icon-control group h-11 w-11"
          title={editMode ? t('nav.done') : t('menu.edit')}
          aria-label={editMode ? t('nav.done') : t('menu.edit')}
          aria-pressed={editMode}
        >
          {editMode ? (
            <AcaIcon
              name="done"
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
            />
          ) : (
            <AcaIcon
              name="edit"
              className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12"
            />
          )}
        </Button>
      )}

      {showSettingsMenu && (
        <SettingsMenuControl
          setShowConfigModal={setShowConfigModal}
          setConfigTab={setConfigTab}
          setShowThemeSidebar={setShowThemeSidebar}
          setShowLayoutSidebar={setShowLayoutSidebar}
          setShowHeaderEditModal={setShowHeaderEditModal}
          onAddCard={() => setShowAddCardModal(true)}
          onToggleEdit={onToggleEdit}
          editMode={editMode}
          updateCount={updateCount}
          isMobile={isMobile}
          t={t}
        />
      )}

      {!connected && (
        <Flex
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all"
          style={{
            backgroundColor: 'rgba(255,255,255,0.01)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
          }}
        >
          <Container className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
        </Flex>
      )}
    </Flex>
  );
}
