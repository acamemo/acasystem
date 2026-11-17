# Blocco 1 Host Linux e distinta di build congelata

Data e consultazione fonti: 2026-10-29. Richiesta: [U11](../diario/2026-10-29.md#u11-host-linux-e-dipendenze-di-build). Evidenze: [REP-20261029-013](../../reports/REP-20261029-013-host-linux-build-riproducibile.md). Completa gli studi [U9](01-baseline-compilazione-m11.md) e [U10](01-cffi-libffi-openssl-header.md). Tutte le scelte sono documentali: nessuna installazione, compilazione o modifica al codice.

## Risultato e significato di riproducibile

Si sceglie un ambiente di **compilazione Linux x86_64 in container Debian 13 trixie slim**, con immagine individuata dal digest della piattaforma e repository APT congelati al **27 ottobre 2026**. Il Python host resta **CPython 3.14.10+20261026** di python-build-standalone; non si usa il Python della distribuzione. Si fissano **20 wheel host**, incluso **pycparser 2.23**, il bootstrap virtualenv, componenti Rust, NDK e sorgenti con checksum.

La [distinta JSON](../materiali/u11-build-m11-materiali.json) identifica i materiali e conserva le versioni della ricetta. I [lock orjson](../materiali/u11-orjson-3.11.9.Cargo.lock.txt) e [cryptography](../materiali/u11-cryptography-50.0.1.Cargo.lock.txt) sono copie documentali integrali dei metadati upstream. Non sono configurazioni operative del progetto.

Questo chiude le scelte di host e versioni richieste. **Gli input sono definiti; la riproducibilità dei byte non è stata dimostrata.** Serviranno la futura preparazione dell'ambiente, la verifica dei materiali acquisiti e due build pulite confrontate. Nessuna immagine derivata ACA già costruita, lock ottenuto da un'installazione o hash di wheel Android prodotte viene dichiarato.

## Host immutabile

| Elemento | Valore fissato |
|---|---|
| Distribuzione e architettura | Debian **13 trixie slim**, immagine datata **20261027**, **linux/amd64**; il target delle wheel rimane Android ARM64. |
| Identità effettiva dell'immagine | `debian@sha256:1e1a22175fbf1b32157ddaf0219e1db4e5401fab2b94ed285add64d18587cd2d` — digest del manifest **amd64**, non il digest dell'indice multiarch. |
| Fonte immutabile | Commit `69faaf492e77aff83e4c7fc401017c9d25ecde24` degli [artefatti ufficiali Debian](https://github.com/debuerreotype/docker-debian-artifacts/blob/69faaf492e77aff83e4c7fc401017c9d25ecde24/trixie/slim/oci/index.json). |
| Repository di sistema | Snapshot `debian/20261027T000000Z`: `trixie`, `trixie-updates`, componente `main`; snapshot `debian-security/20261027T000000Z`: `trixie-security/main`. [Configurazione pubblicata con l'immagine](https://github.com/debuerreotype/docker-debian-artifacts/blob/69faaf492e77aff83e4c7fc401017c9d25ecde24/trixie/slim/rootfs.debian-sources-snapshot). |
| Pacchetti base già presenti | [rootfs.manifest](https://github.com/debuerreotype/docker-debian-artifacts/blob/69faaf492e77aff83e4c7fc401017c9d25ecde24/trixie/slim/rootfs.manifest): APT **3.0.3**, glibc **2.41-12+deb13u4**, tar **1.35+dfsg-3.1**, gzip **1.13-1+deb13u1**, Bash **5.2.37-2+b10**, coreutils **9.7-3**. |
| Python host | `cpython-3.14.10+20261026-x86_64-unknown-linux-gnu-install_only.tar.gz`, SHA256 `1b38024924eb7f4cf0cab45d7b871d1f1991354190fccd2625ac7529a43786e2`. [Manifest cibuildwheel versionato](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/python-build-standalone-releases.json). |

La data snapshot indica il limite temporale: il servizio può risolverla all'ultimo archivio disponibile precedente. Le versioni e gli indici selezionati sono registrati nella distinta. Usare soltanto questi repository, pacchetti esatti e `--no-install-recommends`; nessun aggiornamento generale verso gli archivi correnti. Nelle future letture di snapshot scaduti l'eventuale eccezione `Check-Valid-Until` riguarda solo quei repository storici, mantenendo la verifica delle firme.

Il PC della sessione è Windows. Container engine, VM/WSL o macchina Linux di esecuzione non sono stati installati o predisposti. Il digest congela il filesystem utente, non il kernel del computer ospitante: kernel, runtime del container e CPU andranno registrati nelle evidenze della futura prova. Evitare ottimizzazioni dipendenti dalla CPU dell'host come `target-cpu=native`.

## Strumenti nativi

La distinta identifica pacchetti e checksum Debian; le dipendenze di sistema si risolvono esclusivamente sugli indici congelati con APT 3.0.3 della base. Il manifest dell'immagine derivata completo andrà raccolto quando ne sarà autorizzata la preparazione; non è stato simulato un `apt install`.

| Strumento host | Versione scelta |
|---|---|
| GNU Make | `make=4.4.1-2` |
| Perl | `perl=5.40.1-6+deb13u1` |
| Compilatori/linker dei build script host | `gcc=4:14.2.0-1`, `g++=4:14.2.0-1`; implementazioni GCC/G++ 14 **14.2.0-19** |
| Binutils host | `binutils=2.44-3` |
| Header glibc host | `libc6-dev=2.41-12+deb13u4` |
| Estrazione/ricerca eseguibili | `unzip=6.0-29+deb13u1`, `xz-utils=5.8.1-1+deb13u2`, `gnu-which=2.21+dfsg-5` |
| Certificati della preparazione | `ca-certificates=20250419+deb13u1` |

GCC e binutils Debian servono al lato **host**; le librerie Android usano Clang/LLVM e sysroot della **NDK r27d**, già fissata. `pkgconf` e `patchelf` provengono dalle wheel host sotto elencate, non da un secondo pin APT. Si scelgono gli archivi release con i file `configure` già generati: non servono Autoconf/Automake/Libtool per rigenerarli, né Git per creare nuovi sdist. Un sdist mancante o diverso non autorizza un fallback ai sorgenti correnti.

## Lock Python host e venv interni

| Pacchetto | Versione | Funzione |
|---|---|---|
| pip | **26.2.2** | Installer dei materiali locali. |
| setuptools | **84.0.0** | Backend CFFI, conservando il pin HA. |
| maturin | **1.16.0** | Backend orjson/cryptography, wheel host precostruita. |
| cibuildwheel | **4.3.5** | Orchestratore Android e cross-venv per CFFI/setuptools. |
| cffi | **2.0.0** | Generatore host; il backend Android 2.0.0 è un artefatto diverso. |
| pycparser | **2.23** | Parser richiesto da CFFI, senza dipendenze esterne. |
| build | **1.6.1** | Frontend PEP 517 scelto. |
| packaging | **26.3** | Versioni, marker e tag. |
| pyproject-hooks | **1.3.3** | Invocazione dei backend. |
| bashlex | **0.18** | Dipendenza cibuildwheel. |
| bracex | **3.2** | Dipendenza cibuildwheel. |
| dependency-groups | **1.3.2** | Dipendenza cibuildwheel. |
| filelock | **4.2.4** | Dipendenza cibuildwheel. |
| humanize | **4.16.0** | Dipendenza cibuildwheel. |
| platformdirs | **4.13.6** | Dipendenza cibuildwheel. |
| certifi | **2026.10.23** | Certificati host usati dagli strumenti. |
| auditwheel | **6.8.2** | Riparazione/ispezione wheel Android prevista da cibuildwheel. |
| pyelftools | **0.33** | Dipendenza auditwheel. |
| patchelf | **0.19.1.0** | Strumento nativo distribuito come wheel host. |
| pkgconf | **3.0.7.post0** | Tool pkg-config distribuito come wheel host. |

La maggior parte dei pin segue [constraints-python314.txt di cibuildwheel 4.3.5](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/constraints-python314.txt); bashlex/bracex/dependency-groups/humanize e pycparser sono scelte esatte aggiuntive, compatibili con i requisiti dichiarati. CFFI e setuptools conservano i [vincoli HA 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/package_constraints.txt). Non si richiedono extras `uv`, test, doc o setuptools `core`.

Per tutti i 20 pacchetti sono stati riletti i metadati PyPI, verificando presenza dell'artefatto selezionato, SHA256 pubblicato, `Requires-Python`, requisiti dichiarati e stato non ritirato. La chiusura documentale dei marker è per **CPython 3.14/Linux x86_64, senza extras**: non è un lock universale per Windows o Android. Nel JSON sono indicati i nomi esatti delle wheel; quattro sono native Linux. Nessuna wheel è stata acquisita o importata.

**Pycparser 2.23** soddisfa il requisito aperto di CFFI e conserva il parser PLY della linea 2.x. La [CI del tag](https://github.com/eliben/pycparser/blob/release_v2.23/.github/workflows/ci.yml) arriva a Python 3.13; il [seguito U12](01-pycparser-223-python314-cffi.md) ha individuato successivi job upstream passati su 3.14 con il medesimo codice parser e interfaccia coerente con CFFI 2.0.0. La baseline resta invariata. La terna esatta su 3.14.10 e la generazione effettiva cryptography restano da provare, conservando docstring, ottimizzazione 0 e GIL anche sull'host; nessuna compatibilità Android è già dimostrata.

Non serve `wheel` separato: [setuptools 84.0.0](https://github.com/pypa/setuptools/tree/v84.0.0/setuptools/_vendor/wheel-0.46.3.dist-info) include wheel **0.46.3** nel vendor, coperto dall'hash della wheel setuptools. Il bootstrap effettivo è invece **virtualenv 21.14.13 PYZ**, SHA256 `215e29d6c8e2a4bf5f509828368629bbe7eddb847dcfee862db0f84e6df40047`, fissato in [virtualenv.toml](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/virtualenv.toml). Non si installano separatamente virtualenv/distlib/python-discovery soltanto perché compaiono nelle constraints multipiattaforma upstream.

Il [bootstrap cibuildwheel](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/venv.py) passa già `--pip=26.2.2`, `--no-setuptools` e `--no-periodic-update`. Per il seed locale si fissano anche `VIRTUALENV_EXTRA_SEARCH_DIR=/opt/aca/wheelhouse`, `VIRTUALENV_NO_DOWNLOAD=1` e `VIRTUALENV_APP_DATA=/opt/aca/virtualenv-app-data`. Le opzioni e la conversione delle variabili sono riscontrate nei sorgenti [virtualenv 21.14.13](https://github.com/pypa/virtualenv/blob/21.14.13/src/virtualenv/seed/embed/base_embed.py) e nel suo [parser](https://github.com/pypa/virtualenv/blob/21.14.13/src/virtualenv/config/cli/parser.py); nessun bootstrap è stato eseguito. Il wheelhouse deve contenere proprio la wheel pip 26.2.2 verificata, senza affidarsi a un seed periodicamente aggiornato.

## Rust, NDK e sorgenti congelati

Rust resta **1.95.0**, usando i quattro archivi ufficiali **rustc**, **cargo**, **rust-std host x86_64 GNU** e **rust-std aarch64-linux-android** del 16 aprile 2026. URL e SHA256 nel JSON derivano dal [manifest ufficiale](https://static.rust-lang.org/dist/channel-rust-1.95.0.toml); il suo SHA256 rilevato è `821ff14e4c4a1cbe1e8915f35aff0a3fbbdf8d293ad48ab8f31e3b0440c581f9`. Si usano binari concreti, con rustup escluso dal PATH: lo [shim cibuildwheel](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/android/rust_shim.py) tenterebbe altrimenti `rustup target add`.

La NDK resta **27.3.13750724**, archivio Linux `android-ndk-r27d-linux.zip`, 663956036 byte. Il [repository Google](https://dl.google.com/android/repository/repository2-3.xml) pubblica SHA1 `22105e410cf29afcf163760cc95522b9fb981121`; non viene inventato un SHA256 Google. La futura acquisizione dovrà controllarlo e registrare anche un SHA256 calcolato localmente.

Il profilo è **solo build di wheel**, con NDK predisposta in `/opt/android-sdk/ndk/27.3.13750724`. Il metadata locale `package.xml` deve corrispondere alla versione reale: non si presume che lo zip lo contenga. La stringa XML esatta proposta è conservata nel JSON, con hash, come specifica della futura preparazione. È stata verificata come XML ben formato, non tramite XSD o SDK manager; prima di produrla andrà confrontato `source.properties` della NDK acquisita. Non creare un marker vuoto.

Con questo metadata presente, il ramo `android.py env` non chiama sdkmanager. Per questo profilo non occorrono JDK, Gradle, Android platform/build-tools, adb o emulatore; diventano un ambiente distinto per APK/test, non una lacuna da colmare qui.

Gli sdist esatti orjson 3.11.9, cryptography 50.0.1 e CFFI 2.0.0 e i sorgenti libffi 3.8.0/OpenSSL 3.5.9 sono identificati nel JSON. La futura estrazione deve confermare che i `Cargo.lock` corrispondano alle copie documentali: **35 voci orjson e 40 cryptography**, incluse quelle di workspace; nessuna sorgente `git+` nei lock letti. Le crate registry sono fissate anche dai checksum. Preparare una cache/vendor completa per entrambi i lock, incluse dipendenze host/target; nessuna crate è stata acquisita in questo studio.

## Politica per una futura compilazione senza deriva

Queste sono prescrizioni della ricetta, **non operazioni eseguite**:

1. Preparare separatamente immagine, wheelhouse, runtime, NDK, toolchain Rust e vendor/cache con gli artefatti esatti e gli hash della distinta. Conservare la chiusura APT degli snapshot, i metadati acquisiti e un manifest dell'immagine derivata. Validare anche le cache già presenti: cibuildwheel non ricalcola sempre gli hash degli artefatti in cache.
2. Durante la build disabilitare la rete; pip deve usare soltanto il wheelhouse verificato (`PIP_NO_INDEX`, `PIP_FIND_LINKS`) e vincoli esatti globali (`PIP_CONSTRAINT`) anche nei venv interni. Il solo `CIBW_DEPENDENCY_VERSIONS=pinned` non copre i successivi `pip install` dei requisiti backend. Per il bootstrap applicare un lock con hash; non imporre alla cieca `PIP_REQUIRE_HASHES=1` alle chiamate upstream con requisiti a intervallo, che potrebbero essere rifiutate. La directory locale deve contenere un solo artefatto host ammesso per ciascun pin.
3. Selezionare `CIBW_PLATFORM=android`, `CIBW_BUILD=cp314-android_arm64_v8a`, `CIBW_ARCHS_ANDROID=arm64_v8a`, `CIBW_BUILD_FRONTEND=build`, test-command vuoto e `CIBW_TEST_SKIP=*`. Conservare auditwheel/patchelf fissati per il repair Android predefinito; i test sono rinviati, non superati implicitamente.
4. Impedire bootstrap Rust impliciti con `MATURIN_NO_INSTALL_RUST=1`, senza rustup nel PATH. Per i due backend maturin usare `MATURIN_PEP517_ARGS=--frozen`, `CARGO_NET_OFFLINE=true` e un `CARGO_HOME` predisposto. `--frozen` unisce lock invariato e modalità offline secondo [Cargo](https://doc.rust-lang.org/cargo/commands/cargo-vendor.html). Non impostare config-settings che sostituiscano accidentalmente quel flag.
5. Conservare gli include/linker dello studio U10. Il percorso Python target deve provenire dall'archivio Android fissato; `CFLAGS_aarch64_linux_android` aggiunge gli header corretti dopo la preparazione. Il profilo dei compilatori C e Rust deve mantenere entrambi i flag 16 KB e il collegamento statico previsto. Nessuna libreria Linux può sostituire quella Android.

Per il determinismo si fissa la convenzione di ricetta **`SOURCE_DATE_EPOCH=1793232000`** (29 ottobre 2026 00:00 UTC), **`TZ=UTC`**, **`LC_ALL=C.UTF-8`**, **`PYTHONHASHSEED=0`**, umask **022**, build root `/opt/aca/build` e TMPDIR `/opt/aca/tmp`. L'epoch è una scelta della ricetta ACA, non una data attribuita ai sorgenti upstream. [Specifica SOURCE_DATE_EPOCH](https://reproducible-builds.org/specs/source-date-epoch/).

Usare archivi statici deterministici (`llvm-ar` della NDK, modalità `D`), remapping dei percorsi C/C++ e Rust, timestamp/permessi/ordine ZIP fissati anche dopo il repair. I nomi temporanei creati dall'orchestratore vanno normalizzati nel mapping effettivo, non solo assegnando un TMPDIR comune. La propagazione esatta di tutti i flag e la normalizzazione dei percorsi restano da controllare nella prima esecuzione; pin e hash da soli non dimostrano l'identità dei byte.

## Verifica richiesta per dichiarare il risultato riproducibile

Una futura prova deve validare hash/versioni acquisiti, confrontare gli inventari dei venv interni con i 20 pin, eseguire due build pulite con input identici e confrontare SHA256/contenuto delle wheel dopo il repair. Se gli output differiscono, la riproducibilità non è raggiunta: analizzare timestamp, percorsi, metadati e ELF prima di dichiararla.

Restano separati import/test Android, ABI reale e disponibilità del M11, integrazione nel client e avvio completo di HA. Tutti **non eseguiti**. Questo incarico definisce host e dipendenze: non autorizza la loro installazione o la compilazione.
