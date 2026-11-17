#!/bin/sh
# Materiale candidato: esecuzione solo sull'HAOS identificata, mai sul banco Container.
set -eu
version=''
shell_version=''
apply=false
ack=false
main='9960cdb4_acasystem'
updater='9960cdb4_acasystem_updater'
fail() { printf 'Errore: %s\n' "$*" >&2; exit 1; }
while [ "$#" -gt 0 ]; do
  case "$1" in
    --app-version) [ "$#" -ge 2 ] && [ -z "$version" ] || fail 'Versione mancante/ripetuta'; version=$2; shift 2 ;;
    --shell-version) [ "$#" -ge 2 ] && [ -z "$shell_version" ] || fail 'Shell mancante/ripetuta'; shell_version=$2; shift 2 ;;
    --apply) [ "$apply" = false ] || fail 'Parametro ripetuto'; apply=true; shift ;;
    --ack-manager-docker) [ "$ack" = false ] || fail 'Parametro ripetuto'; ack=true; shift ;;
    *) fail 'Uso: sh prepare-haos-executor.sh --app-version x.y.z.r --shell-version x.y.z [--apply --ack-manager-docker]' ;;
  esac
done
printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(\.[1-9][0-9]{0,2})?$' || fail 'Specificare versione app esatta'
printf '%s' "$shell_version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || fail 'Specificare versione shell qualificata'
if [ "$apply" = false ]; then
  printf 'PIANO: solo HAOS root, main %s e companion %s versione %s.\n' "$main" "$updater" "$version"
  printf 'Companion: manager + Docker API, protection mode OFF da approvare localmente. Nessuna elevazione di ACA.\n'
  printf 'Credenziale unica privata; riavvio della sola ACA e avvio companion; nessuna modifica OS/Core/rete.\n'
  printf 'Nessun comando HA/Docker, download o modifica eseguiti.\n'
  exit 0
fi
[ "$ack" = true ] || fail 'Per applicare serve --ack-manager-docker dopo revisione dei privilegi sul target'
[ "$(id -u)" = 0 ] && grep -Eq '^ID="?haos"?$' /etc/os-release || fail 'Eseguire solo su HAOS host root'
for command in ha docker jq mktemp chmod rm rmdir sleep sha256sum; do command -v "$command" >/dev/null || fail "Strumento mancante: $command"; done
info=$(ha --raw-json apps info "$main") || fail 'ACA assente'
printf '%s' "$info" | jq -e --arg version "$version" '.result == "ok" and .data.version == $version and .data.state == "started"' >/dev/null || fail 'ACA deve essere la versione esatta gia qualificata'
store=$(ha --raw-json store) || fail 'Catalogo non disponibile'
printf '%s' "$store" | jq -e --arg slug "$updater" --arg version "$version" 'any(.data.addons[]?; .slug == $slug and (.version_latest // .version) == $version)' >/dev/null || fail 'Catalogo executor candidato assente o diverso: nessun ripiego stable/bank'
apps=$(ha --raw-json apps) || fail 'Elenco app non disponibile'
if ! printf '%s' "$apps" | jq -e --arg slug "$updater" 'any(.data.addons[]?; .slug == $slug)' >/dev/null; then
  ha apps install "$updater" >/dev/null || fail 'Installazione companion non riuscita'
fi
info=$(ha --raw-json apps info "$updater") || fail 'Companion non disponibile'
printf '%s' "$info" | jq -e --arg version "$version" '.result == "ok" and .data.version == $version and .data.hassio_role == "manager" and .data.docker_api == true and .data.homeassistant_api == false' >/dev/null || fail 'Metadati/privilegi companion differenti'
if ! printf '%s' "$info" | jq -e '.data.protected == false' >/dev/null; then
  printf 'Companion installato ma non avviato. Revisionare e disabilitare Protection mode SOLO su Acasystem updater, poi ripetere.\n'
  exit 2
fi
container_for() {
  for candidate in "app_$1" "addon_$1"; do
    if [ "$(docker inspect --format '{{.State.Running}}' "$candidate" 2>/dev/null)" = true ]; then printf '%s' "$candidate"; return; fi
  done
  return 1
}
main_container=$(container_for "$main") || fail 'Container ACA non identificato'
tool='/haos/executor-tools/progetto/ha-app/pilot/haos-provision.mjs'
if printf '%s' "$info" | jq -e '.data.state == "started"' >/dev/null; then
  docker exec "$main_container" node "$tool" --verify || fail 'Companion gia attivo: verificare localmente senza interrompere aggiornamenti'
  exit 0
fi
docker exec "$main_container" node "$tool" --init --container-name "$main_container" --shell-version "$shell_version" >/dev/null || fail 'Configurazione privata ACA non predisposta'
temporary=$(mktemp -d /tmp/aca-executor-XXXXXX) || fail 'Directory temporanea non disponibile'
chmod 700 "$temporary"
cleanup() { rm -f "$temporary/token" "$temporary/target.json"; rmdir "$temporary" 2>/dev/null || :; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
docker cp "$main_container:/data/update-secret/token" "$temporary/token" >/dev/null
docker cp "$main_container:/data/update-secret/target.json" "$temporary/target.json" >/dev/null
chmod 600 "$temporary/token" "$temporary/target.json"
ha apps start "$updater" >/dev/null || fail 'Avvio companion non riuscito'
updater_container=$(container_for "$updater") || fail 'Container companion non identificato'
target_id=$(jq -er '.targetId' "$temporary/target.json")
token_sha=$(sha256sum "$temporary/token"); token_sha=${token_sha%% *}
docker exec "$updater_container" node "$tool" --check-copy --expected-target "$target_id" --token-sha "$token_sha" >/dev/null || fail 'Configurazione companion differente o parziale: non sovrascritta'
docker cp "$temporary/." "$updater_container:/data/update-secret" >/dev/null || fail 'Trasferimento privato companion non riuscito'
ha apps restart "$main" >/dev/null || fail 'Riavvio ACA non riuscito: mantenere la configurazione per ripresa locale'
attempt=0
while [ "$attempt" -lt 30 ]; do
  main_container=$(container_for "$main") || main_container=''
  if [ -n "$main_container" ] && docker exec "$main_container" node "$tool" --verify 2>/dev/null; then
    printf 'Executor configurato e stato verificato. Abilitare Start on boot SOLO per il companion dopo il collaudo.\n'
    exit 0
  fi
  attempt=$((attempt + 1)); sleep 2
done
fail 'Executor non verificato: nessun successo dichiarato; controllare localmente stato e credenziale senza rigenerarla'
