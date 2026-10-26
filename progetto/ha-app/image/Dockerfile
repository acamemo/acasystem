# Acasystem come app di HA OS (REP-20261026-005, S1). Strato sopra l'immagine del banco
# (aca-system:<versione>, progetto/acasystem/Dockerfile): stesso server, più l'avvio che legge
# la configurazione di HA OS. Pubblicata come ghcr.io/acamemo/acasystem:<versione>.
ARG BASE_IMAGE=aca-system:latest
FROM ${BASE_IMAGE}

ARG ACASYSTEM_VERSION
# Versione del pacchetto per HA OS: uguale ad ACASYSTEM_VERSION, oppure <versione>.<revisione>
# quando cambia solo lo strato (run.sh, detect-ha-url.mjs).
ARG APP_VERSION=${ACASYSTEM_VERSION}
# Sul banco la versione arriva dal compose; qui va nell'immagine (/api/health e Sistema).
ENV ACASYSTEM_VERSION=${ACASYSTEM_VERSION}

LABEL io.hass.name="Acasystem" \
      io.hass.version="${APP_VERSION}" \
      io.hass.type="addon" \
      io.hass.arch="amd64" \
      org.opencontainers.image.title="Acasystem" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/acamemo/acasystem-releases" \
      org.opencontainers.image.licenses="GPL-3.0" \
      org.opencontainers.image.vendor="MeMo Srl"

COPY run.sh detect-ha-url.mjs /haos/
RUN chmod 0755 /haos/run.sh

# WORKDIR resta /app/backend dell'immagine di base.
CMD ["/haos/run.sh"]
