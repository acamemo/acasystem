# Blocco 1 CFFI, libffi, OpenSSL e header di cryptography

Data e consultazione delle fonti: 2026-10-29. Fonte umana: [U10](../diario/2026-10-29.md#u10-cffi-libffi-openssl-e-header). Controlli: [REP-20261029-012](../../reports/REP-20261029-012-cffi-libffi-openssl-header.md). Completa la [baseline Python/NDK/Rust/maturin](01-baseline-compilazione-m11.md), senza installazioni, compilazioni o modifiche al codice.

## Versioni scelte per la futura prova

Restano Core **2026.10.4**, `orjson==3.11.9`, `cryptography==50.0.1`, CPython Android **3.14.10 con GIL**, NDK **r27d 27.3.13750724**, Rust **1.95.0**, maturin **1.16.0** e cibuildwheel **4.3.5**. Target previsto **arm64-v8a/API24**, condizionato alla conferma dell'ABI reale del M11. Le scelte seguenti completano l'analisi richiesta; non sono dipendenze già aggiunte al progetto.

| Materiale | Versione precisa | Destinazione e motivazione |
|---|---|---|
| CFFI | **2.0.0** | Stessa versione per il generatore Linux host e per `cffi`/`_cffi_backend` Android. È un pin esplicito di [HA 2026.10.4, package_constraints.txt](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/package_constraints.txt), non soltanto il minimo di cryptography. |
| libffi | **3.8.0 upstream**, build Android autonoma **statica PIC** | Per `_cffi_backend` Android, con header della medesima build ARM64. [Release ufficiale](https://github.com/libffi/libffi/releases/tag/v3.8.0) dell'8 agosto 2026; conserva le API tradizionali e include correzioni ARM64 successive alla versione del runtime. |
| OpenSSL | **3.5.9 upstream**, build Android autonoma **statica PIC** | Per cryptography, target `android-arm64`. Ultima patch della linea 3.5 LTS al momento della lettura, supportata fino all'8 aprile 2030 secondo i [download ufficiali](https://openssl-library.org/source/). |

Il file dei vincoli HA fissa anche **setuptools==84.0.0**: va conservato quando applicabile agli ambienti di build. `pycparser` è richiesto da CFFI senza versione esatta nei manifest esaminati; questo incarico non chiude il lock completo di tutti gli strumenti e delle transitive.

### CFFI 2.0.0 è necessario per conservare tutti i pin HA

Il [manifest cryptography 50.0.1](https://github.com/pyca/cryptography/blob/50.0.1/pyproject.toml) richiede CFFI >=2.0.0 su CPython 3.14; il requisito di build >=2.1 riguarda Python 3.15. Tuttavia HA aggiunge **cffi==2.0.0** nel proprio `homeassistant/package_constraints.txt`, motivandolo con l'allineamento al backend nativo precostruito della sua immagine. Il [gestore dei requisiti HA](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/requirements.py) applica quel file. Scegliere 2.1.1, pur ammessa da cryptography, non manterrebbe tutti i vincoli HA.

CFFI 2.0.0 dichiara supporto CPython 3.14 nel [manifest versionato](https://github.com/python-cffi/cffi/blob/v2.0.0/pyproject.toml). I [metadati PyPI](https://pypi.org/pypi/cffi/2.0.0/json) indicano sdist pubblicato l'8 settembre 2025, non ritirato e nessuna wheel Android. È quindi ancora necessario produrre il backend target. [CFFI api.py](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/api.py) verifica l'uguaglianza esatta fra versione del pacchetto Python e `_cffi_backend`: sul tablet devono essere entrambi **2.0.0**.

### Perché libffi 3.8.0 e OpenSSL 3.5.9

Il [README libffi v3.8.0](https://github.com/libffi/libffi/blob/v3.8.0/README.md) comprende nella cronologia la correzione AArch64 3.7.1 di `ffi_call` con molte strutture grandi passate per valore. Il [version script](https://github.com/libffi/libffi/blob/v3.8.0/libffi.map.in) conserva gli entry point tradizionali. Non emerge un vincolo che obblighi CFFI a usare la stessa libffi incorporata in `_ctypes`; la compatibilità della combinazione scelta resta da provare.

Cryptography 50.0.1 rifiuta OpenSSL precedente a 3.0 e nella [documentazione del tag](https://github.com/pyca/cryptography/blob/50.0.1/docs/installation.rst) elenca la linea 3.5 fra quelle testate. OpenSSL 3.5.9 è anche la versione base delle dipendenze selezionate dal sorgente CPython 3.14.10. Questa combinazione e il supporto LTS motivano la scelta. OpenSSL 4.1.0 è più recente, ma non serve introdurre una nuova linea per il primo tentativo; l'assenza di 4.1 dall'elenco del tag non ne dimostra l'incompatibilità.

## Runtime esistente e nuove librerie sono distinti

| Percorso | Materiali previsti |
|---|---|
| CPython Android: `_ssl` | Conservare le librerie della distribuzione ufficiale; il [sorgente CPython v3.14.10](https://github.com/python/cpython/blob/v3.14.10/Android/android.py) seleziona source-deps `openssl-3.5.9-0`, con librerie condivise rinominate `_python`. |
| CPython Android: `_ctypes` | Conservare i materiali del runtime, che seleziona source-deps `libffi-3.4.4-3`. |
| Nuovo `_cffi_backend` Android | Compilare CFFI 2.0.0 contro una build autonoma libffi 3.8.0, statica PIC, nello stesso target ARM64/API24. |
| Nuovo cryptography Android | Collegare una build autonoma OpenSSL 3.5.9 statica PIC; non dipendere dai nomi `libcrypto_python.so` / `libssl_python.so` del runtime. |
| CFFI sul computer di compilazione | CFFI 2.0.0 e relativo backend **Linux host**, utilizzabili dal Python host per generare il C. Non caricare il backend Android sul PC. |

Le revisioni `-0` e `-3` sono revisioni delle ricette BeeWare, non versioni upstream aggiuntive. Inoltre le ricette source-deps [OpenSSL](https://github.com/beeware/cpython-android-source-deps/blob/openssl-3.5.9-0/android-env.sh) e [libffi](https://github.com/beeware/cpython-android-source-deps/blob/libffi-3.4.4-3/android-env.sh) indicano rispettivamente NDK **27.2.12479018** e **27.1.12297006**, con API predefinita **21**. Non descrivere i relativi binari come già costruiti con r27d/API24. La futura compilazione autonoma qui proposta usa la baseline U9; il runtime ufficiale resta conservato e non viene ricompilato.

La funzione `package()` di CPython non include `libffi.a` e gli header libffi fra i materiali embeddable selezionati: non basta puntare CFFI all'archivio Python per ottenere automaticamente il suo SDK libffi. Le configurazioni di build sono state lette nei sorgenti; nessun contenuto binario degli archivi è stato verificato localmente.

## Impostazione delle librerie target

La [procedura Android OpenSSL 3.5.9](https://github.com/openssl/openssl/blob/openssl-3.5.9/NOTES-ANDROID.md) prevede un target esplicito `android-arm64`, NDK e API. Per la prima ricetta si scelgono **API24, PIC, `no-shared`, `no-module`**, conservando i provider previsti upstream. In [providers/build.info](https://github.com/openssl/openssl/blob/openssl-3.5.9/providers/build.info) default/base sono incorporati e `no-module` incorpora anche legacy invece di richiedere un modulo separato. Non vengono scelti `no-legacy` o altre rimozioni di algoritmi.

Per libffi: compilazione cross ARM64/API24 con PIC, libreria statica e libreria condivisa disabilitata. Il prefisso dedicato deve esporre **`ffi.h`, `ffitarget.h` e `libffi.a` della stessa build**, senza una `libffi.so` concorrente. Per CFFI il [setup.py 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/setup.py) usa `-lffi`: in questo prefisso il collegamento dovrà risolvere l'archivio target statico. `CFFI_FORCE_STATIC` da solo non garantisce il risultato, perché aggiunge oggetti ma lascia anche `libraries=['ffi']`.

La futura configurazione di cryptography deve puntare `OPENSSL_DIR` al prefisso autonomo e impostare **`OPENSSL_STATIC=1`**; `OPENSSL_LIB_DIR` e `OPENSSL_INCLUDE_DIR`, se presenti, devono concordare con lo stesso prefisso. [Variabili del binding OpenSSL](https://docs.rs/openssl/0.10.81/openssl/). Vanno controllati anche eventuali override con prefisso del target, evitando che prevalgano percorsi Linux.

Per CFFI/setuptools servono include e librerie target nei suoi `CFLAGS`/`CPPFLAGS` e `LDFLAGS`, insieme al sysconfig Android gestito dal builder. Limitare **`PKG_CONFIG_LIBDIR`** ai file `.pc` Android e svuotare il `PKG_CONFIG_PATH` ereditato; `PKG_CONFIG` deve essere il percorso di un eseguibile, senza argomenti incorporati. Il builder cibuildwheel gestisce questo dettaglio. Se il lookup libffi fallisce, il setup mantiene fallback `/usr/include/ffi` e `/usr/include/libffi`: la futura build dovrà interrompersi anziché accettare materiali host.

Le copie statiche aumentano i materiali nativi rispetto al riuso delle librerie del runtime. Il collegamento locale delle funzioni (`-Bsymbolic-functions`) e l'esclusione degli export degli archivi statici sono opzioni della futura ricetta da verificare sul DSO finale: non creano automaticamente un namespace separato e non certificano assenza di interposizione. Serviranno controllo ELF dei simboli e import contemporaneo di `_ssl`, `_ctypes`, `_cffi_backend` e cryptography.

## Soluzione proposta per gli header di cryptography

Il problema è circoscritto: il [build.rs del ponte CFFI](https://github.com/pyca/cryptography/blob/50.0.1/src/rust/cryptography-cffi/build.rs) interpreta `PYO3_CROSS_LIB_DIR` come se il suo basename identificasse una versione Python. Con il valore `<python_dir>/prefix/lib` impostato da [cibuildwheel 4.3.5](https://github.com/pypa/cibuildwheel/blob/v4.3.5/cibuildwheel/platforms/android.py), ricava `<python_dir>/include/lib`. Gli header attesi si trovano invece nel prefisso target, sotto `include/python3.14`.

**Si conserva la directory lib corretta per PyO3 e si aggiunge l'include Android esplicito a cc-rs.** Il [Cargo.lock cryptography](https://github.com/pyca/cryptography/blob/50.0.1/Cargo.lock) blocca `cc` a **1.4.0**; la sua [documentazione versionata](https://docs.rs/cc/1.4.0/cc/#external-configuration-via-environment-variables) ammette `CFLAGS_aarch64_linux_android`.

Esempio di **specifica non eseguita**, con percorsi convenzionali per un futuro host Linux. Queste cartelle non sono state create. Dopo la preparazione del runtime e dei flag target, il processo che avvia la build deve ricevere:

```sh
ACA_PY_PREFIX=/opt/aca/targets/cpython-3.14.10-aarch64-linux-android/prefix
ACA_PY_HOST=/opt/aca/host-venv/bin/python
ACA_NDK_BIN=/opt/android-sdk/ndk/27.3.13750724/toolchains/llvm/prebuilt/linux-x86_64/bin

export PYO3_CROSS=1
export PYO3_CROSS_PYTHON_VERSION=3.14
export PYO3_CROSS_PYTHON_IMPLEMENTATION=CPython
export PYO3_CROSS_LIB_DIR="$ACA_PY_PREFIX/lib"
export PYO3_PYTHON="$ACA_PY_HOST"

export CC_aarch64_linux_android="$ACA_NDK_BIN/aarch64-linux-android24-clang"
export AR_aarch64_linux_android="$ACA_NDK_BIN/llvm-ar"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$ACA_NDK_BIN/aarch64-linux-android24-clang"
export CFLAGS_aarch64_linux_android="${CFLAGS:+$CFLAGS }-I$ACA_PY_PREFIX/include/python3.14"
```

L'esempio assume che `CFLAGS` contenga già i flag **target**, compreso `-D__BIONIC_NO_PAGE_SIZE_MACRO` dello script CPython; eventuali flag specifici target già presenti vanno conservati, non sovrascritti alla cieca. Il futuro avvio di maturin deve selezionare esplicitamente `--target aarch64-linux-android`. L'esempio riguarda gli include del ponte CFFI di cryptography, non è una ricetta completa di build o il setup di CFFI/setuptools.

`Python.h` e `pyconfig.h` devono provenire dallo **stesso archivio Android 3.14.10** del runtime. Il percorso errato derivato dal build script deve restare inesistente; il `-I` aggiunto fornisce gli header corretti. Non spostare `PYO3_CROSS_LIB_DIR` in `lib/python3.14`: PyO3 usa quel valore anche per cercare la libreria, che rimane in `prefix/lib`. Non usare header Linux della stessa versione, `CPATH` globale o un `PYO3_CONFIG_FILE` come presunta correzione del calcolo autonomo nel ponte CFFI.

### Interprete host e momento in cui passare i flag

Il Python host esegue `build_openssl.py` con CFFI **2.0.0**, generando `_openssl.c`; il compilatore NDK produce il codice Android. CFFI incorpora i propri header nel C generato tramite [recompiler.py](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/recompiler.py): non serve copiarli a mano nell'NDK.

Nel percorso CLI maturin 1.16.0, `PYO3_PYTHON` da solo non impedisce la discovery: il [resolver](https://github.com/PyO3/maturin/blob/v1.16.0/src/python_interpreter/resolver.rs) sceglie il Python host e [compile.rs](https://github.com/PyO3/maturin/blob/v1.16.0/src/compile.rs) riscrive la variabile. Occorre anche `-i /opt/aca/host-venv/bin/python`. Nel percorso [PEP 517](https://github.com/PyO3/maturin/blob/v1.16.0/maturin/__init__.py) maturin passa già `-i sys.executable`: eseguire il backend nel venv host previsto e conservare CFFI 2.0.0 anche nell'eventuale ambiente isolato. Le due modalità sono alternative, non comandi già avviati.

Con cibuildwheel, `CIBW_ENVIRONMENT` viene valutato prima che `setup_rust` crei `PYO3_CROSS_LIB_DIR`: non ricavare il percorso header espandendo lì anticipatamente quella variabile. Si può passare un percorso assoluto target già predisposto con gli stessi materiali verificati, oppure configurare esternamente il processo dopo la preparazione Android. Un semplice `export` in `CIBW_BEFORE_BUILD` non aggiorna automaticamente l'ambiente padre. Il cablaggio esatto dell'orchestratore resta da provare nell'host definitivo.

## Collegamento e criteri della futura verifica

Con NDK r27, la [documentazione Android](https://developer.android.com/guide/practices/page-sizes), aggiornata il 16 ottobre 2026, indica **entrambi** i flag sul collegamento delle librerie condivise finali: `-Wl,-z,max-page-size=16384` e `-Wl,-z,common-page-size=16384`. Vanno propagati anche al collegamento Rust pertinente; un archivio statico PIC non certifica l'allineamento del DSO risultante. Il solo pin NDK o il flag max presente in CPython non dimostra che tutti i binari e l'APK siano corretti per pagine da 16 KB.

Tutte le verifiche seguenti restano **non eseguite**:

1. Controllare hash dei materiali acquisiti e ABI/API/page size effettive del tablet; congelare host, `pycparser` e restante lock di build.
2. Verificare i comandi C effettivi: `Python.h`/`pyconfig.h` Android, `ffi.h`/`ffitarget.h` target e OpenSSL 3.5.9, senza fallback host. Per cryptography confermare l'arrivo del `CFLAGS_aarch64_linux_android` al compilatore.
3. Ispezionare ELF ARM64, librerie richieste, simboli esportati, allineamento LOAD/RELRO e packaging APK. Confermare il collegamento statico previsto senza dipendenze accidentali da libffi/OpenSSL Linux o provider mancanti.
4. Provare CFFI 2.0.0 con backend 2.0.0, chiamate e callback; verificare caricamento contemporaneo con `_ctypes`/`_ssl`, versione provider e test crittografici della versione fissata. Distinguere test host dai test Android.

Risolvere gli include non dimostra ancora che cryptography compili o si carichi. Rimangono inoltre il supporto embedded escluso da orjson e le altre dipendenze Core già censite: questo documento non dichiara HA funzionante sul M11.

## Materiali identificati e punto di ripresa

| Sorgente | SHA256 pubblicato, non ricalcolato localmente |
|---|---|
| `cffi-2.0.0.tar.gz`, metadati PyPI | `44d1b5909021139fe36001ae048dbdde8214afa20200eda0f64c068cac5d5529` |
| `libffi-3.8.0.tar.gz`, [API della release](https://api.github.com/repos/libffi/libffi/releases/tags/v3.8.0) | `7da3e2d9a171eb0a038f592ecad3ff2bb2550f3496d87b3b29ad0cf4430c0db4` |
| `openssl-3.5.9.tar.gz`, [API della release](https://api.github.com/repos/openssl/openssl/releases/tags/openssl-3.5.9) | `603f5602e2eef00d77fbd429d34dcd5822bb301757a1bc9cdb24c670f1eb859a` |

Versioni richieste e soluzione esterna degli header sono definite nello studio. Il [seguito U11](01-host-linux-build-riproducibile.md) fissa host, pycparser e restante distinta di build: i riferimenti alla selezione ancora aperta nelle fasi U10 precedono quel seguito. Preparazione e prove restano lavori successivi. Nessuna installazione, acquisizione di archivi/binari, compilazione, modifica a sorgenti o configurazioni operative, commit o deploy. Soltanto documentazione e memoria della discussione aggiornate.
