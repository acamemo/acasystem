import type { IconProps as MxIconProps } from 'mx-icons';
import type { ReactNode } from 'react';

/**
 * Local glyphs for icons that mx-icons 1.1.2 declares in its types but does not ship at
 * runtime (Power, Thermometer, Fan, blinds). Same 24×24 grid, 1.5 stroke and round caps as the
 * mx-icons linear set, and the same props, so the Icon primitive treats them alike.
 */
function Glyph({
  size = 24,
  color = 'currentColor',
  className = '',
  children,
  ...props
}: MxIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PowerGlyph(props: MxIconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 3V11" />
      <path d="M7.05 6.05A7.5 7.5 0 1 0 16.95 6.05" />
    </Glyph>
  );
}

export function ThermometerGlyph(props: MxIconProps) {
  return (
    <Glyph {...props}>
      <path d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z" />
      <path d="M12 11v6" />
      <path d="M17.5 6H19.5" />
      <path d="M17.5 9.5H19.5" />
    </Glyph>
  );
}

export function FanGlyph(props: MxIconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4C11.2 7.6 11.6 4.6 13.6 3.6C15.8 2.6 17.6 5 16.6 7.4C15.9 9 13.9 10.1 12 10.4Z" />
      <path d="M13.4 12.8C16.2 13.6 18.6 15.5 18.6 17.7C18.5 20.1 15.6 20.4 14.1 18.4C13.1 17 12.9 14.7 13.4 12.8Z" />
      <path d="M10.6 12.9C8.6 15 5.8 16.2 3.9 15.1C1.9 13.9 3.1 11.2 5.6 10.9C7.3 10.7 9.4 11.6 10.6 12.9Z" />
    </Glyph>
  );
}

export function BlindsGlyph(props: MxIconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 3.5H21" />
      <path d="M5 3.5V14.5H19V3.5" />
      <path d="M5 7.2H19" />
      <path d="M5 10.9H19" />
      <path d="M12 14.5V18.5" />
      <circle cx="12" cy="19.8" r="1.3" />
    </Glyph>
  );
}

/**
 * Plain «×» (REP-20261007-026): mx-icons only ships it inside a square or a circle. Two
 * diagonals on the same grid and stroke as the linear set.
 */
export function CloseGlyph(props: MxIconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.5 6.5l11 11" />
      <path d="M17.5 6.5l-11 11" />
    </Glyph>
  );
}
