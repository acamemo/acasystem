#!/bin/sh
# Crea l'immagine della chiavetta d'installazione della centrale ACA (REP-20261118-001):
# Alpine standard (avvio UEFI) + installatore + immagine HAOS ACA generic_x86_64 compressa.
# Gira in un container Alpine, senza privilegi:
#   docker run --rm -v <cartella>:/w -v <questa cartella>:/src:ro alpine:3.22 sh /src/build-chiavetta.sh \
#     /w/alpine-iso /w/haos_generic-x86-64-18.4.img.xz /w/aca-chiavetta.img
# <alpine-iso> e il contenuto estratto della ISO alpine-standard x86_64 verificata con la sua impronta.
set -eu
iso=${1:?cartella con la ISO Alpine estratta}
haos=${2:?immagine HAOS ACA .img.xz}
out=${3:?file di uscita .img}
src=$(cd "$(dirname "$0")" && pwd)
apk add -q sfdisk dosfstools mtools xz tar >/dev/null

lav=$(mktemp -d)
trap 'rm -rf "$lav"' EXIT

# Impronta e dimensione dell'immagine decompressa: l'installatore rilegge il disco e le confronta.
echo "Impronta dell'immagine HAOS..."
dimensione=$(xz -dc "$haos" | wc -c)
impronta=$(xz -dc "$haos" | sha256sum | cut -d' ' -f1)
echo "$impronta $dimensione" > "$lav/aca-centrale.img.sha256"

# Overlay Alpine: servizi minimi di avvio e installatore eseguito dal servizio local.
mkdir -p "$lav/ovl"
cp -r "$src/ovl/." "$lav/ovl/"
chmod 0755 "$lav/ovl/etc/local.d/aca-install.start"
mkdir -p "$lav/ovl/etc/runlevels/sysinit" "$lav/ovl/etc/runlevels/boot" "$lav/ovl/etc/runlevels/default" "$lav/ovl/etc/runlevels/shutdown" "$lav/ovl/etc/apk"
for s in devfs dmesg mdev hwdrivers modloop; do ln -sf "/etc/init.d/$s" "$lav/ovl/etc/runlevels/sysinit/$s"; done
for s in hwclock modules sysctl hostname bootmisc; do ln -sf "/etc/init.d/$s" "$lav/ovl/etc/runlevels/boot/$s"; done
for s in mount-ro killprocs savecache; do ln -sf "/etc/init.d/$s" "$lav/ovl/etc/runlevels/shutdown/$s"; done
ln -sf /etc/init.d/local "$lav/ovl/etc/runlevels/default/local"
echo alpine-base > "$lav/ovl/etc/apk/world"
echo aca-installer > "$lav/ovl/etc/hostname"
tar --owner=0 --group=0 --numeric-owner -czf "$lav/aca.apkovl.tar.gz" -C "$lav/ovl" etc

cat > "$lav/grub.cfg" <<'EOF'
set timeout=1
menuentry "Installazione centrale ACA" {
linux	/boot/vmlinuz-lts modules=loop,squashfs,sd-mod,usb-storage quiet
initrd	/boot/initramfs-lts
}
EOF

# Partizione FAT32 di sistema EFI con i file della ISO, l'overlay e l'immagine della centrale.
kib=$(( ( $(du -sk "$iso" | cut -f1) + $(du -k "$haos" | cut -f1) ) * 105 / 100 + 65536 ))
mkfs.vfat -F 32 -n ACA_CENTR -C "$lav/part.img" "$kib" >/dev/null
export MTOOLS_SKIP_CHECK=1
mcopy -s -i "$lav/part.img" "$iso/boot" "$iso/efi" "$iso/apks" "$iso/.alpine-release" ::/
mcopy -o -i "$lav/part.img" "$lav/grub.cfg" ::/boot/grub/grub.cfg
mcopy -i "$lav/part.img" "$lav/aca.apkovl.tar.gz" ::/
mmd -i "$lav/part.img" ::/centrale
mcopy -i "$lav/part.img" "$haos" ::/centrale/aca-centrale.img.xz
mcopy -i "$lav/part.img" "$lav/aca-centrale.img.sha256" ::/centrale/

# Disco GPT: 1 MiB iniziale, partizione EFI, 1 MiB finale per la GPT di riserva.
settori=$(( kib * 2 ))
rm -f "$out"
truncate -s $(( (2048 + settori + 2048) * 512 )) "$out"
printf 'label: gpt\nstart=2048, size=%s, type=uefi, name="ACA installazione"\n' "$settori" | sfdisk -q "$out"
dd if="$lav/part.img" of="$out" bs=1M seek=1 conv=notrunc 2>/dev/null
(cd "$(dirname "$out")" && sha256sum "$(basename "$out")") | tee "$out.sha256"
ls -la "$out"
