#!/bin/bash
# Build dell'immagine della centrale ACA: HAOS ufficiale + servizio di primo avvio +
# schermata di avvio (REP-20261118-001). Da eseguire in WSL2/Linux con Docker.
# Uso: build.sh <clone di home-assistant/operating-system al tag scelto> [ova|generic_x86_64] [cartella di output]
# Ogni formato usa una cartella di output distinta nel clone (default output, output-generic_x86_64...):
# Buildroot non supporta il cambio di destinazione nella stessa cartella senza distclean.
set -euo pipefail

haos=${1:?percorso del clone home-assistant/operating-system}
target=${2:-ova}
if [ "$target" = ova ]; then out=${3:-output}; else out=${3:-output-$target}; fi
here=$(cd "$(dirname "$0")" && pwd)
screen="$here/../ha-app/schermata-avvio"
overlay="$haos/buildroot-external/rootfs-overlay"

[ -d "$overlay" ] || { echo "Clone HAOS non valido: manca $overlay" >&2; exit 1; }
[ -d "$screen/page/design-aca" ] || { echo "Eseguire prima: node progetto/ha-app/schermata-avvio/prepare-page.mjs" >&2; exit 1; }
grep -q $'\r' "$screen/run.sh" && { echo "run.sh ha fine riga CRLF: il container non partirebbe" >&2; exit 1; }

# Servizio di primo avvio e preset di attivazione.
cp -r "$here/overlay/." "$overlay/"
chmod 0755 "$overlay/usr/libexec/aca-firstboot"

# Sorgenti della schermata: messi nella partizione dati dell'immagine, dove il Supervisor
# cerca le app locali (supervisor/apps/local). La partizione di sistema da 256 MiB non ha
# spazio sufficiente nel formato generic_x86_64 (superata di circa 0,6 MB il 2026-11-18).
rm -rf "$overlay/usr/share/aca" "$haos/$out/target/usr/share/aca"
rm -rf "$haos/aca-data"
mkdir -p "$haos/aca-data/supervisor/apps/local/aca_schermata"
cp -r "$screen/config.yaml" "$screen/Dockerfile" "$screen/run.sh" "$screen/page" "$haos/aca-data/supervisor/apps/local/aca_schermata/"
rm -f "$haos/aca-data/supervisor/apps/local/aca_schermata/page/index.html"
chmod 0755 "$haos/aca-data/supervisor/apps/local/aca_schermata/run.sh"

# Aggancio allo script ufficiale della partizione dati: copia aca-data prima dello smontaggio.
datascript="$haos/buildroot-external/package/hassio/create-data-partition.sh"
if ! grep -q 'aca-data' "$datascript"; then
  aggancio='# ACA (REP-20261118-001): app locali della centrale
if [ -d /build/aca-data ]; then cp -a /build/aca-data/. "${data_dir}/"; chown -R root:root "${data_dir}/supervisor/apps"; fi
'
  awk -v add="$aggancio" '/^# Persist build-time updater channel$/ { print add } { print }' "$datascript" > "$datascript.aca"
  cat "$datascript.aca" > "$datascript" && rm -f "$datascript.aca"
fi
grep -q 'aca-data' "$datascript" || { echo "Aggancio alla partizione dati non applicato" >&2; exit 1; }
# La partizione dati va rigenerata a ogni build per includere la schermata aggiornata.
rm -f "$haos/$out"/build/hassio-*/.stamp_images_installed

# generic_x86_64: il sistema compilato qui supera di circa 49 KB la partizione da 256 MiB anche
# senza file ACA (2026-11-18). La deduplicazione EROFS comprime una sola volta i blocchi identici
# (firmware ripetuti): stesso contenuto, nessun file tolto.
defconfig="$haos/buildroot-external/configs/${target}_defconfig"
if [ "$target" = generic_x86_64 ] && ! grep -q '^BR2_TARGET_ROOTFS_EROFS_DEDUPE=y' "$defconfig"; then
  echo 'BR2_TARGET_ROOTFS_EROFS_DEDUPE=y' >> "$defconfig"
fi

# generic_x86_64: la schermata (cage) richiede un dispositivo DRM. Il kernel generic ha solo i
# driver Intel/AMD; si aggiunge lo schermo UEFI come DRM (simpledrm), come nel kernel ova di HAOS,
# per le schede video senza driver e per la prova in VirtualBox (2026-11-19).
kconfig="$haos/buildroot-external/board/pc/generic-x86-64/kernel.config"
if [ "$target" = generic_x86_64 ] && ! grep -q '^CONFIG_DRM_SIMPLEDRM=y' "$kconfig"; then
  printf '
# ACA (REP-20261118-001): schermo UEFI come DRM per la schermata di avvio
CONFIG_SYSFB_SIMPLEFB=y
CONFIG_DRM_SIMPLEDRM=y
' >> "$kconfig"
  for d in "$haos/$out"/build/linux-[0-9]*; do
    [ -d "$d" ] && rm -f "$d"/.stamp_configured "$d"/.stamp_kconfig_fixup_done "$d"/.stamp_built "$d"/.stamp_target_installed "$d"/.stamp_images_installed
  done
fi

cd "$haos"
scripts/enter.sh make O="$out" "$target"
ls -la "$haos/$out/images/"
