# REP-20261007-038 — Sfondo e colore dallo sfondo (F9)

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato; da provare sul tablet |
| Data | 2026-10-08, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Piano «Personalizzazione come Android» approvato in chat il 2026-10-07, fase F9. Extra scelto dall'utente: «Sfondo e colore». |
| Fonte | Material You: colore seme preso dallo sfondo ([source.android.com, Material](https://source.android.com/docs/core/display/material)); Sfondo e stile di Pixel ([support.google.com 7289143](https://support.google.com/pixelphone/answer/7289143)); consultate il 2026-10-07. |

## Modifiche

- **Sistema → Aspetto → Sfondo:**
  - Nessuno, Alba, Mare, Bosco, Tramonto o Notte: sfumature in OKLCH in `themes/kit2/wallpapers.css`;
  - oppure «Una foto…», scelta dal dispositivo e salvata in IndexedDB su quel dispositivo, senza sincronizzazione.
- **Applicazione:**
  - lo sfondo sta dietro le pagine (`body` e `.aca-shell` trasparente); barre, widget e pannelli mantengono il loro fondo, e il testo il suo contrasto;
  - nel tema scuro lo sfondo è attenuato.
- **Accento «Dallo sfondo»:**
  - per gli sfondi predefiniti usa la loro tinta;
  - per la foto, la tinta dominante misurata su una copia 32×32: settori di 15° pesati per croma OKLCH (`dominantHue`, `oklchHue`);
  - si applica come `--k2-accent-hue` con `data-accent="custom"`;
  - è disattivato senza sfondo; togliendo lo sfondo l'accento torna viola.
- **Dove si salva:** tutto in `aca_appearance`, per dispositivo, come tema e accento.
- **Test di Sistema:** vietava la parola «sfondo», preferenza del vecchio pannello tolta con ADR-0007. Ora lo sfondo torna su richiesta esplicita dell'utente; il test lo dice e continua a escludere le altre preferenze vecchie.

## Verifiche

- **`Appearance.test.tsx`:**
  - attributi e tinta su `<html>`;
  - ritorno al viola senza sfondo;
  - tinta dominante di pixel blu, arancio e grigio, e nessuna tinta per un'immagine grigia.
- **`SystemPage`:** gruppo «Sfondo» presente.
- **Suite e build:** 1403/1403 e lint dei colori verdi.

## Limiti

- **Non visto a video:** l'anteprima di sviluppo del launcher non carica il tema dell'app e Sistema richiede l'accesso a Home Assistant.
- **Foto:** il caricamento va provato sul tablet; IndexedDB può mancare in navigazione privata (compare un messaggio).
