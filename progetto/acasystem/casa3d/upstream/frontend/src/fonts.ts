// Registers the self-hosted UI fonts once. @font-face does not work inside shadow roots, so the rules
// go into the document head; the families are only used by our own components.

const base = new URL(import.meta.url);
const version = base.searchParams.get("v");
const font = (file: string) => new URL(`./fonts/${file}${version ? `?v=${version}` : ""}`, base).href;

const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

export function registerFonts(): void {
  if (typeof document === "undefined" || document.getElementById("fp3d-fonts")) return;
  const style = document.createElement("style");
  style.id = "fp3d-fonts";
  style.textContent = `
@font-face{font-family:"Figtree";font-style:normal;font-display:swap;font-weight:300 900;src:url(${font("figtree.woff2")}) format("woff2");unicode-range:${LATIN}}
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-display:swap;font-weight:200 800;src:url(${font("bricolage-grotesque.woff2")}) format("woff2");unicode-range:${LATIN}}`;
  document.head.append(style);
}
