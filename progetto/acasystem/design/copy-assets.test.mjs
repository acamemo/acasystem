import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { copyDesignAssets } from './copy-assets.mjs';

const filesUnder = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file)); else files.push(file);
  }
  return files;
};

const removeTemporary = async (temporary) => {
  assert.ok(resolve(temporary).startsWith(resolve(tmpdir()) + sep) && basename(temporary).startsWith('aca-shared-design-'));
  await rm(temporary, { recursive: true, force: true });
};

const sourcesInOrder = async (file, ancestors = []) => {
  assert.ok(!ancestors.includes(file), 'Gli import del tema non devono essere ciclici.');
  const css = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const sources = [];
  let position = 0;
  for (const match of css.matchAll(/@import\s+['"]([^'"]+)['"]\s*;/g)) {
    const declarations = css.slice(position, match.index).trim();
    if (declarations) sources.push({ file, declarations });
    sources.push(...await sourcesInOrder(resolve(dirname(file), match[1]), [...ancestors, file]));
    position = match.index + match[0].length;
  }
  const declarations = css.slice(position).trim();
  if (declarations) sources.push({ file, declarations });
  return sources;
};

test('ACA Classico conserva definizioni e ordine precedenti nei suoi ingressi dedicati', async () => {
  const previous = [
    ...await sourcesInOrder(fileURLToPath(new URL('./themes/acasystem/index.css', import.meta.url))),
    ...await sourcesInOrder(fileURLToPath(new URL('./themes/kit2/index.css', import.meta.url))),
  ];
  assert.ok(previous.length > 0);
  for (const entry of ['./themes/classic/index.css', '../frontend/src/themes/classic/index.css']) {
    assert.deepEqual(await sourcesInOrder(fileURLToPath(new URL(entry, import.meta.url))), previous);
  }
});

test('il tema predefinito estende Classico una sola volta e lo shim web usa lo stesso grafo', async () => {
  const classic = await sourcesInOrder(fileURLToPath(new URL('./themes/classic/index.css', import.meta.url)));
  const current = await sourcesInOrder(fileURLToPath(new URL('./index.css', import.meta.url)));
  assert.deepEqual(current.slice(0, classic.length), classic);
  assert.deepEqual(current.slice(classic.length).map(source => relative(fileURLToPath(new URL('./', import.meta.url)), source.file).split(sep).join('/')),
    ['themes/liquid-glass/tokens.css', 'themes/liquid-glass/material.css',
      'themes/glass-white/white.css', 'themes/glass-white/motion.css', 'themes/glass-white/layout.css']);
  assert.deepEqual(await sourcesInOrder(fileURLToPath(new URL('../frontend/src/design/index.css', import.meta.url))), current);
});

test('il design distribuito contiene tutti gli import CSS e font locali, anche in percorsi con spazi', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'aca-shared-design-'));
  try {
    const destination = join(temporary, 'workspace con spazi', 'design-aca');
    await copyDesignAssets(pathToFileURL(destination));
    const files = await filesUnder(destination);
    assert.ok(files.some((file) => basename(file) === 'index.css'));
    assert.ok(files.some((file) => relative(destination, file).split(sep).join('/') === 'themes/classic/index.css'));
    // Copiare integralmente il materiale include anche le sue regole di fallback, senza una seconda specifica CSS nel test.
    for (const entry of ['index.css', 'themes/classic/index.css', 'themes/liquid-glass/index.css', 'themes/liquid-glass/tokens.css', 'themes/liquid-glass/material.css']) {
      assert.deepEqual(await readFile(join(destination, entry)), await readFile(new URL(entry, import.meta.url)));
    }
    assert.ok(files.some((file) => basename(file) === 'LICENSE'));
    const fonts = files.filter((file) => file.endsWith('.woff2'));
    assert.ok(fonts.length > 0, 'I font devono essere locali anche senza rete.');
    for (const file of files.filter((file) => file.endsWith('.css'))) {
      const css = await readFile(file, 'utf8');
      const imports = [...css.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
      const urls = [...css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)].map((match) => match[1]);
      for (const reference of [...imports, ...urls]) {
        if (reference.startsWith('#') || reference.startsWith('data:')) continue;
        assert.doesNotMatch(reference, /^(?:https?:|\/)/, 'Il design distribuito non deve dipendere dalla rete.');
        const target = resolve(dirname(file), reference);
        assert.ok(target.startsWith(resolve(destination) + sep), `${reference} deve restare nel bundle.`);
        assert.ok((await stat(target)).isFile(), `Risorsa mancante: ${reference}`);
      }
    }
    const source = fileURLToPath(new URL('./fonts/', import.meta.url));
    for (const font of fonts) assert.deepEqual(await readFile(font), await readFile(join(source, basename(font))));
  } finally {
    await removeTemporary(temporary);
  }
});

test('una nuova copia rimuove asset obsoleti o rinominati e ricrea quelli mancanti', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'aca-shared-design-'));
  try {
    const destination = join(temporary, 'design-aca');
    const sibling = join(temporary, 'da-conservare.txt');
    await writeFile(sibling, 'fuori dagli asset generati');
    await copyDesignAssets(destination);
    const expected = (await filesUnder(destination)).map((file) => relative(destination, file)).sort();
    await rename(join(destination, 'layout', 'appShell.css'), join(destination, 'layout', 'appShell-prima.css'));
    await rm(join(destination, 'layout', 'pageIndicator.css'));
    await mkdir(join(destination, 'componente-rimosso'), { recursive: true });
    await writeFile(join(destination, 'componente-rimosso', 'stile.css'), '/* vecchio asset */');
    await writeFile(join(destination, 'fonts', 'font-rimosso.woff2'), 'vecchio font');
    await writeFile(join(destination, 'README.md'), 'residuo di una copia precedente');
    await writeFile(join(destination, 'theme-aca-tokens.css'), '/* vecchio nome */');
    await copyDesignAssets(destination);
    assert.deepEqual((await filesUnder(destination)).map((file) => relative(destination, file)).sort(), expected);
    assert.deepEqual(
      await readFile(join(destination, 'layout', 'appShell.css')),
      await readFile(new URL('./layout/appShell.css', import.meta.url))
    );
    assert.equal(await readFile(sibling, 'utf8'), 'fuori dagli asset generati');
  } finally {
    await removeTemporary(temporary);
  }
});

test('la pulizia rifiuta cartelle genitore, fonti e destinazioni non locali prima di modificarle', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'aca-shared-design-'));
  try {
    const marker = join(temporary, 'da-conservare.txt');
    await writeFile(marker, 'conservato');
    await assert.rejects(copyDesignAssets(temporary), /cartella generata design-aca/);
    await assert.rejects(copyDesignAssets(new URL('./design-aca/', import.meta.url)), /separata dalle fonti/);
    await assert.rejects(copyDesignAssets(new URL('https://example.invalid/design-aca/')), /locale/);
    assert.equal(await readFile(marker, 'utf8'), 'conservato');
  } finally {
    await removeTemporary(temporary);
  }
});

test('i collegamenti simbolici non permettono alla pulizia di raggiungere cartelle esterne', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'aca-shared-design-'));
  try {
    const destination = join(temporary, 'design-aca');
    const outside = join(temporary, 'da-conservare');
    const marker = join(outside, 'sentinella.txt');
    await mkdir(outside);
    await writeFile(marker, 'conservato');
    const kind = process.platform === 'win32' ? 'junction' : 'dir';
    await symlink(outside, destination, kind);
    await assert.rejects(copyDesignAssets(destination), /collegamento simbolico/);
    await unlink(destination);
    await mkdir(destination);
    await symlink(outside, join(destination, 'residuo-collegato'), kind);
    await copyDesignAssets(destination);
    assert.equal(await readFile(marker, 'utf8'), 'conservato');
    assert.ok(!(await readdir(destination)).includes('residuo-collegato'));
  } finally {
    await removeTemporary(temporary);
  }
});
