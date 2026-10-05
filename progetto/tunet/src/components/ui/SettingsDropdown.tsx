import { Icon as AcaIcon, Button, Container, Text } from '../../primitives';
import type { SettingsDropdownProps } from '../../types/home';
// Dropdown Menu Component that looks nice
import { memo, useState, useRef, useEffect } from 'react';

function SettingsDropdown({
  onOpenSettings,
  onOpenTheme,
  onOpenLayout,
  onOpenHeader,
  onAddCard,
  onToggleEdit,
  editMode,
  isMobile,
  floating = false,
  t,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFloatingDone = Boolean(floating && isMobile && editMode && onToggleEdit);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (action?: () => void) => {
    setIsOpen(false);
    if (typeof action === 'function') action();
  };

  const handleTrigger = () => {
    if (isFloatingDone) {
      setIsOpen(false);
      onToggleEdit?.();
      return;
    }
    setIsOpen((open) => !open);
  };

  return (
    <>
      {floating && isOpen && (
        <Container
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          data-testid="settings-mobile-backdrop"
        />
      )}

      <Container className="relative z-50" ref={dropdownRef}>
        <Button
          onClick={handleTrigger}
          variant="control"
          className={`aca-icon-control group relative z-50 ${floating ? 'h-14 w-14' : 'h-11 w-11'}`}
          aria-pressed={isFloatingDone ? true : undefined}
          aria-label={
            isFloatingDone ? t('nav.done') : floating ? t('menu.edit') : t('menu.settings')
          }
          aria-expanded={isFloatingDone ? undefined : isOpen}
          aria-controls={isFloatingDone ? undefined : 'settings-dropdown-menu'}
          data-testid="settings-dropdown-trigger"
        >
          {isFloatingDone ? (
            <AcaIcon
              name="done"
              className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
            />
          ) : floating ? (
            <AcaIcon
              name="edit"
              className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <AcaIcon
              name="settings"
              className={`h-5 w-5 transition-transform duration-500 ${isOpen ? 'rotate-90' : 'group-hover:rotate-45'}`}
            />
          )}
        </Button>

        {/* Dropdown Menu */}
        <Container
          id="settings-dropdown-menu"
          surface="raised"
          className={`aca-menu absolute right-0 z-50 w-60 transform transition-all duration-200 ${
            floating ? 'bottom-full mb-3 origin-bottom-right' : 'top-full mt-2 origin-top-right'
          } ${
            isOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : `pointer-events-none scale-95 opacity-0 ${floating ? 'translate-y-2' : '-translate-y-2'}`
          }`}
          style={{ visibility: isOpen ? 'visible' : 'hidden' }}
          role="menu"
          aria-hidden={!isOpen}
          data-testid="settings-dropdown-menu"
        >
          <Container className="space-y-1">
            {isMobile && onAddCard && (
              <Button
                onClick={() => handleSelect(onAddCard)}
                className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
                aria-label={t('nav.addCard')}
                role="menuitem"
                data-testid="settings-menu-add-card"
              >
                <Container surface="inset" className="aca-menu-icon">
                  <AcaIcon name="add" className="h-4 w-4" />
                </Container>
                <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                  {t('nav.addCard')}
                </Text>
              </Button>
            )}

            {isMobile && onToggleEdit && !editMode && (
              <>
                <Button
                  onClick={() => handleSelect(onToggleEdit)}
                  className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
                  aria-label={t('menu.edit')}
                  role="menuitem"
                  data-testid="settings-menu-edit"
                >
                  <Container surface="inset" className="aca-menu-icon">
                    <AcaIcon name="edit" className="h-4 w-4" />
                  </Container>
                  <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                    {t('menu.edit')}
                  </Text>
                </Button>
                <Container className="aca-menu-divider mx-2 my-2 h-px" />
              </>
            )}

            <Button
              onClick={() => handleSelect(onOpenTheme)}
              className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openAppearance')}
              role="menuitem"
              data-testid="settings-menu-theme"
            >
              <Container surface="inset" className="aca-menu-icon">
                <AcaIcon name="appearance" className="h-4 w-4" />
              </Container>
              <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabAppearance')}
              </Text>
            </Button>

            <Button
              onClick={() => handleSelect(onOpenLayout)}
              className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openLayout')}
              role="menuitem"
              data-testid="settings-menu-layout"
            >
              <Container surface="inset" className="aca-menu-icon">
                <AcaIcon name="grid" className="h-4 w-4" />
              </Container>
              <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabLayout')}
              </Text>
            </Button>

            <Button
              onClick={() => handleSelect(onOpenHeader)}
              className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openHeader')}
              role="menuitem"
              data-testid="settings-menu-header"
            >
              <Container surface="inset" className="aca-menu-icon">
                <AcaIcon name="text" className="h-4 w-4" />
              </Container>
              <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabHeader')}
              </Text>
            </Button>

            <Container className="aca-menu-divider mx-2 my-2 h-px" />

            <Button
              onClick={() => handleSelect(onOpenSettings)}
              className="aca-menu-item group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openSystem')}
              role="menuitem"
              data-testid="settings-menu-system"
            >
              <Container surface="inset" className="aca-menu-icon">
                <AcaIcon name="server" className="h-4 w-4" />
              </Container>
              <Text as="p" className="text-sm font-bold text-[var(--text-primary)]">
                {t('menu.system')}
              </Text>
            </Button>
          </Container>
        </Container>
      </Container>
    </>
  );
}

export default memo(SettingsDropdown);
