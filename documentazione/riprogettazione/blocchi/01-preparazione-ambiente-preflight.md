# Blocco 1 Preparazione dell'ambiente Linux isolato per P0-P4

Data e consultazione fonti: 2026-10-29. Richiesta: [U14](../diario/2026-10-29.md#u14-preparazione-linux-isolata-e-materiali). Evidenze: [REP-20261029-016](../../reports/REP-20261029-016-preparazione-linux-preflight.md). Fonti interne: [procedura P0-P4 U13](01-preflight-generazione-c-cryptography.md), [host U11](01-host-linux-build-riproducibile.md), [distinta immutata](../materiali/u11-build-m11-materiali.json).

## Decisione esecutiva della definizione

Si propone di usare **Docker Desktop con backend WSL 2 e container Linux amd64**, conservando la base Debian per digest U11. Dal materiale verificato si preparerà una **immagine locale dedicata al preflight** con Python, venv, sorgenti e futuro runner; la sua esecuzione avrà rete disabilitata, root filesystem in sola lettura e output separati.

**Oggi è definita la preparazione, non realizzata.** Nessun pull, archivio/wheel acquisito, installazione, ambiente creato o preflight eseguito. Non sono stati scritti Dockerfile, requirements operativi o runner; i comandi sotto sono esempi per un futuro incarico. Pin HA, distinta e lock U11 restano invariati.

La sola ricognizione locale in lettura rileva Windows **X64**, il comando Docker disponibile con client **29.8.2, build 7fc2dff**, metadata dell'eseguibile Docker Desktop **4.94.0.241994** e presenza di `wsl.exe`. Non sono stati contattati Engine/daemon, avviati Docker Desktop o WSL, né letti stato/versione di WSL o configurazione del backend. Questi dati non dimostrano che il motore Linux sia pronto.

```mermaid
flowchart LR
  A[Acquisizione futura online] --> B[Materiali verificati]
  B --> C[Preparazione locale dal deposito]
  C --> D[Immagine preflight fissata per identità]
  D --> E[P0-P4 senza rete]
  E --> F[Output ed evidenze separati]
```

## S0 Verifica futura del runtime Linux

Prima della preparazione autorizzata, verificare contesto Docker previsto, connessione all'Engine, modalità Linux/amd64, backend WSL 2, risorse e requisiti Windows effettivi. Registrare versioni client/server/Desktop, WSL e kernel. Non avviare aggiornamenti o installazioni implicite se manca un requisito.

Docker documenta WSL almeno **2.1.5** e un Windows supportato; per usare Docker Desktop da Windows non serve una distribuzione Ubuntu utente aggiuntiva. [Requisiti Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [backend WSL 2](https://docs.docker.com/desktop/features/wsl/). La presenza locale dei comandi non sostituisce queste verifiche.

Il container isola processi/filesystem/rete ma condivide il kernel Linux del backend WSL 2: Debian identifica lo spazio utente, non un kernel Debian dedicato o una VM autonoma per ogni prova. Si conserva il runtime esistente dopo averlo inventariato, senza aggiornarlo automaticamente.

## S1 Acquisizione selettiva e verifica dei materiali

Acquisizione e successiva preparazione devono essere attività distinte e registrate. Il profilo seleziona dal JSON U11 **soltanto**:

| Materiale | Identità e uso |
|---|---|
| Base Debian linux/amd64 | `docker.io/library/debian@sha256:1e1a22175fbf1b32157ddaf0219e1db4e5401fab2b94ed285add64d18587cd2d`. Il digest è quello del manifest amd64. |
| Python PBS host | `cpython-3.14.10+20261026-x86_64-unknown-linux-gnu-install_only.tar.gz`, SHA256 `1b38024924eb7f4cf0cab45d7b871d1f1991354190fccd2625ac7529a43786e2`. |
| Le **20 wheel host U11** | Nome, versione, URL e SHA256 di ciascun record `python_wheels`. Un solo artefatto ammesso per pin. Mantengono il profilo congelato, anche se non tutti servono al cammino minimo del generatore. |
| Sdist cryptography | `cryptography-50.0.1.tar.gz`, SHA256 `5dd9bda1c12b4162f6ff568eeb5e0ff956c28d14406e875cfe8a63a2d414ff20`. Si estrae il sorgente, senza installare il pacchetto cryptography. |
| Specifiche documentali | Copie della distinta U11 e della procedura U13 effettivamente usate, con hash della revisione locale. |

Questo profilo non acquisisce Python Android, Rust/std, NDK/SDK, OpenSSL/libffi target, sorgenti orjson o Cargo vendor/cache. Neppure il PYZ virtualenv è necessario: il venv dedicato sarà creato dalla libreria standard del PBS. Questi materiali restano fissati nella distinta delle future build, che non viene ridotta o riscritta.

L'acquisizione futura usa URL/filename esatti, riceve prima in un deposito separato e verifica l'intero file contro l'hash già fissato, prima di estrazione o esecuzione. Nessun `latest`, sdist sostitutivo, aggiornamento o fallback a Git/main. Registrare URL, algoritmo, hash atteso/osservato, byte e data; un nome corretto non è prova di integrità.

Per OCI il runtime verifica i blob per digest; conservare piattaforma e manifest di provenienza. Il [manifest Debian ufficiale](https://github.com/debuerreotype/docker-debian-artifacts/blob/69faaf492e77aff83e4c7fc401017c9d25ecde24/trixie/slim/oci/index.json) non è l'hash di un export tar o della futura immagine derivata. Nessuna layer o immagine è stata acquisita qui.

## S2 Preparazione locale e percorsi stabili

Usare un contesto dedicato con soli archivi verificati e specifiche, separato dal repository ACA. Sorgenti, runtime e venv si estraggono/creano **nel filesystem Linux dell'immagine**, conservando symlink e permessi; il venv non va creato su NTFS e poi trasferito. I [venv Python](https://docs.python.org/3.14/library/venv.html) non sono considerati ambienti spostabili.

| Percorso futuro nell'immagine | Contenuto e stato durante P0-P4 |
|---|---|
| `/opt/aca/python-host` | Distribuzione PBS completa; sola lettura. |
| `/opt/aca/host-venv` | Venv dedicato con le 20 wheel; sola lettura. |
| `/opt/aca/wheelhouse` | Le wheel originali verificate, conservate per provenienza; sola lettura. |
| `/opt/aca/sources/cryptography-50.0.1` | Intero albero dello sdist verificato; sola lettura. |
| `/opt/aca/materials/lock` | Distinta, requirements derivato e hash; sola lettura. |
| `/opt/aca/preflight` | Futuro runner e sua specifica/revisione, da implementare in un incarico successivo; sola lettura. |
| `/opt/aca/preflight-output` | Volume Linux persistente dedicato, scrivibile dall'utente 1000. |
| `/opt/aca/tmp` | Temporanei in tmpfs, separati dagli ingressi; HOME temporaneo sotto questa radice. |

Prima delle estrazioni verificare membri, radice, link, collisioni e dimensioni attese, preservando il layout originale. Il PBS necessita dell'estrattore già presente nella base Debian fissata, per esempio GNU tar: non può essere estratto usando un Python non ancora predisposto. Per lo sdist cryptography, dopo il PBS, usare esplicitamente il filtro `data` di [tarfile 3.14.10](https://github.com/python/cpython/blob/v3.14.10/Doc/library/tarfile.rst), insieme ai controlli di confinamento e dimensioni; nessuna esecuzione di setup.py o backend durante l'estrazione.

Conservare l'intero albero cryptography: `build_openssl.py` ricava i percorsi da `__file__`, importa utils/moduli adiacenti e legge `src/cryptography/__about__.py`. Copiare soltanto quel file nel runner cambierebbe gli ingressi. Il cwd P3 rimane `src/rust/cryptography-cffi` dell'albero verificato.

La preparazione da deposito locale dovrà avvenire senza accesso di rete dei processi di installazione, con base già disponibile e materiali verificati. Un'opzione di rete del builder non va descritta come blocco di ogni eventuale accesso del daemon a registry/frontend: distinguere acquisizione OCI, preparazione e rete del processo. Durante P0-P4 non sarà consentito alcun pull implicito.

Per il solo preflight non si pianifica l'installazione degli strumenti APT di compilazione U11. La chiusura delle librerie native di PBS/wheel host non è stata ispezionata: se il runtime o un SONAME necessario mancano, fermarsi e documentare la lacuna. Nessun fallback APT verso repository correnti o cambiamento ai pin HA. Il successo dell'installer non equivale al futuro import del backend CFFI in P1.

## S3 Bootstrap Python e installazione futura dal wheelhouse

Derivare `requirements-host-u11.txt` **dai 20 record JSON**, senza una seconda selezione manuale: venti nomi canonici univoci, venti righe `name==version --hash=sha256:<digest>`, nessun extra, URL remoto o intervallo. Registrare hash del JSON e del requirements generato. Questo file non è stato creato ora.

La preparazione userà un venv nuovo **senza pip**, senza system-site-packages o upgrade automatici. Il percorso deve essere assente; non riusare una directory precedente o applicare `--clear`. Esempio futuro, con PBS già verificato:

```sh
"$ACA_PBS_PYTHON" -s -B -m venv \
  --symlinks --without-pip --without-scm-ignore-files /opt/aca/host-venv
```

Il runtime PBS rimane al percorso fisso cui puntano i symlink. Il [venv v3.14.10](https://github.com/python/cpython/blob/v3.14.10/Lib/venv/__init__.py) e [pip 26.2.2](https://github.com/pypa/pip/blob/26.2.2/src/pip/__main__.py) consentono di eseguire il pip verificato direttamente dalla wheel e installare il lock in una sola operazione futura:

```sh
PIP_CONFIG_FILE=/dev/null PYTHONDONTWRITEBYTECODE=1 \
/opt/aca/host-venv/bin/python -s -B \
  /opt/aca/wheelhouse/pip-26.2.2-py3-none-any.whl/pip \
  --isolated --require-virtualenv --disable-pip-version-check \
  install --no-index --find-links=/opt/aca/wheelhouse \
  --require-hashes --only-binary=:all: --no-compile --no-cache-dir \
  --report="$ACA_PREP_EVIDENCE/install-report.json" \
  -r /opt/aca/materials/lock/requirements-host-u11.txt
```

L'esempio è una specifica, non un comando eseguito. Ambiente Python/cross ereditato da ripulire come U13; `ACA_PREP_EVIDENCE` è la directory separata di evidenze della preparazione. `--isolated` riguarda la configurazione pip, non sostituisce un container senza rete. Il [contratto pip](https://pip.pypa.io/en/stable/topics/secure-installs/) richiede hash e pin di tutte le dipendenze; non aggiungere `--no-deps`, che salterebbe il controllo della chiusura. Le wheel native Linux restano binari precostruiti: non viene compilato un backend.

Questa strada evita di affidarsi al pip base o a un bootstrap ensurepip implicito. `--no-compile` impedisce la compilazione esplicita dei `.pyc` durante l'installazione; `-B` impedisce la loro scrittura da import, senza impedirne la lettura. Non richiedere che il PBS originale sia già privo di `.pyc`: registrare i file acquisiti e verificare che non ne vengano creati di nuovi. Nessuna rimozione o riscrittura dei materiali originali per uniformarli.

Al termine della futura installazione raccogliere report, metadata/pip check, inventari e corrispondenza con le wheel/RECORD, mantenendo la verifica P1 degli import come prova distinta. Tutti i 20 pacchetti rimangono nel profilo; la loro presenza non autorizza maturin/cibuildwheel/auditwheel o altri strumenti di build durante il preflight.

## S4 Congelamento e profilo di esecuzione

La futura ricetta di preparazione dovrà essere versionata e registrata insieme ai materiali; runtime, venv, sorgenti, wheelhouse e runner entreranno nella nuova immagine locale. **L'identità della derivata non è ancora disponibile:** registrare Image ID locale e, se prodotto, digest del manifest OCI. Non riutilizzare il digest Debian come identità della derivata e non pubblicare l'immagine per questo incarico.

Il runner non esiste ancora: dovrà implementare soltanto P0-P4 U13, emettere la scheda/evidenze e invocare due processi del generatore originale. Prima del congelamento andranno revisionati sorgente, revisione e hash del runner, senza introdurre installazioni o compilatori nel suo percorso.

Durante la preparazione si crea un volume Linux **nuovo e dedicato**, identificato per la singola prova, con proprietario 1000:1000 e directory output inizialmente vuote. Nessun riuso di volumi del prodotto. I permessi si predispongono prima: P0-P4 non avviano riparazioni privilegiate o `chown` per aggirare un errore.

Esempio del **futuro profilo**, con Image ID/volume realmente creati e verificati. Non è un lancio pronto oggi:

```sh
docker run --name aca-preflight-u14-run001 \
  --platform=linux/amd64 --pull=never --network=none \
  --user=1000:1000 --read-only \
  --cap-drop=ALL --security-opt=no-new-privileges=true \
  --cpus=2 --memory=2g --pids-limit=128 \
  --mount "type=volume,source=$ACA_OUTPUT_VOLUME,target=/opt/aca/preflight-output,volume-nocopy" \
  --tmpfs /opt/aca/tmp:rw,nosuid,nodev,noexec,size=268435456,uid=1000,gid=1000,mode=0700 \
  --env TMPDIR=/opt/aca/tmp --env HOME=/opt/aca/tmp/home \
  --env PYTHONDONTWRITEBYTECODE=1 --env PYTHONOPTIMIZE=0 \
  --env PYTHONHASHSEED=0 --env LC_ALL=C.UTF-8 --env TZ=UTC \
  --env SOURCE_DATE_EPOCH=1793232000 \
  --entrypoint /opt/aca/host-venv/bin/python \
  "$ACA_PREFLIGHT_IMAGE_ID" -s -B /opt/aca/preflight/run_preflight.py
```

Il futuro runner dovrà essere coerente con questi percorsi, creare il solo HOME temporaneo come utente 1000 e usare l'albero sorgente originale per P3. Limiti proposti: 2 CPU, 2 GiB memoria e tmpfs 256 MiB; registrarli e verificarne la disponibilità prima dell'esecuzione. Il tmpfs concorre al limite di memoria. Un arresto per risorse o permessi non dimostra incompatibilità del parser.

Secondo il [contratto Docker run](https://docs.docker.com/engine/containers/run/), `--pull=never` evita acquisizioni implicite dell'immagine e `--network=none` isola la rete del container. Root filesystem in sola lettura non rende automaticamente read-only i volumi: qui quello di output è deliberatamente scrivibile. Mantenere namespace/seccomp ordinari; nessun socket del motore, repository, home, credenziale o dispositivo host montato.

Output ed `/opt/aca/tmp` sono le sole aree **applicative intenzionalmente scrivibili**, oltre ai filesystem di servizio ordinari del container. Il `noexec` del tmpfs non è un blocco assoluto di qualsiasi esecuzione; il profilo usa soltanto interprete e backend host nell'immagine. [Volume](https://docs.docker.com/engine/storage/volumes/), [tmpfs](https://docs.docker.com/engine/storage/tmpfs/).

## Consegna della preparazione e stato attuale

Il futuro stato **PRONTO PER IL PREFLIGHT** richiede: identità base/PBS/materiali verificate; lock derivato e installazione locale tracciati; inventari runtime/venv/sorgenti; runner revisionato; immagine derivata identificata; volume, tmpfs, utente e permessi predisposti; configurazione effettiva senza rete/pull; output vuoti e destinazioni delle evidenze note. Non è un esito di P0-P4.

Conservare evidenze della preparazione separate da quelle del preflight. Durante la futura esecuzione il delta di `sys.path` introdotto da `build_openssl.py` è atteso; CFFI e pycparser devono continuare a provenire dal venv verificato. Dopo P4 conservare report, log selezionati, metadata del container e volume degli output; esportazione e verifica delle evidenze precedono l'eventuale pulizia, che non è stata eseguita o assegnata qui.

**Stato attuale:** definizione completata, acquisizione/preparazione NON ESEGUITE, P0-P4 NON ESEGUITI. La CLI Docker rilevata non attesta Engine/WSL pronti. Nessun file operativo, ambiente, immagine derivata o hash di risultato inventato. Nessuna installazione, pull, esecuzione Python/preflight, compilazione o modifica al codice.
