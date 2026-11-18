ARG BUILD_FROM=alpine:3.22
FROM ${BUILD_FROM}
# Kiosk Wayland (cage) con rendering software, Chromium a schermo intero, QR generato in locale.
# Alpine 3.22 non offre browser WPE (cog): si usa Chromium.
RUN apk add --no-cache cage chromium seatd mesa-egl mesa-gbm mesa-dri-gallium font-dejavu libqrencode-tools iproute2
COPY run.sh /run.sh
COPY page/ /opt/schermata/
RUN chmod 0755 /run.sh
CMD ["/run.sh"]
