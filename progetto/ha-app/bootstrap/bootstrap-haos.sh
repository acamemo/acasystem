#!/bin/sh
# Solo bootstrap ACA su HAOS gia installato: nessuna scrittura del sistema/disco.
set -eu

REPOSITORY='https://github.com/acamemo/acasystem-releases'
VERSION='__ACA_VERSION__'
APP_VERSION='__APP_VERSION__'
HAOS_VERSION='__HAOS_VERSION__'
CORE_VERSION='__CORE_VERSION__'
REPOSITORY_ID='9960cdb4'
SLUG="${REPOSITORY_ID}_acasystem"
ip=''
requested_version=''
dry_run=false
fail() { printf 'Errore: %s\n' "$*" >&2; exit 1; }
usage() { printf 'Uso: sh bootstrap-haos.sh --ip <IPv4 privato della centrale> --version %s [--dry-run]\n' "$VERSION"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ip) [ "$#" -ge 2 ] && [ -z "$ip" ] && [ -n "$2" ] || fail 'Parametro --ip mancante o ripetuto'; ip=$2; shift 2 ;;
    --version) [ "$#" -ge 2 ] && [ -z "$requested_version" ] && [ -n "$2" ] || fail 'Parametro --version mancante o ripetuto'; requested_version=$2; shift 2 ;;
    --dry-run) [ "$dry_run" = false ] || fail 'Parametro --dry-run ripetuto'; dry_run=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; fail 'Parametro non riconosciuto' ;;
  esac
done
case "$VERSION:$APP_VERSION:$HAOS_VERSION:$CORE_VERSION" in *__*) fail 'Template non eseguibile: usare i materiali generati per la consegna' ;; esac
[ "$requested_version" = "$VERSION" ] || fail 'La versione richiesta non corrisponde a questi materiali'
case "$ip" in ''|*[!0-9.]*|.*|*.) fail 'Specificare un IPv4 privato valido con --ip' ;; esac
saved_ifs=$IFS; IFS=.; set -- $ip; IFS=$saved_ifs
[ "$#" -eq 4 ] || fail 'Indirizzo IPv4 non valido'
for octet; do
  case "$octet" in ''|*[!0-9]*|????*) fail 'Indirizzo IPv4 non valido' ;; 0) ;; 0*) fail 'Usare IPv4 senza zeri iniziali' ;; esac
  [ "$octet" -le 255 ] || fail 'Indirizzo IPv4 non valido'
done
case "$1.$2" in 10.*|192.168|172.16|172.17|172.18|172.19|172.20|172.21|172.22|172.23|172.24|172.25|172.26|172.27|172.28|172.29|172.30|172.31) ;; *) fail 'Serve un indirizzo della rete privata del mini PC, senza loopback' ;; esac
origin="http://${ip}:3002"

if [ "$dry_run" = true ]; then
  printf 'SIMULAZIONE: nessun comando HA, rete, Docker o modifica eseguiti.\n'
  printf 'Candidati HAOS %s / Core %s, console host root. Repository: %s\nSlug: %s\nACA: %s; app: %s\n' "$HAOS_VERSION" "$CORE_VERSION" "$REPOSITORY" "$SLUG" "$VERSION" "$APP_VERSION"
  printf 'Piano: verifica versioni/catalogo; predispone SonoffLAN 3.13.3 originale; riavvia solo Core se aggiunto; installa/avvia ACA se necessario; verifica health/QR.\nCollegamento previsto: %s/\n' "$origin"
  exit 0
fi

for command in ha jq curl sha1sum docker id grep sleep dirname; do command -v "$command" >/dev/null 2>&1 || fail "Comando necessario assente: $command"; done
script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
[ -f "$script_dir/SonoffLAN-v3.13.3.zip" ] && [ -f "$script_dir/install-sonoff.py" ] || fail 'Materiali SonoffLAN mancanti'
[ "$(id -u)" = 0 ] || fail 'Eseguire dalla console host root di HAOS'
grep -Eq '^ID="?haos"?$' /etc/os-release || fail 'Eseguire sul sistema host HAOS, non dentro un add-on o un PC normale'
checksum=$(printf '%s' "$REPOSITORY" | sha1sum)
case "$checksum" in "$REPOSITORY_ID"*) ;; *) fail 'Identita del repository inattesa' ;; esac

validate_response() { printf '%s' "$1" | jq -e '.result == "ok" and (.data | type == "object")' >/dev/null || fail 'Risposta Supervisor non valida'; }
os_info=$(ha --raw-json os info) || fail 'Stato HAOS non disponibile'
validate_response "$os_info"
[ "$(printf '%s' "$os_info" | jq -r '.data.version // ""')" = "$HAOS_VERSION" ] || fail 'HAOS diverso dalla versione candidata dei materiali; nessun aggiornamento OS automatico'
core_info=$(ha --raw-json core info) || fail 'Stato Core non disponibile'
validate_response "$core_info"
[ "$(printf '%s' "$core_info" | jq -r '.data.version // ""')" = "$CORE_VERSION" ] || fail 'Core diverso dalla versione candidata dei materiali; nessun aggiornamento Core automatico'
store=$(ha --raw-json store) || fail 'Store Supervisor non raggiungibile'
validate_response "$store"
if ! printf '%s' "$store" | jq -e --arg source "$REPOSITORY" 'any(.data.repositories[]?; (.source // .url) == $source)' >/dev/null; then
  printf 'Aggiunta del repository ufficiale ACA...\n'
  ha store add "$REPOSITORY" >/dev/null || fail 'Aggiunta repository non riuscita'
fi
ha store reload >/dev/null || fail 'Aggiornamento catalogo non riuscito'
store=$(ha --raw-json store) || fail 'Lettura catalogo non riuscita'
validate_response "$store"
available=$(printf '%s' "$store" | jq -r --arg slug "$SLUG" '[.data.addons[]? | select(.slug == $slug) | if has("version_latest") then .version_latest else .version end][0] // ""')
[ "$available" = "$APP_VERSION" ] || fail 'Il catalogo non offre la versione app richiesta: pubblicare prima repository e immagine corretti'

apps=$(ha --raw-json apps) || fail 'Lettura app installate non riuscita'
validate_response "$apps"
installed=$(printf '%s' "$apps" | jq -r --arg slug "$SLUG" '[.data.addons[]? | select(.slug == $slug) | .version][0] // ""')
if [ -n "$installed" ] && [ "$installed" != "$APP_VERSION" ]; then
  fail 'Una versione diversa di ACA e gia installata: nessun aggiornamento, avvio o ripristino automatico eseguiti'
fi

# Il Python di Core verifica lo ZIP prima di aggiungere solo custom_components/sonoff.
# Nessuna lettura di account, config entries o credenziali eWeLink.
guest_temp=$(docker exec homeassistant python -c 'import tempfile; print(tempfile.mkdtemp(prefix="aca-bootstrap-"))') || fail 'Core non pronto per la predisposizione SonoffLAN'
case "$guest_temp" in /tmp/aca-bootstrap-*) ;; *) fail 'Directory temporanea Core inattesa' ;; esac
cleanup() { docker exec homeassistant python -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$guest_temp" >/dev/null 2>&1 || :; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
# /tmp di Core e tmpfs: il trasferimento deve scrivere nel mount del processo.
docker exec -i homeassistant python -c '
import hashlib, sys, tempfile
from pathlib import Path
target = Path(sys.argv[1])
parent = target.parent
if target.name != "sonoff.zip" or not parent.name.startswith("aca-bootstrap-") or parent.is_symlink() or parent.parent.resolve() != Path(tempfile.gettempdir()).resolve():
    raise ValueError("Directory temporanea Core inattesa")
data = sys.stdin.buffer.read(2 * 1024 * 1024 + 1)
if len(data) > 2 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != "f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532":
    raise ValueError("Archivio SonoffLAN rifiutato")
with target.open("xb") as archive:
    archive.write(data)
' "$guest_temp/sonoff.zip" < "$script_dir/SonoffLAN-v3.13.3.zip" || fail 'Trasferimento archivio SonoffLAN non riuscito'
sonoff_state=$(docker exec -i homeassistant python - "$guest_temp/sonoff.zip" < "$script_dir/install-sonoff.py") || fail 'Predisposizione SonoffLAN rifiutata; nessuna sovrascrittura di componenti differenti'
case "$sonoff_state" in
  installed) ha core restart >/dev/null || fail 'SonoffLAN predisposto; riavvio Core non riuscito, ripetere dopo verifica' ;;
  unchanged) ;;
  *) fail 'Esito SonoffLAN inatteso' ;;
esac
if [ -z "$installed" ]; then
  printf 'Installazione ACA %s...\n' "$VERSION"
  ha apps install "$SLUG" >/dev/null || fail 'Installazione ACA non riuscita'
fi
info=$(ha --raw-json apps info "$SLUG") || fail 'Lettura ACA installata non riuscita'
validate_response "$info"
[ "$(printf '%s' "$info" | jq -r '.data.version // ""')" = "$APP_VERSION" ] || fail 'Versione installata diversa da quella richiesta'
if [ "$(printf '%s' "$info" | jq -r '.data.state // ""')" != started ]; then
  ha apps start "$SLUG" >/dev/null || fail 'Avvio ACA non riuscito'
fi

printf 'Attesa di ACA sulla rete locale...\n'
attempt=0
ready=false
while [ "$attempt" -lt 30 ]; do
  if health=$(curl -fsS --max-time 5 "$origin/api/health" 2>/dev/null) && printf '%s' "$health" | jq -e --arg version "$VERSION" '.status == "ok" and .version == $version' >/dev/null 2>&1; then ready=true; break; fi
  attempt=$((attempt + 1))
  [ "$attempt" -ge 30 ] || sleep 2
done
[ "$ready" = true ] || fail 'ACA non risponde con la versione richiesta: controllare stato/rete e ripetere la procedura'
container=''
for candidate in "app_${SLUG}" "addon_${SLUG}"; do
  if [ "$(docker inspect --format '{{.State.Running}}' "$candidate" 2>/dev/null)" = true ]; then container=$candidate; break; fi
done
[ -n "$container" ] || fail 'Nessun container ACA attivo: controllare lo stato e ripetere la procedura'
docker exec "$container" node /haos/show-connection.mjs "$origin/" || fail 'QR non disponibile nell immagine ACA; la procedura non e completata'
printf 'ACA %s pronta. Aprire il collegamento per configurare la casa o accedere.\n' "$VERSION"
