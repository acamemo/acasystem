import { request } from 'node:http';

const repository = 'ghcr.io/acamemo/acasystem';
const digest = /^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/;
const imageId = /^sha256:[a-f0-9]{64}$/;
const version = /^\d+\.\d+\.\d+(\.\d+)?$/;
const fail = () => { throw new Error('Prova immagine ACA non disponibile'); };

/**
 * Docker Engine HTTP sul socket dell'executor esterno gia autorizzato: non abilita
 * docker_api nell'app ACA e non crea, elimina o avvia container. Nessuna credenziale
 * registry o risposta inspect (che puo contenere env sensibili) entra nei risultati.
 * Fonti consultate 2026-11-16:
 * https://docs.docker.com/reference/api/engine/version/v1.45/
 * https://raw.githubusercontent.com/home-assistant/supervisor/main/supervisor/docker/app.py
 * https://raw.githubusercontent.com/home-assistant/supervisor/main/supervisor/docker/interface.py
 */
export function createSupervisorImageAuthority({ slug, containerName, socketPath = '/var/run/docker.sock', timeoutMs = 120000 } = {}) {
  if (!/^[a-z0-9][a-z0-9_-]{1,99}$/.test(slug ?? '') ||
    ![`addon_${slug}`, `app_${slug}`].includes(containerName) || typeof socketPath !== 'string' || !socketPath ||
    (!socketPath.startsWith('/') && !socketPath.startsWith('\\\\.\\pipe\\'))) fail();
  const call = (path, method = 'GET', allowMissing = false) => new Promise((resolve, reject) => {
    const error = () => reject(new Error('Docker Engine ACA non disponibile'));
    const req = request({ socketPath, path: '/v1.45' + path, method, signal: AbortSignal.timeout(timeoutMs) }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) { response.destroy(); error(); } else chunks.push(chunk);
      });
      response.on('error', error);
      response.on('end', () => {
        if (response.statusCode === 404 && allowMissing) { resolve(null); return; }
        if (response.statusCode < 200 || response.statusCode >= 300) { error(); return; }
        const text = Buffer.concat(chunks).toString('utf8');
        if (method === 'POST' && path.startsWith('/images/create?')) {
          try {
            for (const line of text.split('\n').filter(Boolean)) {
              const event = JSON.parse(line); if (event.error || event.errorDetail) { error(); return; }
            }
            resolve({});
          } catch { error(); }
        } else {
          try { resolve(text ? JSON.parse(text) : {}); } catch { error(); }
        }
      });
    });
    req.on('error', error);
    req.setTimeout(timeoutMs, () => { req.destroy(); error(); });
    req.end();
  });
  const checkedSlug = value => { if (value !== slug) fail(); };
  const checkedImage = (value, appVersion) => {
    const labels = value?.Config?.Labels;
    if (!imageId.test(value?.Id ?? '') || !['addon', 'app'].includes(labels?.['io.hass.type']) ||
      labels?.['io.hass.name'] !== 'Acasystem' || !version.test(labels?.['io.hass.version'] ?? '') ||
      (appVersion && labels['io.hass.version'] !== appVersion) || value.Os !== 'linux' || value.Architecture !== 'amd64') fail();
    const refs = [...new Set((value.RepoDigests ?? []).filter(ref => digest.test(ref)))];
    if (refs.length !== 1) fail();
    return { image: refs[0], id: value.Id, appVersion: labels['io.hass.version'] };
  };
  const inspectImage = async (ref, appVersion) => checkedImage(await call(`/images/${encodeURIComponent(ref)}/json`), appVersion);
  const inspectContainer = async () => {
    const value = await call(`/containers/${encodeURIComponent(containerName)}/json`, 'GET', true);
    if (!value) return null;
    const labels = value.Config?.Labels;
    if (value.Name !== '/' + containerName || !imageId.test(value.Image ?? '') ||
      !['addon', 'app'].includes(labels?.['io.hass.type']) || labels?.['io.hass.name'] !== 'Acasystem' ||
      !version.test(labels?.['io.hass.version'] ?? '') ||
      value.Config.Image !== `${repository}:${labels['io.hass.version']}`) fail();
    const result = await inspectImage(value.Image, labels['io.hass.version']);
    if (result.id !== value.Image) fail();
    return { ...result, running: value.State?.Running === true };
  };
  const pull = async (ref, appVersion) => {
    if (!digest.test(ref)) fail();
    await call(`/images/create?fromImage=${encodeURIComponent(ref)}`, 'POST');
    const result = await inspectImage(ref, appVersion);
    if (result.image !== ref) fail(); return result;
  };
  const tag = async (id, repo, name) => {
    await call(`/images/${encodeURIComponent(id)}/tag?repo=${encodeURIComponent(repo)}&tag=${encodeURIComponent(name)}`, 'POST');
  };
  const retained = async (expected, appVersion) => {
    if (!digest.test(expected)) fail();
    const ref = `aca-updater-cache:${expected.split(':').at(-1)}`;
    // Il tag separato protegge l'immagine dalla cleanup delle versioni ACA dello Supervisor.
    let result;
    try { result = await inspectImage(ref, appVersion); } catch { result = await pull(expected, appVersion); }
    if (result.image !== expected) fail();
    await tag(result.id, 'aca-updater-cache', expected.split(':').at(-1));
    const verified = await inspectImage(ref, appVersion);
    if (verified.id !== result.id || verified.image !== expected) fail();
    return verified;
  };
  return {
    inspect: async ({ slug: target, appVersion } = {}) => {
      checkedSlug(target);
      const container = await inspectContainer();
      if (container) {
        if (appVersion && container.appVersion !== appVersion) fail();
        return { image: container.image, running: container.running };
      }
      // Stop/update Supervisor rimuovono il container: prima di start si osserva
      // il tag che verra eseguito, comprese le label dell'immagine effettiva.
      if (!version.test(appVersion ?? '')) fail();
      return { image: (await inspectImage(`${repository}:${appVersion}`, appVersion)).image, running: false };
    },
    stage: async ({ slug: target, before, candidate } = {}) => {
      checkedSlug(target);
      if (!version.test(before?.appVersion ?? '') || !version.test(candidate?.appVersion ?? '') ||
        !digest.test(before?.image ?? '') || !digest.test(candidate?.image ?? '')) fail();
      const container = await inspectContainer();
      if (!container?.running || container.image !== before.image || container.appVersion !== before.appVersion) fail();
      await retained(before.image, before.appVersion);
      const next = await pull(candidate.image, candidate.appVersion);
      await tag(next.id, 'aca-updater-cache', candidate.image.split(':').at(-1));
      const current = await inspectContainer();
      if (!current?.running || current.id !== container.id || current.image !== before.image) fail();
      // Disponibilita di entrambe le immagini, NON garanzia d'immutabilita del tag
      // remoto: dopo restore la digest va ancora verificata prima di start.
      return { exactRollback: true, previousImage: before.image, candidateImage: candidate.image };
    },
    prepareRollback: async ({ slug: target, appVersion, image } = {}) => {
      checkedSlug(target);
      if (!version.test(appVersion ?? '') || !digest.test(image ?? '')) fail();
      const container = await inspectContainer(); if (container?.running) fail();
      const previous = await retained(image, appVersion);
      await tag(previous.id, repository, appVersion);
      const verified = await inspectImage(`${repository}:${appVersion}`, appVersion);
      if (verified.id !== previous.id || verified.image !== image) fail();
    },
  };
}
