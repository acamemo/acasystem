#!/bin/sh
# Avvio di Acasystem come app di HA OS (REP-20261026-005, S1). Il Supervisor monta la cartella
# dell'app in /data e scrive /data/options.json: senza quel file (banco Docker) parte come prima.
set -e

if [ -f /data/options.json ]; then
  # Dati in /data/app; il segreto dell'utente di servizio (ADR-0022) fuori da DATA_DIR,
  # in /data/service-secret, escluso dai backup di HA (backup_exclude in config.yaml).
  export DATA_DIR=/data/app
  export TUNET_SERVICE_SECRET_FILE="${TUNET_SERVICE_SECRET_FILE:-/data/service-secret/service-identity.json}"
  export TUNET_ENCRYPTION_MODE="${TUNET_ENCRYPTION_MODE:-off}"
  if [ -z "${TUNET_INTERNAL_HA_URL}" ]; then
    # La porta di HA cambia da impianto a impianto (80 o 8123): la dice il Supervisor.
    TUNET_INTERNAL_HA_URL="$(node /haos/detect-ha-url.mjs)"
    export TUNET_INTERNAL_HA_URL
  fi
  mkdir -p "${DATA_DIR}" "$(dirname "${TUNET_SERVICE_SECRET_FILE}")"
  echo "[acasystem] app di HA OS ${ACASYSTEM_VERSION}: dati in ${DATA_DIR}, Home Assistant su ${TUNET_INTERNAL_HA_URL}"
fi

exec node src/server.ts
