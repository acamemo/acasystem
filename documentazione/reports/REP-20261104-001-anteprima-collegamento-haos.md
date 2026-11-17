# Anteprima della schermata di collegamento HAOS

| Campo | Valore |
|---|---|
| ID | REP-20261104-001 |
| Stato | Anteprima completata e verificata, aperta per approvazione grafica; integrazione HAOS non eseguita |
| Data | 2026-11-04, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | Anteprima approvabile di card centrata verticalmente e orizzontalmente, QR e indirizzo/codice manuale come stringa, nessun pulsante, design ACA e layout ispirato all’immagine fornita. Android scanner o IP; desktop solo IP. |
| Autorizzazione | Creare una versione visiva della pagina per approvazione. Non integrare ancora l’avvio grafico HAOS, cambiare bootstrap o dist, aggiornare il banco o pubblicare. |

## Obiettivo e perimetro

Pagina HTML autonoma con materiale, tipografia e font del design condiviso esistente, riutilizzando qrcode-generator già presente. QR reale con il solo URL della centrale, niente credenziali/account. Preview usa http://192.168.1.11:3002/ come indirizzo dimostrativo corrispondente al banco noto; nessuna richiesta API automatica. Server locale dedicato loopback4178, indipendente dal banco3002. Conservare le492 voci Git preesistenti e i dati del sistema.

## Criteri di completamento

- Una card centrata, titolo breve, QR leggibile e indirizzo testuale selezionabile.
- Nessun pulsante/input/menu o testo esplicativo aggiuntivo.
- CSS/font/materiali derivati dalla fonte design ACA, senza duplicare i token.
- Anteprima apribile e immagine di controllo; prova responsive di centratura/overflow, QR e assenza di chiamate esterne.
- Reference originale conservata con hash e provenienza. Stato della proposta distinto da approvazione grafica e integrazione HAOS.

## Avanzamento

Reference acquisita senza modifiche come UI-014. SHA256 F53D394F9C1C86A6A2CDD757F7F60B0F471E14384F649208654DEEA5A537D20E; layout fonte: immagine fornita in chat, autore/licenza non noti, non adottati grafica di sfondo e pulsanti. Design canonico progetto/acasystem/design, Surface a strati e tema Kit2; nessun logo ACA approvato, quindi titolo testuale. Font Inter locale.

## Verifiche e punto di ripresa

Anteprima pronta su http://127.0.0.1:4178/, aperta nel browser integrato e marcata per mantenerla aperta. Approvazione grafica dell’utente ancora da ricevere; nessuna integrazione avvioHAOS eseguita.

## Realizzazione e verifiche conclusive

Fonti autonome progetto/ha-app/connection-screen: index.html, screen.css di composizione, build-preview.mjs, serve-preview.mjs e README. Strati Surface, tema Kit2 e Inter canonici, nessun token/materiale/font condiviso modificato. Titolo «Collegati ad ACA», QR nero su bianco con quiet zone, etichetta «Indirizzo IP» e URL in un paragrafo selezionabile. Nessun logo inventato, form, link operativo, menu o pulsante. QR e testo contengono http://192.168.1.11:3002/; nessuna richiesta automatica alla centrale.

Build con qrcode-generator già installato e copyDesignAssets esistente. Output escluso da Git in progetto/ha-app/out/connection-screen-preview:42asset condivisi (20CSS,21WOFF2,licenza). Server4178 solo loopback, limitato ai file dell’output e lasciato attivo per revisione. Apribile anche il file index.html generato con gli asset accanto.

~~~powershell
node progetto/ha-app/connection-screen/build-preview.mjs
node progetto/ha-app/connection-screen/serve-preview.mjs
~~~

QA batched1920×1080,1366×768,390×844: **3/3PASS**, centratura errore massimo0,008px, nessun overflow o input/pulsante. Indirizzo completo selezionabile, zero erroriJS/HTTP/rete esterna. SVG uguale alla matrice della libreria per l’URL atteso,25moduli/quietzone4; non dichiarata decodifica da fotocamera fisica. Tutti i41hash CSS/font e la licenza coincidono con la fonte canonica; realmente caricati15CSS condivisi e Inter latin400. Screenshot e JSON/handoff in backup/rep028. Il coordinatore ha ispezionato anche desktop/telefono: nessun giro ulteriore necessario.

Sintassi Node dei due script superata. Detector eseguito una volta sui sorgenti: nessun rilievo, con limite dichiarato sul CSS generato design-aca non presente accanto al template; QA/render verificano la copia generata realmente caricata. Nessuna suite applicativa ripetuta per questa preview reversibile e isolata.

ReferenceUI-014 conservata byte per byte,371451byte/SHA nel catalogo e integrita.json; originali precedenti invariati. Nessuna nuova dipendenza, aggiornamento banco, modifica bootstrap/dist, commit o pubblicazione.

Consegna: pagina aperta nel browser integrato, link loopback e screenshot small-desktop in chat. Grafica in approvazione, nessuna integrazione avvioOS ancora assegnata da questa anteprima. AndroidQR/IP e desktopIP registrati come direzione confermata; attendere feedback senza avviare automaticamente altre attività.

## Iterazione2, 2026-11-04 — testi e divisore richiesti

L’utente precisa che la pagina deve riportare «Scan QR Code», «Scan this QR Code in app to verify device» e «Or enter the code manually» con le linee, con layout/scritte uguali alla reference. Nuovo dettaglio allegato conservato comeUI-014b, senza modificareUI-014.

Modifica limitata a templateHTML e CSS di composizione: titolo «Scan QR Code», sottotitolo «Scan this QR Code in-app to verify device.» (punteggiatura della reference), divisore «Or enter the code manually» con linee ai lati. Lingua della pagina en e alt coerente. Eccezione ai testi italiani autorizzata dalla richiesta umana esplicita. QR/indirizzo, font/materiali ACA e assenza di pulsanti/input preservati. La scritta della reference non introduce un nuovo protocollo di verifica/associazione: il QR continua a contenere soltanto l’URL della centrale.

Build rigenerata e QA batched1366×768/390×844 **2/2PASS**. Testi esatti, linee1px sui due lati, card centrata entro0,008px, zerooverflow/controlli/erroriJS/HTTP o richieste esterne, indirizzo selezionabile. QR SHA256 invariato feec046a3798ee73c4e2bfc9e0d086e877f09b0247efa23d7816fd25ff7bceed,25moduli e quietzone4. Screenshot iteration2-desktop.png/iteration2-phone.png e handoff/JSON in backup/rep028; coordinatore ha ispezionato entrambi, nessun altro giro necessario. Il primo tentativo del solo harness cercava .connection-divider invece di .connection-label: corretto il selettore, nessuna modifica UI per quel fallimento.

Il browser integrato non ha accettato il reload automatico (browser.user unavailable) neppure recuperando la scheda nota; nessun ulteriore tentativo o azione su altre finestre. Server e pagina generata verificati dalla QA, link4178 invariato; chiedere soltanto di ricaricare l’anteprima già aperta. Questa non è un’approvazione grafica ricevuta né un’integrazione HAOS. Nessuna modifica dist/banco.

## Annotazione 2026-11-04 — tema condiviso e indirizzo corrente

Nel successivo [REP-20261104-002](REP-20261104-002-palette-fissa-tema-classico.md) il design condiviso prende il nome ACA Classico, conservando il grafo CSS precedente. L’anteprima è stata rigenerata con questo ingresso e `--origin http://192.168.1.19:3002/`, indirizzo attuale del banco. Testi e composizione dell’iterazione 2 restano quelli richiesti; l’indirizzo `.11` riportato sopra è storico. L’approvazione grafica e l’integrazione nell’avvio HAOS restano distinte e non risultano eseguite.
