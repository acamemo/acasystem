import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseDistribution, selectUpdate } from './update-policy.mjs';

const terminal = new Set(['complete', 'rolled-back', 'cancelled', 'deferred']);
const phases = new Set(['prepared', 'draining', 'backing-up', 'backed-up', 'installing', 'verifying', 'restoring', 'committed', ...terminal]);
const validBackup = (backup, before) => backup && /^[A-Za-z0-9-]{1,100}$/.test(backup.id ?? '') &&
  /^[a-f0-9]{64}$/.test(backup.sha256 ?? '') && typeof backup.image === 'string' &&
  (/^ghcr\.io\/acamemo\/acasystem@sha256:[a-f0-9]{64}$/.test(backup.image) ||
    (before?.runtime === 'container' && /^sha256:[a-f0-9]{64}$/.test(backup.image)));

/**
 * Coordinatore esterno al processo sostituito. L'adapter deve offrire mutua esclusione
 * rilasciata dal sistema alla morte del processo, drain persistente, backup freddo verificato,
 * installazione esatta, verifica bundle/digest e ripristino immagine+dati. Nessun adapter
 * permissivo di default: questa logica non puo essere chiamata per aggiornare il banco
 * passando soltanto un IP. Il journal contiene esclusivamente metadati tecnici.
 */
export async function runUpdateTransaction({ directory, targetId, channel, publication, adapter }) {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(targetId)) throw new Error('Identita target non valida');
  const release = await adapter.acquire();
  if (!release) return { action: 'deferred', reason: 'another-update-running' };
  let journal;
  let trustedJournal = false;
  let restorationAttempted = false;
  let terminalFromDisk = false;
  const path = join(directory, 'update-journal.json');
  const save = async (phase, extra = {}) => {
    const next = { ...journal, ...extra, phase, updatedAt: new Date().toISOString() };
    const temp = join(directory, `.journal-${randomUUID()}.tmp`);
    const file = await open(temp, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(next) + '\n'); await file.sync(); } finally { await file.close(); }
    await rename(temp, path);
    // Il checkpoint e durevole prima della successiva mutazione. POSIX consente fsync directory.
    if (process.platform !== 'win32') {
      const parent = await open(directory, 'r');
      try { await parent.sync(); } finally { await parent.close(); }
    }
    journal = next;
  };
  const restore = async () => {
    restorationAttempted = true;
    if (!validBackup(journal.backup, journal.before)) throw new Error('Backup di recupero non valido');
    await adapter.assertTarget(targetId);
    await save('restoring');
    await adapter.restore(journal.backup, journal.before);
    if (!await adapter.verifyRestored(journal.before, journal.backup)) throw new Error('Ripristino non verificato');
    // Dopo il checkpoint non si ripristina piu quel DB: potrebbero arrivare nuove scritture.
    await save('rolled-back');
    await adapter.resume({ transactionId: journal.transactionId });
    return { action: 'rolled-back', version: journal.before.version };
  };
  try {
    await mkdir(directory, { recursive: true });
    await adapter.assertTarget(targetId);
    try { journal = JSON.parse(await readFile(path, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (journal) {
      if (journal.schema !== 1 || journal.targetId !== targetId || !phases.has(journal.phase) ||
        !parseDistribution(journal.publication) || !journal.before) throw new Error('Journal non valido per questo target');
      // Convalida versioni/canale prima di permettere qualsiasi ripristino.
      selectUpdate(journal.before, [], channel);
      trustedJournal = true;
      terminalFromDisk = terminal.has(journal.phase);
      if (journal.phase === 'committed') {
        if (!await adapter.verifyInstalled(journal.publication, { transactionId: journal.transactionId, committed: true, before: journal.before })) throw new Error('Versione gia commessa non verificata');
        await adapter.resume({ transactionId: journal.transactionId }); await save('complete');
        return { action: 'updated', version: journal.publication.version, recovered: true };
      }
      if (['installing', 'verifying', 'restoring'].includes(journal.phase)) return await restore();
      if (!terminal.has(journal.phase)) {
        // Install non era stato chiamato: riattivare la versione originaria, senza restore.
        if (!await adapter.verifyUnchanged(journal.before, { transactionId: journal.transactionId })) throw new Error('Stato precedente non verificato');
        await adapter.resume({ transactionId: journal.transactionId }); await save('cancelled');
        return { action: 'recovered-before-install', version: journal.before.version };
      }
      // Un crash tra checkpoint terminale e resume non perde le nuove scritture.
      if (['rolled-back', 'cancelled', 'deferred', 'complete'].includes(journal.phase)) await adapter.resume({ transactionId: journal.transactionId });
    }
    const before = await adapter.inspect();
    const candidate = parseDistribution(publication?.distribution);
    if (!candidate || selectUpdate(before, [publication], channel).action !== 'available') return { action: 'keep', reason: 'no-compatible-newer-publication' };
    if (journal?.phase === 'rolled-back' && journal.publication.tag === candidate.tag) return { action: 'keep', reason: 'publication-already-failed' };
    // Download/verifica/capienza/cache dell'immagine precedente mentre ACA e ancora disponibile.
    try { await adapter.stage(candidate, before); }
    catch { return { action: 'deferred', reason: 'publication-not-ready' }; }
    terminalFromDisk = false;
    journal = { schema: 1, targetId, transactionId: randomUUID(), before, publication: candidate, backup: null };
    trustedJournal = true;
    await save('prepared');
    await save('draining');
    if (!await adapter.drain({ transactionId: journal.transactionId })) { await save('deferred'); await adapter.resume({ transactionId: journal.transactionId }); return { action: 'deferred', reason: 'active-users-or-commands' }; }
    await adapter.assertTarget(targetId);
    await save('backing-up');
    const backup = await adapter.backup(before);
    if (!validBackup(backup, before) || !await adapter.verifyBackup(backup, before)) throw new Error('Backup non verificato');
    await save('backed-up', { backup });
    await adapter.assertTarget(targetId);
    await save('installing');
    await adapter.install(candidate);
    await save('verifying');
    if (!await adapter.verifyInstalled(candidate, { transactionId: journal.transactionId, before: journal.before })) throw new Error('Aggiornamento non verificato');
    await save('committed');
    await adapter.resume({ transactionId: journal.transactionId });
    await save('complete');
    return { action: 'updated', version: candidate.version };
  } catch {
    // Mai riportare errori degli adapter: possono includere percorsi privati o credenziali.
    if (!restorationAttempted && trustedJournal && journal?.targetId === targetId && ['installing', 'verifying', 'restoring'].includes(journal.phase)) {
      try { return await restore(); } catch { return { action: 'recovery-required', phase: journal.phase }; }
    }
    if (trustedJournal && journal && ['prepared', 'draining', 'backing-up', 'backed-up'].includes(journal.phase)) {
      try {
        await adapter.assertTarget(targetId);
        if (!await adapter.verifyUnchanged(journal.before, { transactionId: journal.transactionId })) throw new Error('Stato non verificato');
        await save('cancelled'); await adapter.resume({ transactionId: journal.transactionId });
      } catch { return { action: 'recovery-required', phase: journal.phase }; }
    }
    // Al boot ACA puo arrivare dopo il companion. Un journal storico gia terminale
    // non trasforma il prerequisito assente in un nuovo recupero transazionale fallito.
    return { action: 'recovery-required', phase: terminalFromDisk ? 'preflight' : journal?.phase ?? 'preflight' };
  } finally { await release(); }
}
