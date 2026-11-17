# ACA Liquid Glass

Tema predefinito, derivato dalla reference UI-015 e applicato attraverso `design/index.css`.
Conserva font Inter, contratti `.aca-*`, MaterialLayers, layout e interazioni. Classico resta
disponibile da `themes/classic/index.css`, senza selettore utente o nuove preferenze.

| Ruolo | Materiale |
|---|---|
| Fondo | Forme statiche bianche/lavanda, nessuna immagine o animazione |
| Pannelli e tessere | Tinta satinata, bordo luminoso, ombra diffusa; nessun blur per tessera |
| Accesso, QR, popup principali | Un solo piano di vetro con blur 12 px dove supportato |
| Navigazione | Piano traslucido limitato alla barra; contenuti separati |
| Pulsanti, campi, switch | Riflessi e bordi CSS, senza filtro individuale; accento viola |
| QR e contenuti informativi | Mai filtrati; QR nero su bianco e quiet zone conservata |
| Casa 3D e ingranaggio | Nessun backdrop-filter; la scena e i controlli piatti restano indipendenti |

`tokens.css` definisce i valori del materiale; `material.css` li applica alle primitive nel
layer `components`. Le utility di layout continuano a prevalere. Non cambiare i file generati
delle distribuzioni: rigenerarli con i rispettivi comandi di build, che usano `copyDesignAssets`.

Il materiale liquid è un’approssimazione ottica CSS, senza rifrazione SVG o dipendenze. Non
animare blur/ombre, non aggiungere filtri a ogni widget e non sovrapporre piani sfocati. Il
movimento nuovo è limitato allo switch: transform/opacity, 160 ms, curva ACA esistente;
feedback di pressione immediato, nessuna attesa o blocco dell’input.

Senza supporto il materiale è opaco. Trasparenza ridotta, contrasto aumentato e forced-colors
tolgono i filtri; movimento ridotto elimina le nuove transizioni. Il supporto alla preferenza
di trasparenza dipende dal browser: non promettere rilevamento universale. La leggibilità non
si affida al blur; font, focus e colori funzionali mantengono i propri ruoli.

## Catalogo locale

Da questa cartella del design, eseguire un server statico locale, per esempio:

```powershell
python -m http.server 4183 --bind 127.0.0.1
```

Il comando va eseguito dalla cartella `progetto/acasystem/design`; aprire
[il kit](http://127.0.0.1:4183/themes/liquid-glass/kit.html). Il catalogo usa il tema reale e
markup MaterialLayers, mostra controlli/switch/campo/popup e attività illustrative, con dati
normali, lunghi o lista vuota. Non contatta HA, non modifica account o profili e non manda
comandi fisici. Non è una nuova schermata nel percorso del cliente.

Per vedere le schermate applicative reali con dati simulati, usare `#/mockup` sul server web
locale della build. La pagina Materiali della vecchia demo resta la galleria storica Kit 2;
questo catalogo è distinto. L’anteprima QR usa lo stesso ingresso del design e il suo builder.

## Evidenze e limiti

Risultati del lotto e limiti hardware in
[REP-20261104-008](../../../../../documentazione/reports/REP-20261104-008-tema-liquid-glass.md).
Il benchmark Lenovo M11 è da eseguire su hardware prima di dichiarare prestazioni del tablet.
Build locali e anteprime non aggiornano il banco PC, la centrale HAOS o la release pubblica.
