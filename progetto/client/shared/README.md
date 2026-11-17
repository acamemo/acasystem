# Risorse e strumenti comuni dei client

Questa cartella contiene sorgenti condivisi da Windows, Android e dalla preparazione HAOS.
Non contiene distribuzioni generate e non dipende da una piattaforma client.

| Percorso | Responsabilità |
|---|---|
| shell/shell.css, shell/icon.png | Composizione e icona dei launcher HTML; tema e font arrivano da acasystem/design |
| shell/copy-assets.mjs | Copia queste risorse e il design canonico nella destinazione del consumatore |
| shell/browser-reset.js | Pulizia nativa della sessione sul cambio centrale: conserva IndexedDB bozze, cancella accessi/cache e foto locali precedenti |
| packaging/webBundle.mjs | Assembla UI e Casa 3D, verifica ZIP e produce il manifesto client esistente |
| packaging/zipReader.ts, packaging/zipWriter.ts | Lettura/scrittura ZIP Node condivise; percorsi, duplicati, CRC e limiti del lettore restano invariati |

Windows conserva il proprio HTML in windows/shell/index.html e genera la pagina completa in
windows/generated-shell/ durante il build. Android conserva il proprio HTML in android/web/
e genera android/www/. Le copie generate non si modificano e non si versionano.

make-release.ts e ha-app/client-bundle.mjs usano lo stesso packaging; restano distinti i
consumatori che leggono l'immagine Docker e preparano le rispettive destinazioni. Le facciate
storiche scripts/zipWriter.ts e windows/src/zip.ts riesportano gli stessi moduli canonici.
Questi strumenti Node non sono parte del core portabile che gira nel browser.
