#!/bin/bash
# Build dell'immagine della centrale ACA: HAOS ufficiale + servizio di primo avvio +
# schermata di avvio (REP-20261118-001). Da eseguire in WSL2/Linux con Docker.
# Uso: build.sh <clone di home-assistant/operating-system al tag scelto> [ova|generic_x86_64]
set -euo pipefail

haos=${1:?percorso del clone home-assistant/operating-system}
target=${2:-ova}
here=$(cd "$(dirname "$0")" && pwd)
screen="$here/../ha-app/schermata-avvio"
overlay="$haos/buildroot-external/rootfs-overlay"

[ -d "$overlay" ] || { echo "Clone HAOS non valido: manca $overlay" >&2; exit 1; }
[ -d "$screen/page/design-aca" ] || { echo "Eseguire prima: node progetto/ha-app/schermata-avvio/prepare-page.mjs" >&2; exit 1; }
grep -q $'\r' "$screen/run.sh" && { echo "run.sh ha fine riga CRLF: il container non partirebbe" >&2; exit 1; }

# Servizio di primo avvio e preset di attivazione.
cp -r "$here/overlay/." "$overlay/"
chmod 0755 "$overlay/usr/libexec/aca-firstboot"

# Sorgenti della schermata: copiati in /mnt/data al primo avvio e costruiti dal Supervisor.
rm -rf "$overlay/usr/share/aca/apps/aca_schermata"
mkdir -p "$overlay/usr/share/aca/apps/aca_schermata"
cp -r "$screen/config.yaml" "$screen/Dockerfile" "$screen/run.sh" "$screen/page" "$overlay/usr/share/aca/apps/aca_schermata/"
rm -f "$overlay/usr/share/aca/apps/aca_schermata/page/index.html"
chmod 0755 "$overlay/usr/share/aca/apps/aca_schermata/run.sh"

cd "$haos"
scripts/enter.sh make "$target"
ls -la "$haos/output/images/"
