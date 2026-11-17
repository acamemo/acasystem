"""Eseguito da bootstrap nell'ambiente Python di Core; nessun login o modifica .storage."""
import hashlib
import json
import shutil
import stat
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

VERSION = "3.13.3"
SHA256 = "f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532"
PREFIX = f"SonoffLAN-{VERSION}/custom_components/sonoff/"


def install(archive, config=Path("/config"), expected_sha256=SHA256):
    if hashlib.sha256(archive.read_bytes()).hexdigest() != expected_sha256:
        raise ValueError("SHA-256 SonoffLAN errato")
    files = {}
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            path = PurePosixPath(entry.orig_filename)
            if path.is_absolute() or ".." in path.parts or "\\" in entry.orig_filename:
                raise ValueError("Percorso ZIP non valido")
            if stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError("Link ZIP non consentito")
            if entry.is_dir() or not entry.filename.startswith(PREFIX):
                continue
            name = entry.filename[len(PREFIX):]
            if not name or name in files or entry.file_size > 4 * 1024 * 1024:
                raise ValueError("Voce ZIP duplicata o troppo grande")
            files[name] = source.read(entry)
    manifest = json.loads(files.get("manifest.json", b"{}"))
    if manifest.get("domain") != "sonoff" or manifest.get("version") != VERSION or not files.get("__init__.py"):
        raise ValueError("Componente SonoffLAN non valido")
    if not config.is_dir() or config.is_symlink():
        raise ValueError("Directory config non valida")
    parent = config / "custom_components"
    if parent.is_symlink():
        raise ValueError("custom_components non deve essere un link")
    target = parent / "sonoff"
    if target.is_symlink():
        raise ValueError("sonoff non deve essere un link")
    if target.exists():
        actual = {}
        for path in target.rglob("*"):
            if path.is_symlink():
                raise ValueError("Componente esistente contiene link")
            relative = path.relative_to(target).as_posix()
            if "__pycache__" not in path.relative_to(target).parts and path.is_file():
                actual[relative] = path.read_bytes()
        if actual != files:
            raise ValueError("Sonoff esistente differente: nessuna sovrascrittura automatica")
        return "unchanged"
    parent.mkdir(exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".aca-sonoff-", dir=parent))
    try:
        for name, data in files.items():
            path = staging / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        staging.rename(target)
    finally:
        if staging.exists():
            shutil.rmtree(staging)
    return "installed"


if __name__ == "__main__":
    try:
        print(install(Path(sys.argv[1])))
    except (ValueError, OSError, zipfile.BadZipFile, KeyError, IndexError):
        # Nessun contenuto di configurazione o credenziale nei messaggi di errore.
        sys.exit("Installazione SonoffLAN rifiutata; controllare archivio e componente esistente")
