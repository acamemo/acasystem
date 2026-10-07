# REP-20261007-004 — Pagina «UI kit» con i prototipi Principale e Temperatura

| Campo | Valore |
|---|---|
| Stato | Completato; banco su `aca-system:0.5` |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: valutazione di un kit neumorphism (ZIP) e di un concept «Home» / «Temperature»; poi «fai il prototipo, facciamo una pagina dedicata su localhost che se io nella barra di ricerca scrivo http://localhost:3002/ui-kit vedo tutti i prototipi in preview». |
| Autorizzazione | Pagina di anteprima con prototipi statici. Esclusi: codice o asset dello ZIP (senza licenza, dipendenze esterne), modifica della Principale reale, nuove dipendenze, commit. |

## Valutazione registrata

Lo ZIP `neumorphism-ui-kit-theme` (5 file: demo HTML, tre temi CSS, script) non ha licenza né autore, carica Font Awesome, Ionicons e font da CDN, usa reset globali e JS imperativo: non riusato. Il concept condiviso è usato solo come ispirazione per layout e forme; la palette azzurra non è adottata (ADR-0006/0007).

## Modifiche

- `frontend/src/pages/ui-kit/`: `UiKitPage.tsx`, `uiKit.css`, `KitGallery.tsx`.
  - Scheda «Prototipi»: Principale (riquadri quadrati con icona e nome, cella «+», temperatura con slider, navigazione a quattro tasti) e Temperatura (valore grande, esterno, accensione tonda, alza/abbassa, Timer/Turbo, termometro verticale); sezione «Componenti nuovi» (termometro, accensione tonda, barra di sola lettura, cella libera). Dati di esempio, nessun comando a Home Assistant.
  - Scheda «Kit Metallo»: la galleria di sviluppo esistente (`pages/kit/KitPage`) caricata su richiesta con i suoi stili.
- `routes/AppRoutes.tsx`: rotta `#/ui-kit` caricata a richiesta, mostrata anche senza connessione.
- `main.tsx`: `/ui-kit` senza hash porta a `/#/ui-kit` (il backend serve già `index.html` per i percorsi senza estensione).
- `progetto/compose.tunet.yaml`: immagine `aca-system:0.5`, che include anche il terzo passo di REP-20261007-003.

## Verifiche

typecheck, lint, lint dei colori, vitest 1327/1327, build verdi. Banco ricostruito: `sha256:5d0d9276fd986346e7a90321e036bc73be79c64fe342e5f499d6b85899655d67`, healthy; `GET /ui-kit` 200. Browser integrato: `http://localhost:3002/ui-kit` apre `#/ui-kit`, entrambe le schede si caricano dopo un ricaricamento, nessuno scorrimento orizzontale a 375 px. Nessun test automatico dedicato alla pagina.

## Estensione: tutte le anteprime

Richiesta del 2026-10-07 («ancora non vedo le modifiche malgrado abbia visto kit, io voglio vedere tutti i componenti ui», con schermata di `localhost:3002/kit` che mostrava la Principale):
- `/kit` e `/ui` senza hash portano a `#/ui-kit`, come `/ui-kit`.
- Nuove schede, caricate a richiesta con i propri stili e dati simulati: Controlli, Comfort, Media, Utilità, oltre a Prototipi e Kit Metallo. `#/ui-kit?tab=controls` (o `kit`, `comfort`, `media`, `utilities`) apre direttamente una scheda.
- `widgets/controls/preview/ControlsPreview.tsx`: il componente dell'anteprima dei controlli è spostato fuori da `main.tsx` (che ora lo importa) senza cambiarne il comportamento; `HomeGallery.tsx` e `MediaGallery.tsx` caricano le anteprime comfort e media con il loro CSS.
- Esclusa l'anteprima Sistema: scrive la configurazione del launcher in localStorage, che sul banco è quella reale.

Verifiche: typecheck, lint, lint dei colori, vitest 1327/1327, build verdi. Banco `sha256:ba36d7f85d7413181dc86cd555f55b6db68d1f03f1827d1fbf2576d4d0a050bb`, healthy. Browser integrato: `localhost:3002/kit` apre `#/ui-kit`; tutte e sei le schede si caricano (i testi «Caricamento…» visibili sono stati di caricamento voluti delle anteprime). In console restano errori «An unknown error occurred when fetching the script», presenti anche prima di questa estensione e non indagati (probabile registrazione del service worker).

## Prova: rilievo più leggero e stato acceso con linea

Richiesta del 2026-10-07: bianco e ombra troppo pesanti, «prova con un 25% di alpha sul colore delle ombre»; per lo stato arancione preferita «una linea intorno al componente evidenziato».
- Solo nella scheda Prototipi (`.uik-screens`, `.uik-parts`): i due strati soft UI del socket, ombra scura e luce bianca, portati entrambi al 25% di alpha (prima 16% o 10% sulla card, e 80%). Linea di contatto e filo del kit invariati. Il kit e il resto dell'app non cambiano.
- Riquadri e accensione accesi: linea arancione di 2 px attorno all'elemento, che resta in rilievo con la faccia a riposo; inchiostro arancione per nome e icona. Rimossi LED interno e pressione morbida.
- Interpretazione da confermare: «25% di alpha» applicato come valore uguale per scuro e chiaro; l'ombra scura grande passa quindi da 16% a 25%.

Banco `sha256:acd1a9d7f15628bc6355459e698dcc9b5cae95c342b6780c9a248f0a0b2b1403`, healthy; build e lint dei colori verdi; controllo visivo nel browser integrato.

Seconda prova dello stesso giorno («ridurrei a 10% alpha, poi la regola del bordino arancione anche sull'azzurro»): i due strati soft UI scendono al 10% di alpha; il tasto della pagina corrente nella navigazione usa la stessa regola, linea blu di 2 px con faccia a riposo e inchiostro blu. Banco `sha256:7b886bab7863b049b6a63dac2355ea8f3d0c0d79c7355ce2207272c1c049c821`, healthy; controllo visivo nel browser integrato.

Correzione dello stesso giorno («la linea non ha sempre la stessa grandezza, e nel caso col blu addirittura va sotto il pulsante»). Cause misurate nel browser: la linea era un `box-shadow` del socket, quindi dipinta sotto guscio e faccia e sommata all'ombra di contatto in basso a destra; nei tasti di navigazione la faccia del kit `rounded` è larga 3,75em (60 px) dentro una cella di 55 px e copriva la linea a destra. Correzione: linea come `outline` di 2 px con 1 px di distacco, dipinta sopra l'elemento e uguale su ogni lato; faccia dei tasti di navigazione al 100% della cella (55 px su 55 px). Con il focus da tastiera l'anello di focus del kit sostituisce la linea. Banco `sha256:d00eeb97525f69b13c1ae82f8a04a94df4097a9f4db938473f123d2a30903930`, healthy; controllo visivo nel browser integrato.

Ritocco dello stesso giorno («rendi l'arancione e il blu più brillanti»): la linea usa varianti più chiare e sature degli accenti del kit, calcolate in CSS (`--uik-orange-bright` oklch 0,742 0,232 38,4; `--uik-blue-bright` oklch 0,630 0,268 265,3), con un alone dello stesso colore (45% e 40%). Inchiostri di nome e icona invariati per mantenere il contrasto; accenti del kit invariati. Banco `sha256:10a520b40dce5846a2922d300e7f9857acef803fcfed33d4fe2a5daa0dc42d5f`, healthy; valori verificati nel browser integrato.

Pressione del «+» (2026-10-07, «l'effetto di abbassamento del pulsante risulta troppo pesante»): la cella «+» è il pozzetto tenue del kit (`aca-m--well-soft`), lo stesso delle celle libere della Principale reale. Al clic passava a ombre interne al 55%/38%/36%. Ora `--aca-well-soft-press` in `material.css` è la profondità dell'hover appena più marcata (36%/18%/20%) e la pressione è portata dalla scala; vale per il kit, quindi anche per le celle della Principale reale. `design.md` aggiornato. Vitest 1327/1327, lint, lint dei colori e build verdi; banco `sha256:cbe84b3630822c079771524d14f3213fafea9d5655e3a8465b2f9bc339ee23f8`, healthy; stato premuto controllato nel browser integrato con la classe di anteprima `.is-active`.

Rettifica dello stesso giorno («non mi sembra cambiato molto, anzi sembra uguale»): la riduzione delle sole ombre non bastava, perché il peso visivo veniva soprattutto dal riempimento: a hover, focus e clic la faccia trasparente si riempiva di `--aca-face-well`. Ora resta trasparente (`background-image: none`) in tutti gli stati; ombre interne hover 24%/8%/9%, clic 28%/10%/11% (riposo 18%/4%/5%). Valori letti nel browser integrato con le classi di anteprima. Vitest 1327/1327, lint, lint dei colori, build verdi; banco `sha256:d9123ea64b4b2e0376b05bcf19f2876307316227178947bffdb5347729d75844`, healthy.

Adozione nel kit (2026-10-07, «ora va bene, porta le ombre al 10% nel kit»): in `tokens.css` la coppia soft UI di `--aca-socket-shadow`, `-flat`, `-card` e `-card-flat` passa al 10% di alpha per luce e ombra (card: ombra al 6%, per mantenere il rapporto 0,6 tra card e controlli verificato dai test). Rimossa la sovrascrittura locale da `uiKit.css`. Vale per tutta l'app. Vitest 1327/1327, lint, lint dei colori, build verdi; banco `sha256:2a389b61c73e731b735e9683e27f91eb895ce654d4f305425cd7335c026e8d5a`, healthy. `design.md` aggiornato.

Correzione dello stesso giorno («i pulsanti su "Principale" funzionano […] quelli su Temperatura invece no»). Misura nel browser integrato al 125%: i riquadri della Principale stanno su pixel fisici interi (x 73,6 e larghezza 120 CSS, cioè 92 e 150 px fisici); quelli di Temperatura no (x 482,712 e larghezza 72,888 CSS, cioè 603,39 e 91,11 px fisici). Causa: il contenuto delle superfici del kit è centrato (`justify-content: center`), e la griglia di `.uik-phone__content`, senza colonne esplicite, si stringeva al contenuto (237,775 px su 256) e veniva centrata, con tutti i figli a metà pixel. Correzione in `uiKit.css`: colonna unica `minmax(0, 1fr)` a tutta larghezza; riquadri Timer e Turbo fissi a 5rem (80 px, pixel interi a 100%, 125%, 150% e 200%). Misura dopo la correzione: Temperatura ha lo stesso scostamento della Principale (x …,59 dovuto al margine di pagina in `vw`, comune a entrambe), riquadri 80×80, navigazione 55×55. Restano misure frazionarie nel kit dove le dimensioni sono in em: accensione 70,4 px e pulsanti ± 38,5 px. Banco `sha256:a76d5658865e619282c9b2f6d947822fe8e7828e9331b80f3225c730cdb604f4`, healthy.

Proposta non applicata: la griglia reale del launcher arrotonda la cella al pixel CSS intero (`Math.floor` in `deviceClass.ts`), ma al 125% un pixel CSS intero può cadere a metà di un pixel fisico. Si potrebbe arrotondare a multipli di `1 / devicePixelRatio` o di 4 px.

## Questioni residue

- Lo stato «acceso» dei riquadri usa la selezione del kit (inchiostro e LED blu), non l'arancione del concept: da decidere se il kit debba distinguere «acceso» da «selezionato».
  - Aggiornamento 2026-10-07, su richiesta («usa l'arancione per lo stato acceso nei riquadri»): nei riquadri del prototipo «acceso» usa LED arancione, nome in `--aca-orange-ink` e icona in `--aca-orange-ink-icon` (regole in `uiKit.css`, kit invariato). Banco ricostruito, `aca-system:0.5` `sha256:c1b428497ed2c494b497f288b8d3dad8a63b72dde68dcdc8e62add6786bd83b1`; controllo visivo nel browser integrato. Navigazione blu.
  - Aggiornamento successivo dello stesso giorno («metti arancione anche il tasto di accensione»): stessa resa arancione per il tasto di accensione tondo. Banco `sha256:1dc77c2170693c2131610931ed143826a71bc8436d0b405e6c80624076ca5049`, controllo visivo nel browser integrato.
- La galleria del kit è ora inclusa nel build di produzione come chunk separato.
- Nessuna decisione sul redesign: la pagina serve a valutarlo.

## Punto di ripresa

Raccogliere il parere dell'utente o del committente sui prototipi; un'eventuale adozione sulla Principale reale richiede un nuovo incarico.
