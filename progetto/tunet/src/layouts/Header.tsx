import type { CSSProperties } from 'react';
import { Icon as AcaIcon, Button, Container, Flex, Heading, Text } from '../primitives';
import type { HeaderProps } from '../types/home';
import { getLocaleForLanguage } from '../i18n';
import { useConfig } from '../contexts';
import BatteryBar from '../components/ui/BatteryBar';

const MOBILE_ALIGNMENT_CLASSES = {
  left: {
    container: 'items-start text-left',
    title: 'justify-start',
    date: 'text-left',
  },
  center: {
    container: 'items-center text-center',
    title: 'justify-center',
    date: 'text-center',
  },
  right: {
    container: 'items-end text-right',
    title: 'justify-end',
    date: 'text-right',
  },
};

export default function Header({
  now,
  headerTitle,
  headerScale,
  editMode,
  headerSettings = { showTitle: true, showClock: true, showDate: true },
  setShowHeaderEditModal,
  t,
  children,
  isMobile,
  sectionSpacing,
}: HeaderProps) {
  const { language } = useConfig();

  const headerBottom = Number.isFinite(sectionSpacing?.statusToNav)
    ? sectionSpacing?.statusToNav
    : isMobile
      ? 8
      : 40;

  const fontWeight = headerSettings?.fontWeight || '300';
  const selectedFontFamily = headerSettings?.fontFamily || headerSettings?.headerFont || 'sans';
  const fontFamilyMap: Record<string, string> = {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    Inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    Roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    Lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
    Montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
    'Open Sans': '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    Oswald: 'Oswald, "Arial Narrow", Arial, sans-serif',
    'Playfair Display': '"Playfair Display", Georgia, serif',
    Raleway: 'Raleway, "Helvetica Neue", Arial, sans-serif',
    georgia: 'Georgia, serif',
    courier: '"Courier New", monospace',
    trebuchet: '"Trebuchet MS", sans-serif',
    comic: '"Comic Sans MS", cursive',
    times: '"Times New Roman", serif',
    verdana: 'Verdana, sans-serif',
  };
  const resolvedFontFamily = fontFamilyMap[selectedFontFamily] || fontFamilyMap.sans;
  const letterSpacingMap: Record<string, string> = {
    tight: '0.05em',
    normal: '0.2em',
    wide: '0.5em',
    extraWide: '0.8em',
  };
  const letterSpacingMobile: Record<string, string> = {
    tight: '0.05em',
    normal: '0.2em',
    wide: '0.3em',
    extraWide: '0.5em',
  };
  const lsDesktop = letterSpacingMap[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const lsMobile = letterSpacingMobile[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const fontStyleVal = headerSettings?.fontStyle || 'normal';
  const clockFormat = headerSettings?.clockFormat || '24h';
  const showClockOnMobile = headerSettings?.showClockOnMobile ?? true;
  const is12h = clockFormat === '12h';
  const clockScale = headerSettings?.clockScale ?? 1.0;
  const dateScale = headerSettings?.dateScale ?? 1.0;
  const locale = getLocaleForLanguage(language);

  const timeOptions: Intl.DateTimeFormatOptions = is12h
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { hour: '2-digit', minute: '2-digit', hour12: false };

  const timeStr = now.toLocaleTimeString(locale, timeOptions);
  const headingFontSize = `calc(${
    isMobile ? 'clamp(1.75rem, 8vw, 2.5rem)' : 'clamp(3rem, 5vw, 3.75rem)'
  } * ${headerScale})`;
  const clockFontSize = `calc(${
    isMobile ? 'clamp(2.4rem, 12vw, 3.25rem)' : 'clamp(3rem, 5vw, 3.75rem)'
  } * ${headerScale} * ${clockScale})`;

  const isBattery = headerSettings?.headerStyle === 'battery';
  const batteryVariant = headerSettings?.batteryVariant || 'glass';
  const showBatteryNub = headerSettings?.showBatteryNub ?? true;
  const mobileAlignment =
    headerSettings?.mobileAlignment && MOBILE_ALIGNMENT_CLASSES[headerSettings.mobileAlignment]
      ? headerSettings.mobileAlignment
      : 'center';
  const mobileAlignmentClasses = MOBILE_ALIGNMENT_CLASSES[mobileAlignment];

  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const titleStyle: CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: headingFontSize,
    fontWeight: fontWeight,
    letterSpacing: isMobile ? lsMobile : lsDesktop,
    fontStyle: fontStyleVal === 'italic' ? 'italic' : 'normal',
    textTransform: fontStyleVal === 'uppercase' ? 'uppercase' : 'none',
    fontFamily: resolvedFontFamily,
  };

  const clockStyle: CSSProperties = {
    fontSize: clockFontSize,
    color: 'var(--text-primary)',
    fontFamily: resolvedFontFamily,
  };

  const showClock = headerSettings.showClock && (!isMobile || showClockOnMobile);

  // ── Battery layout ──
  if (isBattery) {
    return (
      <header
        className="aca-header relative pt-4 font-sans md:pt-0"
        style={{ marginBottom: `${headerBottom}px` }}
      >
        {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
          <Container className="edit-controls-anim absolute top-0 left-1/2 z-50 -translate-x-1/2">
            <Button
              onClick={() => setShowHeaderEditModal(true)}
              variant="control"
              className="flex items-center gap-2 rounded-full px-4 py-2"
            >
              <AcaIcon name="edit" className="h-4 w-4" />
              <Text className="text-xs font-bold tracking-widest uppercase">
                {t('header.addHeader')}
              </Text>
            </Button>
          </Container>
        )}

        <BatteryBar
          variant={batteryVariant}
          showNub={showBatteryNub}
          isMobile={isMobile}
          className={isMobile ? `battery-bar--align-${mobileAlignment}` : ''}
        >
          {/* Left: Title */}
          {headerSettings.showTitle && (
            <Heading
              level={1}
              className="aca-header-title leading-none whitespace-nowrap select-none"
              style={titleStyle}
            >
              {headerTitle || 'Tunet'}
            </Heading>
          )}

          {/* Center: Date */}
          {headerSettings.showDate && !isMobile && (
            <Text
              as="p"
              className="aca-header-date leading-none font-medium"
              style={{
                fontSize: `calc(0.75rem * ${dateScale})`,
                fontFamily: resolvedFontFamily,
              }}
            >
              {dateStr}
            </Text>
          )}

          {/* Right: Clock */}
          {showClock && (
            <Heading
              level={2}
              className="aca-header-clock leading-none font-light tracking-[0.02em] whitespace-nowrap select-none"
              style={clockStyle}
            >
              {timeStr}
            </Heading>
          )}
        </BatteryBar>

        {/* Mobile date below battery bar */}
        {headerSettings.showDate && isMobile && (
          <Text
            as="p"
            className={`aca-header-date mt-2 leading-none font-medium ${mobileAlignmentClasses.date}`}
            style={{
              fontSize: `calc(0.75rem * ${dateScale})`,
              fontFamily: resolvedFontFamily,
            }}
          >
            {dateStr}
          </Text>
        )}

        <Flex className="flex w-full flex-col gap-6 pt-6 md:gap-3 md:pt-3">{children}</Flex>
      </header>
    );
  }

  // ── Classic layout (default) ──
  return (
    <header
      className="aca-header relative pt-4 font-sans md:pt-0"
      style={{ marginBottom: `${headerBottom}px` }}
    >
      {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
        <Container className="edit-controls-anim absolute top-0 left-1/2 z-50 -translate-x-1/2">
          <Button
            onClick={() => setShowHeaderEditModal(true)}
            variant="control"
            className="flex items-center gap-2 rounded-full px-4 py-2"
          >
            <AcaIcon name="edit" className="h-4 w-4" />
            <Text className="text-xs font-bold tracking-widest uppercase">
              {t('header.addHeader')}
            </Text>
          </Button>
        </Container>
      )}

      <Flex
        className={`flex items-start justify-between leading-none ${
          isMobile ? `flex-col gap-4 ${mobileAlignmentClasses.container}` : 'gap-10'
        }`}
      >
        <Flex
          className={`flex items-center gap-4 ${
            isMobile ? `w-full ${mobileAlignmentClasses.title}` : ''
          }`}
        >
          {headerSettings.showTitle && (
            <Heading
              level={1}
              className="aca-header-title leading-none select-none"
              style={titleStyle}
            >
              {headerTitle || 'Tunet'}
            </Heading>
          )}
        </Flex>

        {headerSettings.showClock && !isMobile && (
          <Heading
            level={2}
            className="aca-header-clock leading-none font-light tracking-[0.02em] select-none"
            style={clockStyle}
          >
            {timeStr}
          </Heading>
        )}

        {headerSettings.showClock && isMobile && showClockOnMobile && (
          <Heading
            level={2}
            className="aca-header-clock leading-none font-light tracking-[0.02em] select-none"
            style={clockStyle}
          >
            {timeStr}
          </Heading>
        )}
      </Flex>

      {headerSettings.showDate && !isMobile && (
        <Text
          as="p"
          className="aca-header-date mt-3 leading-none font-medium"
          style={{
            fontSize: `calc(0.75rem * ${dateScale})`,
            fontFamily: resolvedFontFamily,
          }}
        >
          {dateStr}
        </Text>
      )}

      <Flex
        className={`flex w-full flex-col ${
          isMobile ? 'gap-4 pt-4' : 'gap-6 pt-6 md:gap-3 md:pt-3'
        }`}
      >
        {children}
      </Flex>
    </header>
  );
}
