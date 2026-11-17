# Blocco 1 Ottenere orjson e cryptography per Android

Data: 2026-10-29. Fonte umana: [U8](../diario/2026-10-29.md#u8-ottenere-orjson-e-cryptography-per-android). [Matrice di compatibilità](01-compatibilita-python-m11.md). Evidenze e controlli: [REP-20261029-010](../../reports/REP-20261029-010-orjson-cryptography-android.md). Resta valida [ADR-0026](../../decisions/ADR-0026-frontend-ha-presente-nascosto.md): frontend HA conservato ma non mostrato nel flusso ACA.

## Risultato dello studio

La strada documentata è produrre wheel Android proprie a partire dai sorgenti esatti `orjson 3.11.9` e `cryptography 50.0.1`, prima tentando di lasciarli invariati. I pin Python possono restare quelli di HA mentre cambia l'artefatto destinato alla piattaforma. Non sono stati trovati pacchetti Android pronti delle due versioni su PyPI, e nessuna compilazione è stata eseguita.

La cross-compilazione ha basi concrete nei sistemi di build; il funzionamento nel Python incorporato di ACA resta non provato. Per `orjson` rimane l'esclusione esplicita del supporto embedded Android/iOS dichiarata dall'autore. Per `cryptography` esiste logica cross specifica nel tag richiesto, ma occorre ottenere anche le sue dipendenze native per lo stesso target.

Tutto il documento è analisi e proposta di prove future. Nessuno strumento, runtime o pacchetto è stato installato, nessun archivio/wheel scaricato e nessun sorgente modificato.

## Versioni e significato di mantenere i pin

La base resta Core 2026.10.4 con CPython 3.14 ordinario e i pin già censiti. Una nuova wheel Android dagli stessi sorgenti upstream può conservare la versione del pacchetto. Se fossero necessarie patch, manterrebbe soltanto il riferimento alla versione di partenza: andrebbero registrati patch, provenienza e identificativo della build, senza dichiarare equivalenza con il codice upstream invariato.

Non sono state scelte sostituzioni dei moduli, versioni più vecchie o implementazioni con lo stesso nome. Alla chiusura di questo studio non era stata scelta una catena di strumenti per ACA; il successivo approfondimento U9 fissa una [baseline documentale](01-baseline-compilazione-m11.md), senza installarla o compilarla. L'ABI reale del Tab M11 resta da verificare secondo la matrice precedente; nessuna nuova lettura ADB eseguita in questo studio U8.

I [metadati PyPI orjson](https://pypi.org/pypi/orjson/3.11.9/json) e [cryptography](https://pypi.org/pypi/cryptography/50.0.1/json), riletti il 2026-10-29, contengono per ciascun pin una distribuzione sorgente e zero artefatti Android. Gli archivi non sono stati acquisiti o ispezionati: la loro completezza rispetto a lock e altri file di build va verificata in un futuro incarico.

## Percorso Android nativo documentato

Il [README ufficiale Chaquopy per le wheel](https://github.com/chaquo/chaquopy/blob/master/server/pypi/README.md), ramo master consultato il 2026-10-29, indica **cibuildwheel per Python 3.13 e successivi**. Il vecchio builder è destinato a Python 3.12 e precedenti. Il repository di vecchie ricette non è quindi la procedura da trasferire automaticamente a Python 3.14.

La [documentazione Android di cibuildwheel](https://cibuildwheel.pypa.io/en/stable/platforms/#android), consultata nella stessa data, supporta host Linux x86_64 e macOS, SDK Android e un livello API esplicito, predefinito 24. La build ARM64 e il test ARM64 sono distinti: su host x86_64 quei test automatici possono essere saltati. La procedura può installare componenti SDK e non è stata eseguita.

Il PC della sessione è Windows: un eventuale host di build compatibile andrebbe individuato o predisposto in un incarico successivo. Non è stato creato un ambiente Linux, un container o un workflow remoto. La compilazione non deve avvenire necessariamente sul tablet.

Fondamenta da allineare:

| Elemento | Vincolo documentale |
|---|---|
| CPU e piattaforma | Target Rust `aarch64-linux-android`, non Linux GNU/musl. Fonte: [Rust Android](https://doc.rust-lang.org/rustc/platform-support/android.html). |
| Compilatore C e linker | Android NDK/Clang con livello API coerente. Fonte: [NDK e sistemi di build](https://developer.android.com/ndk/guides/other_build_systems). |
| Python target | Header, configurazione/sysconfig e `libpython` del runtime Android finale, non del Python usato sul PC. Fonte: [Python 3.14 Android](https://docs.python.org/3.14/using/android.html). |
| Configurazione PyO3 | Variabili di cross-build e collegamento al target, secondo le versioni incluse nei pin. Fonti: [PyO3 0.28.3](https://pyo3.rs/v0.28.3/building-and-distribution), [PyO3 0.29.0](https://pyo3.rs/v0.29.0/building-and-distribution#cross-compiling). |
| Artefatto | Tag Python/ABI e `android_<API>_arm64_v8a` corretti; dipendenze ELF del target. Fonte: [tag PyPA](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/#android). |

Una wheel Linux ARM64 non diventa un binario Android cambiando il nome. CPython ufficiale e runtime di incorporamento vanno scelti prima della prova: non si assume che un'estensione costruita contro uno sia automaticamente valida nell'altro.

## orjson 3.11.9

Sorgente studiato: tag **3.11.9**, commit **705515d77b28429d0b7c30c3d781abe52e8a1e5a**. Fonti aperte il 2026-10-29: [Cargo.toml](https://github.com/ijl/orjson/blob/3.11.9/Cargo.toml), [Cargo.lock](https://github.com/ijl/orjson/blob/3.11.9/Cargo.lock), [pyproject](https://github.com/ijl/orjson/blob/3.11.9/pyproject.toml), [build.rs](https://github.com/ijl/orjson/blob/3.11.9/build.rs) e [README](https://github.com/ijl/orjson/blob/3.11.9/README.md).

| Aspetto | Riscontro |
|---|---|
| Rust | Minimo dichiarato **1.95**, edition 2024. |
| Backend di build | `maturin>=1,<2`, senza singola versione congelata dal requisito. |
| Interfaccia Python | Lock con `pyo3-ffi 0.28.3` e `pyo3-build-config 0.28.3`. |
| Parte C | Il build compila anche yyjson C, mediante `cc` risolto a 1.2.61. |
| Controlli espliciti | In `build.rs` non è stato trovato un rifiuto Android; esistono controlli per implementazione Python e free-threading. |
| Supporto dichiarato | L'upstream esclude Python incorporato su Android/iOS; l'assenza di un divieto nel build non annulla questa esclusione. |

Una futura prova dovrebbe mantenere il lock, usare il Python target e verificare il collegamento a `libpython`. Non si presume compatibilità con subinterpreti o varianti Python diverse: il modulo usa dettagli CPython e stato globale, quindi il test deve avvenire nello stesso modello di incorporamento previsto per ACA. Il tag non fornisce una ricetta Android già collaudata.

Per il backend di build non basta un maturin 1.x qualsiasi: il [changelog versionato](https://github.com/PyO3/maturin/blob/v1.13.0/Changelog.md) documenta l'introduzione del supporto Android e successive correzioni, inclusa una release poi ritirata. Nel percorso comune ai due pacchetti va considerato anche il minimo maturin imposto da cryptography sotto.

Valutazione: un primo tentativo futuro da sorgenti invariati è motivato. Se fallisse, bisognerebbe identificare il punto esatto prima di parlare di patch; un port mantenuto da ACA non è già autorizzato e non è dimostrato necessario da questo studio.

## cryptography 50.0.1

Fonti nel tag **50.0.1**, aperte il 2026-10-29: [pyproject](https://github.com/pyca/cryptography/blob/50.0.1/pyproject.toml), [Cargo.toml](https://github.com/pyca/cryptography/blob/50.0.1/Cargo.toml), [Cargo.lock](https://github.com/pyca/cryptography/blob/50.0.1/Cargo.lock), [bridge CFFI](https://github.com/pyca/cryptography/blob/50.0.1/src/rust/cryptography-cffi/build.rs) e [documentazione di installazione](https://cryptography.io/en/50.0.1/installation/).

| Aspetto | Riscontro |
|---|---|
| Rust della libreria | Minimo dichiarato **1.83.0**. |
| Backend | `maturin>=1.14.1,<2`; la versione 1.14.1 richiede Rust 1.89 se il tool stesso viene compilato dai sorgenti. |
| PyO3 | Workspace 0.29, lock risolto a 0.29.0, con supporto ABI stabile. `abi3` non elimina la piattaforma Android. |
| CFFI | `cffi>=2.0.0` su CPython, sia per la build sia per il runtime. Va risolta e resa disponibile anche la sua parte target. |
| Provider crittografico | Nel caso OpenSSL, minimo **3.0.0**; include e librerie devono essere per Android. |
| Cross-build | Il bridge del tag usa esplicitamente `PYO3_CROSS_LIB_DIR` per derivare header del Python target, evitando quelli host. |

Il [controllo OpenSSL del tag](https://github.com/pyca/cryptography/blob/50.0.1/src/_cffi_src/openssl/cryptography.py) fissa il minimo; il [changelog](https://github.com/pyca/cryptography/blob/50.0.1/CHANGELOG.rst) registra OpenSSL 4.0.2 per le wheel upstream. Questo non rende 4.0.2 il minimo obbligatorio e non seleziona una versione per ACA. I numeri dei crate Rust `openssl`/`openssl-sys` non sono la versione della libreria C.

Una distinta di build deve comprendere CFFI e libffi, oltre al provider OpenSSL target. La documentazione descrive build proprie e provider alternativi, ma non autorizza a collegarsi alle librerie SSL private di Android come se fossero una dipendenza pubblica dell'app. Fonti: [librerie native private Android](https://developer.android.com/about/versions/nougat/android-7.0-changes#ndk), [istruzioni Android OpenSSL 4.0.2](https://github.com/openssl/openssl/blob/openssl-4.0.2/NOTES-ANDROID.md). Il collegamento statico/condiviso e la convivenza con il modulo Python `ssl` vanno verificati nel runtime finale.

Il [changelog maturin 1.14.1](https://github.com/PyO3/maturin/blob/v1.14.1/Changelog.md) contiene correzioni Android/ABI; una versione di build compatibile con entrambi i pin è quindi identificabile sul piano dei vincoli. Una toolchain Rust almeno 1.95 soddisferebbe numericamente i minimi dei due moduli e del tool citato, ma non è una build eseguita o una scelta di toolchain approvata.

Valutazione: il supporto cross nei sorgenti rende il tentativo da tag invariato una strada concreta da verificare. Non basta produrre la sola wheel cryptography senza il relativo CFFI e provider target.

## Ricette pubbliche e loro limiti

| Fonte primaria consultata | Versione osservata | Uso corretto nello studio |
|---|---|---|
| [Ricetta Chaquopy](https://github.com/chaquo/chaquopy/blob/master/server/pypi/packages/cryptography/meta.yaml) | cryptography 42.0.8 | Precedente tecnico, non pacchetto 50.0.1 pronto per Python 3.14. |
| [python-for-android](https://github.com/kivy/python-for-android/blob/develop/pythonforandroid/recipes/cryptography/__init__.py) | cryptography 46.0.3 | Esempio di dipendenze e adattamenti, non equivalenza col pin richiesto. |
| [Termux](https://github.com/termux/termux-packages/blob/master/packages/python-cryptography/build.sh) | cryptography 50.0.2 | Precedente vicino di cross-build, ma versione diversa e ambiente differente dall'APK ACA. |

Le fonti su rami mobili sono osservazioni del 2026-10-29. Non sono state copiate, eseguite o trasformate in ricette ACA. Mantenere i pin impedisce di trattare le vecchie versioni disponibili come sostituti automatici.

## Percorso futuro senza cambiare inizialmente i sorgenti

Tutte le fasi seguenti sono **non eseguite**:

1. Identificare ABI/API effettive del M11 e scegliere il runtime Android finale; congelare versioni, provenienza e hash dei materiali di build.
2. Acquisire in un futuro ambiente isolato i sorgenti esatti e i rispettivi lock, separando strumenti host da librerie target.
3. Preparare le dipendenze target necessarie a cryptography: CFFI/libffi e provider OpenSSL coerente con il runtime. Orjson ha una catena indipendente e non richiede questo provider.
4. Tentare la build dei tag invariati, con NDK, Rust e un backend maturin adeguato; registrare comandi, versioni e diagnostica. Non sostituire i pacchetti per superare gli errori.
5. Ispezionare versione del pacchetto, tag Python/Android, formato ELF e librerie richieste; escludere contaminazioni da binari host/Linux.
6. Provare import e versione nel runtime Android finale. Per orjson: serializzazione, deserializzazione e opzioni effettivamente usate da HA; per cryptography: backend CFFI/Rust, provider e test upstream della versione fissata.
7. Solo dopo le prove dei moduli, verificare gli usi in HA e il loro confezionamento nell'app. Una wheel compilata non equivale a test passati e un test del modulo non equivale ad avvio completo di Core.

Il meccanismo documentato Chaquopy `find-links` consuma wheel proprie durante la costruzione dell'app. Non dimostra un aggiornamento del runtime scaricabile dal solo ZIP frontend. Distribuzione e aggiornamento di codice nativo restano una questione del prodotto, non una funzione introdotta da questo studio.

Se servissero patch, andrebbero prima separate da problemi di ambiente e configurazione; sarebbero un nuovo perimetro da discutere, con sorgenti modificati identificabili. Non è stata decisa alcuna sostituzione di libreria o mantenimento di un fork.

## Ambiente Linux sullo stesso tablet

Un ambiente Linux locale potrebbe rendere pertinenti le wheel Linux ARM64 delle medesime versioni, a condizione di avere Python e libreria C compatibili: glibc per `manylinux`, musl per `musllinux`. Termux nativo usa invece Bionic e non soddisfa automaticamente quei requisiti. È un'altra pista di laboratorio, non una soluzione al collegamento nativo Android. Il [progetto PRoot Distro](https://github.com/termux/proot-distro) documenta differenze da un sistema Linux completo; una prova lì non dimostrerebbe l'APK né HA OS/Supervisor.

Non è stato installato un ambiente di questo tipo. Il risultato richiesto ora resta lo studio della strada Android mantenendo i pin.

## Conclusione e punto di ripresa

Per ottenere i due moduli senza cambiare le versioni, la pista più concreta emersa è la produzione controllata di wheel Android proprie. Cryptography offre meccanismi cross espliciti; orjson non presenta un blocco Android nel build script esaminato ma continua a escludere l'embedded dal supporto. Nessun successo è dimostrato per l'esatta combinazione ACA/M11.

Il passo documentale successivo può fissare runtime e distinta dei materiali e verificare CFFI/libffi/OpenSSL prima di un eventuale incarico di compilazione isolata. Risolvere questi due pin non chiude le altre dipendenze di Core già censite. Non avviare installazioni, build, patch o pubblicazioni sulla base di questo documento.

**Seguito del 2026-10-29, U9:** [scelti i quattro strumenti della baseline](01-baseline-compilazione-m11.md). Restano da completare le altre dipendenze e la configurazione di build; nessuna prova eseguita.
