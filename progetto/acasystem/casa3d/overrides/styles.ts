import { css } from "lit";

/** The host supplies ACA tokens through Shadow DOM; fallbacks preserve the standalone UI. */
export const tokens = css`
  :host {
    --fp3d-bg: var(--aca-page, #070b14);
    --fp3d-bg2: var(--aca-base, #0d1424);
    --fp3d-chrome: var(--aca-page, rgba(14, 21, 38, 0.86));
    --fp3d-chrome-solid: var(--aca-page, #0f1729);
    --fp3d-line: var(--aca-socket-well, rgba(120, 170, 255, 0.16));
    --fp3d-text: var(--aca-ink-solid, #e6eefc);
    --fp3d-muted: var(--aca-ink-muted, #8a9bb8);
    --fp3d-accent: var(--aca-accent, #37e0ff);
    --fp3d-accent-text: var(--aca-on-orange, #041018);
    --fp3d-soft: var(--aca-blue, #5b7cff);
    --fp3d-warm: var(--aca-orange, #ffb547);
    --fp3d-danger: var(--aca-danger, #ff6b8b);
    --fp3d-shadow: var(--aca-socket-shadow-card-flat, 0 8px 30px rgba(0, 0, 0, 0.5));
    --fp3d-font: var(--aca-font, "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
    --fp3d-title-font: var(--aca-font, "Bricolage Grotesque", "Figtree", system-ui, sans-serif);
    color-scheme: var(--aca-color-scheme, dark);
    font-family: var(--fp3d-font);
    color: var(--fp3d-text);
  }
`;

/** Segmented buttons, chips and form controls. */
export const controls = css`
  .fp3d-seg {
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    border-radius: var(--aca-radius-pill, 999px);
    background: var(--fp3d-chrome);
    box-shadow: var(--fp3d-shadow);
  }
  .fp3d-seg button,
  .fp3d-chip {
    font: inherit;
    font-weight: 500;
    border: none;
    background: none;
    color: var(--fp3d-muted);
    padding: 7px 13px;
    border-radius: var(--aca-radius-pill, 999px);
    cursor: pointer;
    white-space: nowrap;
    min-height: 34px;
  }
  .fp3d-seg button[aria-pressed="true"],
  .fp3d-chip[aria-pressed="true"] {
    background: var(--fp3d-accent);
    color: var(--fp3d-accent-text);
  }
  .fp3d-seg button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .fp3d-chip {
    background: var(--fp3d-chrome);
    color: var(--fp3d-text);
    box-shadow: var(--fp3d-shadow);
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--aca-focus, var(--fp3d-accent));
    outline-offset: 2px;
  }
  .fp3d-btn {
    font: inherit;
    font-weight: 600;
    border: 1px solid var(--fp3d-line);
    background: var(--aca-face, rgba(55, 224, 255, 0.06));
    color: var(--fp3d-text);
    border-radius: var(--aca-radius-rounded, 10px);
    padding: 7px 12px;
    cursor: pointer;
    min-height: 34px;
  }
  .fp3d-btn:hover {
    border-color: var(--fp3d-accent);
  }
  .fp3d-btn.fp3d-danger {
    color: var(--fp3d-danger);
  }
  .fp3d-btn.fp3d-primary {
    background: var(--fp3d-accent);
    color: var(--fp3d-accent-text);
    border-color: transparent;
  }
  .fp3d-field {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--fp3d-muted);
  }
  .fp3d-field input,
  .fp3d-field select {
    font: inherit;
    font-size: 14px;
    color: var(--fp3d-text);
    background: var(--aca-face-well, rgba(255, 255, 255, 0.04));
    border: 1px solid var(--fp3d-line);
    border-radius: var(--aca-radius-rounded, 8px);
    padding: 7px 9px;
    min-width: 0;
  }
  .fp3d-field input[type="range"] {
    padding: 0;
    accent-color: var(--fp3d-accent);
  }
  /* a colour picker shows its colour as a full swatch, not a line inside the text field's padding */
  .fp3d-field input[type="color"] {
    padding: 3px;
    height: 36px;
    width: 100%;
    cursor: pointer;
  }
  .fp3d-field select option,
  select option {
    /* the opened list keeps the dark look (else light text on the browser's white list) */
    background: var(--fp3d-chrome-solid);
    color: var(--fp3d-text);
  }
  /* fingers need 40 px */
  @media (pointer: coarse) {
    .fp3d-seg button,
    .fp3d-chip,
    .fp3d-btn {
      min-height: 40px;
    }
  }
`;
