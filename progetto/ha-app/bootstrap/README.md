# Bootstrap ACA e SonoffLAN su HAOS

Materiali generati per **ACA __ACA_VERSION__**, app Supervisor **__APP_VERSION__**, candidati **HAOS __HAOS_VERSION__ / Core __CORE_VERSION__**. La parola candidato non attesta compatibilità: il collaudo HAOS/Hyper-V del pilota resta da eseguire. Il bootstrap opera dopo l'installazione del sistema, dalla console host root autenticata, su VM o mini PC; non scrive dischi e non aggiorna OS/Core.

## Preparazione dei materiali

Il file sorgente è un template e rifiuta l'esecuzione diretta. `prepare.mjs` richiede ora `--haos-version`, `--core-version` e `--sonoff-archive`, oltre a versione/revisione ACA. `--check` conserva il controllo di sola provenienza dell'immagine. Per preparare solo il bootstrap, senza build o servizi:

```powershell
node progetto/ha-app/bootstrap/prepare-bootstrap.mjs --version 0.9.72 --app-version 0.9.72.99 --haos-version 18.4 --core-version 2026.9.4 --sonoff-archive <SonoffLAN-v3.13.3.zip> --output <directory-nuova>
```

Questi numeri sono una combinazione candidata ricostruita dalle evidenze, non una nuova release pubblicata. L'archivio originale SonoffLAN3.13.3 deve avere SHA-256 `f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532`. Nessun HACS necessario. La consegna contiene script, installer Python, ZIP upstream, `installation.json`, questa guida e `SHA256SUMS`; preservare tutti i file insieme. Le fonti del componente, incluse licenze, sono nello ZIP originale.

Prima dell'esecuzione controllare checksum e versioni dichiarate. Catalogo Supervisor e immagine GHCR devono offrire esattamente **__APP_VERSION__**; la pubblica .34 non installa automaticamente .72. Un pacchetto con catalogo diverso si ferma. Il checksum prova l'integrità rispetto alla consegna acquisita da fonte attendibile; non sostituisce la sua autenticità.

## Esecuzione sul target

1. Installare HAOS ufficiale vergine sulla destinazione scelta. Predisposizione Hyper-V e installazione fisica sono fasi distinte, descritte nel [piano pilota](../pilot/README.md).
2. Alla console `ha >`, usare `login` per entrare nell'host; oppure usare il solo canale temporaneo autenticato predisposto per questa installazione. L'IP da solo non abilita comandi. Non esporre una shell ai normali client ACA.
3. Trasferire la directory verificata sul target, con file LF. Sono richiesti `ha`, `jq`, `curl`, `sha1sum`, `docker`, `id`, `grep`, `sleep`, `dirname`; Python viene usato nel container Core `homeassistant` già attivo.
4. Eseguire prima la simulazione, poi il bootstrap sul target identificato:

```sh
sh bootstrap-haos.sh --ip 192.168.1.20 --version __ACA_VERSION__ --dry-run
sh bootstrap-haos.sh --ip 192.168.1.20 --version __ACA_VERSION__
```

L'IPv4 deve essere privato e appartenere alla centrale. La simulazione valida solo gli argomenti senza strumenti/rete; non dimostra che i servizi o i materiali siano disponibili. Non usare `curl | sh`.

## Comportamento

- Rifiuta host diversi da HAOS/root e versioni OS/Core differenti da quelle dichiarate, senza installare/aggiornare OS o Core.
- Aggiunge solo `https://github.com/acamemo/acasystem-releases`, rilegge il catalogo, verifica slug `9960cdb4_acasystem` e versione app **__APP_VERSION__**. Rifiuta un'ACA installata diversa; questa è prima installazione/ripetizione, non updater.
- Verifica lo ZIP SonoffLAN in Python prima delle modifiche; accetta solo i file originali del componente. Percorsi traversal, link e duplicati sono rifiutati. Installa tramite staging e rename nella sola `/config/custom_components/sonoff`; nessuna lettura/scrittura di `.storage`, credenziali, reti o profili. Un componente esistente identico resta invariato; uno differente impedisce di continuare.
- Se SonoffLAN è appena aggiunto riavvia Core per renderlo disponibile. Non crea config entry, non esegue login eWeLink e non associa dispositivi. Ripetendo lo script i file originali vengono confrontati ignorando soltanto `__pycache__`, senza un nuovo riavvio Core.
- Installa ACA solo se assente e la avvia solo se ferma. Verifica health **__ACA_VERSION__**, quindi URL/QR nel solo container ACA. L'app avviata deve includere il bundle coerente con il backend.
- Rimuove la sola directory temporanea generata nel container Core. Un errore conserva le fasi già riuscite: risolvere e ripetere, senza cancellare configurazioni. Se Core viene fermato durante il cleanup il residuo `/tmp/aca-bootstrap-*` può restare fino al riavvio.

Il QR contiene soltanto `http://IP:3002/`. Il destinatario apre ACA e crea il proprio account/casa; poi configura il proprio eWeLink in Trova, sceglie e conferma i widget. Pairing e consensi restano umani e locali. Nessun utente, token, log, dispositivo o dato del banco trasferito.

## Verifiche e limiti

`node --test progetto/ha-app/bootstrap/bootstrap.test.mjs` usa CLI/OS simulati. `python -m unittest discover -s progetto/ha-app/bootstrap -p "test_*.py"` verifica file/staging/negativi in directory temporanee. Nessuna delle due è un collaudo HAOS. La suite genera le versioni del proprio scenario; il template resta ineseguibile.

Fonti primarie ricontrollate **2026-11-13**: [SonoffLAN v3.13.3](https://github.com/AlexxIT/SonoffLAN/tree/v3.13.3), [CLI HA](https://github.com/home-assistant/cli), [host CONFIG](https://contributors.home-assistant.io/os/operating-system/configuration/), [console/SSH host](https://contributors.home-assistant.io/os/operating-system/debugging/). Quest'ultimo è documentato come accesso di sviluppo/debug: l'eventuale uso nel setup va limitato alla predisposizione e poi chiuso. Non è una capacità di assistenza remota permanente.
