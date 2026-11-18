#!/bin/sh
# Schermata di avvio ACA: genera la pagina con l'indirizzo attuale e la mostra a schermo intero.
# Se l'indirizzo cambia, rigenera la pagina e riavvia il kiosk.
set -u
PORT=3002
WEB=/tmp/schermata
export XDG_RUNTIME_DIR=/tmp/xdg WLR_RENDERER=pixman WLR_LIBINPUT_NO_DEVICES=1 LIBGL_ALWAYS_SOFTWARE=1
mkdir -p "$XDG_RUNTIME_DIR" "$WEB" && chmod 0700 "$XDG_RUNTIME_DIR"

current_ip() { ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n1; }

render() {
  ip_addr=$1
  if [ -n "$ip_addr" ]; then url="http://$ip_addr:$PORT/"; state="Collegata"; net="on"; else url=""; state="In attesa"; net="off"; fi
  cp -r /opt/schermata/. "$WEB/"
  if [ -n "$url" ]; then qrencode -t SVG -m 2 -l M -o "$WEB/qr.svg" "$url"; else : > "$WEB/qr.svg"; fi
  sed -e "s|{{URL}}|$url|g" -e "s|{{IP}}|${ip_addr:-—}|g" -e "s|{{STATO}}|$state|g" -e "s|{{RETE}}|$net|g" \
    /opt/schermata/index.template.html > "$WEB/index.html"
}

# Nel container non c'è un terminale virtuale attivo da assegnare: seatd senza legame al VT.
SEATD_VTBOUND=0 seatd -g video >/tmp/seatd.log 2>&1 &
sleep 1
export LIBSEAT_BACKEND=seatd

while true; do
  ip_addr=$(current_ip)
  render "$ip_addr"
  echo "Schermata: indirizzo ${ip_addr:-assente}"
  cage -s -- chromium-browser --ozone-platform=wayland --kiosk --no-sandbox --disable-gpu \
    --noerrdialogs --disable-infobars --no-first-run --lang=it --disable-features=Translate,TranslateUI \
    --disable-background-networking --disable-component-update --disable-sync --disable-default-apps \
    --user-data-dir=/tmp/chromium \
    "file://$WEB/index.html" &
  kiosk=$!
  while kill -0 "$kiosk" 2>/dev/null; do
    sleep 10
    [ "$(current_ip)" != "$ip_addr" ] && { echo "Schermata: indirizzo cambiato"; kill "$kiosk"; wait "$kiosk"; break; }
  done
  sleep 2
done
