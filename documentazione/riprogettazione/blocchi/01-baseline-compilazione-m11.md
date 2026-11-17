# Blocco 1 Baseline di compilazione Android per il Tab M11

Data e consultazione fonti: 2026-10-29. Richiesta: [U9](../diario/2026-10-29.md#u9-combinazione-precisa-di-compilazione). Controlli: [REP-20261029-011](../../reports/REP-20261029-011-baseline-compilazione-m11.md). Prosegue lo [studio dei due pacchetti](01-orjson-cryptography-android.md); resta valida [ADR-0026](../../decisions/ADR-0026-frontend-ha-presente-nascosto.md).

## Combinazione scelta per lo studio

La seguente è la **baseline documentale della prima possibile prova nativa Android**. Le versioni sono scelte nell'incarico di analisi; nessuna toolchain è stata installata o adottata nel progetto e nessuna compatibilità di compilazione/esecuzione è dimostrata.

| Elemento | Versione o valore fissato | Motivazione e fonte |
|---|---|---|
| Motore di riferimento | Home Assistant Core **2026.10.4** | Conserva il riferimento già analizzato; [pyproject del tag](https://github.com/home-assistant/core/blob/2026.10.4/pyproject.toml). |
| Pacchetti | **orjson==3.11.9**, **cryptography==50.0.1** | Sorgenti upstream delle medesime versioni, senza sostituzioni o patch in questo incarico. |
| Runtime target | **CPython 3.14.10 ufficiale per Android aarch64, con GIL** | Soddisfa Python >=3.14.2 di Core. Artefatto `python-3.14.10-aarch64-linux-android.tar.gz`, elencato nel [manifest cibuildwheel 4.3.5](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/build-platforms.toml). Nessuna variante free-threaded `cp314t`. |
| Android NDK | **r27d — 27.3.13750724** | È la revisione fissata dallo [script Android di CPython v3.14.10](https://github.com/python/cpython/blob/v3.14.10/Android/android-env.sh), corrispondente alla [release NDK r27d](https://github.com/android/ndk/releases/tag/r27d). |
| Rust | **1.95.0 stabile**, target **aarch64-linux-android** | Copre il minimo 1.95 di orjson, 1.83.0 di cryptography e 1.89 di maturin 1.16.0. [Release Rust](https://blog.rust-lang.org/2026/04/16/Rust-1.95.0/). |
| Backend di build | **maturin 1.16.0** | Rientra in entrambi gli intervalli upstream; include le correzioni successive al minimo 1.14.1 richiesto da cryptography. [Manifest](https://github.com/PyO3/maturin/blob/v1.16.0/Cargo.toml), [changelog](https://github.com/PyO3/maturin/blob/v1.16.0/Changelog.md). |
| ABI e livello API delle librerie | **arm64-v8a**, **API 24** | Corrispondenza target ARM64 nel [testbed CPython](https://github.com/python/cpython/blob/v3.14.10/Android/testbed/app/build.gradle.kts); API predefinita nello script versionato. Condizionati alla conferma dell'ABI reale del tablet. |
| Compilatore C/C++ | Quello incluso nel NDK sopra, launcher **aarch64-linux-android24-clang** / **aarch64-linux-android24-clang++** | C e Rust devono collegare contro lo stesso sysroot Android, senza usare librerie Linux dell'host. |
| Orchestratore ausiliario | **cibuildwheel 4.3.5**, identificatore **cp314-android_arm64_v8a** | Il suo manifest seleziona esattamente l'archivio Python sopra; [metadati della release](https://pypi.org/pypi/cibuildwheel/4.3.5/json). |
| Completamento U10 | **CFFI 2.0.0, libffi 3.8.0, OpenSSL 3.5.9** | [Studio successivo](01-cffi-libffi-openssl-header.md): vincolo CFFI HA, librerie target autonome e configurazione degli header, senza installazioni o build. |

L'API 24 è il minimo delle librerie di questa baseline, non la versione Android richiesta ad ACA. L'app attuale conserva `minSdkVersion=26` e target/compile 36 in `progetto/client/android/android/variables.gradle`; nessuna impostazione viene cambiata.

## Perché queste versioni

**Un solo Python target.** Runtime, `libpython`, header, `pyconfig.h` e dati sysconfig dovranno provenire dalla stessa distribuzione Android 3.14.10. Non basta che due interpreti dichiarino entrambi “3.14”: mescolare materiali Chaquopy, Termux, Linux e CPython ufficiale non è la baseline scelta. La selezione riguarda il runtime della prova; l'incorporamento definitivo nell'APK ACA resta da progettare e verificare.

**NDK allineato al sorgente CPython.** Per questa prima combinazione si conserva il pin r27d dello script v3.14.10. Non è un'affermazione che NDK successivi siano incompatibili; evita di introdurre un'altra variabile. La lettura dello script dimostra la configurazione upstream, non una verifica locale della provenienza o del contenuto binario dell'archivio.

**Rust comune ai due pacchetti.** Il [Cargo.toml orjson 3.11.9](https://github.com/ijl/orjson/blob/3.11.9/Cargo.toml) richiede Rust 1.95, mentre il [workspace cryptography 50.0.1](https://github.com/pyca/cryptography/blob/50.0.1/Cargo.toml) dichiara 1.83.0. Si fissa 1.95.0, senza nightly; il rispetto dei minimi non sostituisce la compilazione dei lock effettivi.

**Maturin unico e fissato.** [Orjson](https://github.com/ijl/orjson/blob/3.11.9/pyproject.toml) ammette `>=1,<2`; [cryptography](https://github.com/pyca/cryptography/blob/50.0.1/pyproject.toml) richiede `>=1.14.1,<2`. La 1.16.0 è nell'intersezione e dichiara Rust minimo 1.89. Il changelog comprende già il fix Android abi3 della 1.13.2 e quelli abi3/abi3t della 1.14.1, più aggiornamenti delle dipendenze nelle release successive. È scelta come versione precisa aggiornata; non perché Android richieda obbligatoriamente almeno 1.16.0. I [metadati PyPI](https://pypi.org/pypi/maturin/1.16.0/json) riportano pubblicazione dello sdist il 2026-10-29 e artefatto non ritirato. Non è stata provata contro questi due tag.

## Separare host e tablet

La baseline prevede un **host Linux x86_64 con glibc** per la futura cross-build. Il PC corrente è Windows: nessun ambiente Linux, container, WSL o workflow remoto è stato creato. La distribuzione dell'host e l'eventuale immagine/digest non sono ancora fissati; la distinta completa non è quindi riproducibile soltanto con questa tabella.

Il [manifest degli interpreti host di cibuildwheel 4.3.5](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/resources/python-build-standalone-releases.json) include per Linux x86_64 glibc Python **3.14.10+20261026**. Questo Python esegue gli strumenti sul PC; `libpython` e header per le wheel sono quelli **Android**. L'uguaglianza della versione non rende intercambiabili i due binari.

Il pin di cibuildwheel non congela da solo i requisiti PEP 517 dei pacchetti. Nella futura ricetta occorrerà imporre anche maturin **esattamente 1.16.0** tramite vincoli dell'ambiente di build, senza modificare i `pyproject.toml` upstream. Nessun file di configurazione o comando operativo è stato aggiunto in questo incarico.

## Materiali identificati senza scaricarli

| Materiale | SHA256 pubblicato, non calcolato localmente |
|---|---|
| Archivio Python Android 3.14.10 aarch64, manifest cibuildwheel 4.3.5 | `423c80b957330cf0ebb92b9b20f2294c292144a441bdb0ceb8c69d14928e569b` |
| `maturin-1.16.0.tar.gz`, metadati PyPI | `13e69ca12542999d8c5467131de72a49bb76e4c284b9a45c5783df7c0fcb3a8a` |
| `cibuildwheel-4.3.5-py3-none-any.whl`, metadati PyPI | `2297362cb7a0a12cd681788197811e1f3d700bd31f6decaab051837c90d4e3ba` |

Gli hash identificano gli artefatti citati, non attestano un download verificato. Per maturin lo sdist è un riferimento di provenienza: non è stata ancora selezionata la wheel host o decisa la sua compilazione. Restano da congelare gli altri materiali, compresi sorgenti/lock dei due moduli, toolchain Rust e archivio NDK per l'host definitivo.

## Ostacoli che i quattro pin non eliminano

1. **Header di cryptography.** Nel [build.rs 50.0.1](https://github.com/pyca/cryptography/blob/50.0.1/src/rust/cryptography-cffi/build.rs) la directory include viene derivata dal nome della cartella indicata da `PYO3_CROSS_LIB_DIR` e dai suoi genitori. Il [builder Android cibuildwheel 4.3.5](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/platforms/android.py) passa `<python_dir>/prefix/lib`: quella logica porta a `<python_dir>/include/lib`, anziché al previsto `<python_dir>/prefix/include/python3.14`. È un disallineamento dedotto dai sorgenti, non un errore osservato eseguendo la build. Prima di ipotizzare patch andrà provata una configurazione esterna degli include target; per esempio cc-rs documenta `CFLAGS_aarch64_linux_android` e gli include espliciti. [Configurazione cc-rs](https://docs.rs/cc/latest/cc/#external-configuration-via-environment-variables). Nessuna soluzione è già collaudata.
2. **Dipendenze crittografiche.** Nel [seguito U10](01-cffi-libffi-openssl-header.md) sono stati fissati CFFI 2.0.0 (anche pin HA), libffi 3.8.0 e OpenSSL 3.5.9. La futura build deve allinearne header/librerie target e distinguere i materiali già presenti nel runtime; il collegamento e la compatibilità non sono provati.
3. **Linker e pagine di memoria.** Lo script CPython imposta `-z,max-page-size=16384` e `--no-undefined`. La ricetta Rust dovrà propagare i requisiti Android pertinenti: non è dimostrato che Cargo erediti automaticamente `LDFLAGS`. L'allineamento va controllato nei file ELF e nel confezionamento dell'APK; scegliere NDK r27d da solo non lo certifica.
4. **Supporto di orjson.** Il [README del tag 3.11.9](https://github.com/ijl/orjson/blob/3.11.9/README.md) esclude il supporto embedded Android/iOS. Anche una wheel costruita e importabile non modifica questa condizione upstream; servono prove nell'interprete incorporato finale e sugli usi di HA.
5. **Tablet e altre dipendenze.** Nell'inventario ADB in sola lettura di questa sessione risultano zero dispositivi autorizzati; ABI/API/page size reali non sono state lette. L'ipotesi `arm64-v8a` resta condizionata al tablet effettivo. Le [altre dipendenze Core](01-compatibilita-python-m11.md) non sono risolte da questi due moduli.

## Punto di ripresa

I quattro componenti richiesti hanno una combinazione esatta e motivata; lo [studio U10](01-cffi-libffi-openssl-header.md) aggiunge le tre versioni native e una configurazione esterna degli header. Restano host riproducibile, restante lock e cablaggio effettivo dell'orchestratore/linker. Per dichiarare fattibilità serviranno build, ispezione ELF e import/test nel runtime finale sul tablet, tutti **non eseguiti e non assegnati** da queste richieste documentali.

Nessuna installazione, acquisizione di archivi/binari, modifica al codice, aggiornamento di dipendenze del progetto, commit o deploy.
