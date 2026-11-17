import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { _electron as electron } from 'playwright-core';

// Solo HTML/CSS: runtime Electron esistente, pagina senza JavaScript, nessun main ACA o motore VM.
const evidence = resolve('.tmp/e2e/shell-layout');
await mkdir(evidence, { recursive: true });
const source = await readFile('generated-shell/index.html', 'utf8');
const renderShell = (source, assets) =>
  source
    .replace('data-view="loading"', 'data-view="wizard"')
    .replace(
      'href="shell.css"',
      `href="${pathToFileURL(join(assets, 'shell.css')).href}"`,
    )
    .replace(
      'src="icon.png"',
      `src="${pathToFileURL(join(assets, 'icon.png')).href}"`,
    )
    .replace(
      '</body>',
      '<script>window.acaPageScriptExecuted = true;</script></body>',
    );
const pageFile = join(evidence, 'wizard.html');
const androidFile = join(evidence, 'android.html');
await writeFile(pageFile, renderShell(source, resolve('generated-shell')));
await writeFile(
  androidFile,
  renderShell(
    await readFile('../android/www/index.html', 'utf8'),
    resolve('../android/www'),
  ),
);

// Il riferimento viene dai componenti React reali della webapp, non da una copia del loro CSS.
const frontendRoot = resolve('../../acasystem/frontend');
const frontendRequire = createRequire(join(frontendRoot, 'package.json'));
// esbuild è già presente con Vite: soltanto bundle QA in memoria, nessuna nuova dipendenza.
const { build } = frontendRequire('esbuild');
const bundle = await build({
  stdin: {
    resolveDir: frontendRoot,
    loader: 'tsx',
    contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { Button } from './src/components/primitives/components/Button';
    import { Field } from './src/components/primitives/components/Field';
    import { Surface } from './src/components/primitives/components/Surface';
    export const markup = renderToStaticMarkup(<Surface id="reference-card">
      <Button id="reference-button" variant="primary">Collega</Button>
      <Field id="reference-input" label="Indirizzo IP" />
    </Surface>);
  `,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react-dom/*'],
  jsx: 'automatic',
});
const referenceModule = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  frontendRequire,
  referenceModule,
  referenceModule.exports,
);
const referenceFile = join(evidence, 'web-primitives.html');
await writeFile(
  referenceFile,
  `<!doctype html><html lang="it"><head><meta charset="utf-8"><link rel="stylesheet" href="${pathToFileURL(resolve('../../acasystem/design/index.css')).href}"></head><body>${referenceModule.exports.markup}</body></html>`,
);
const properties = [
  'backgroundColor',
  'backgroundImage',
  'boxShadow',
  'borderRadius',
  'color',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'outlineColor',
  'outlineWidth',
];
const appearance = (page, reference) =>
  page.evaluate(
    ({ reference, properties }) => {
      const card = document.querySelector(
        reference ? '#reference-card' : 'main.card',
      );
      const button = document.querySelector(
        reference ? '#reference-button' : '#submit',
      );
      const input = document.querySelector(
        reference ? '#reference-input' : '#host',
      );
      const field = input.closest('.aca-field');
      const parts = {
        card,
        cardFace: card.querySelector('.aca-m__face'),
        button,
        buttonFace: button.querySelector('.aca-m__face'),
        buttonLabel: button.querySelector('.aca-m__label'),
        field,
        fieldFace: field.querySelector('.aca-m__face'),
        input,
      };
      return Object.fromEntries(
        Object.entries(parts).map(([name, element]) => {
          const style = getComputedStyle(element);
          return [
            name,
            Object.fromEntries(
              properties.map((property) => [property, style[property]]),
            ),
          ];
        }),
      );
    },
    { reference, properties },
  );
const visualState = async (page, reference, state) => {
  await page.evaluate(
    ({ reference, state }) => {
      document.activeElement?.blur();
      const button = document.querySelector(
        reference ? '#reference-button' : '#submit',
      );
      const input = document.querySelector(
        reference ? '#reference-input' : '#host',
      );
      button.classList.toggle('is-active', state === 'pressed');
      button.classList.toggle('is-focus', state === 'focused');
      input
        .closest('.aca-field')
        .classList.toggle('is-focus', state === 'focused');
      button.disabled = state === 'disabled';
      input.disabled = state === 'disabled';
    },
    { reference, state },
  );
  await page.waitForTimeout(250);
};
const runner = join(evidence, 'runner.cjs');
const profile = join(evidence, 'profile');
await mkdir(profile, { recursive: true });
await writeFile(
  runner,
  `const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
app.setPath('userData', process.env.ACA_LAYOUT_PROFILE);
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1280, height: 800, useContentSize: true,
    webPreferences: { javascript: false, nodeIntegration: false, contextIsolation: true, sandbox: true, offscreen: true } });
  await window.loadURL('about:blank');
});
`,
);
let app;
try {
  app = await electron.launch({
    args: [runner],
    env: { ...process.env, ACA_LAYOUT_PROFILE: profile },
  });
  const page = await app.firstWindow();
  const networkRequests = [];
  await page.route(/^https?:\/\//, (route) => {
    networkRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto(pathToFileURL(pageFile).href);
  const results = [];
  for (const platform of [
    { name: 'windows', file: pageFile },
    { name: 'android', file: androidFile },
  ]) {
    await page.goto(pathToFileURL(platform.file).href);
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0].setContentSize(
            size.width,
            size.height,
          ),
        { width, height },
      );
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        fontLoaded: document.fonts.check('400 16px Inter'),
        fontFamily: getComputedStyle(document.body).fontFamily,
        cta: document.querySelector('#submit')?.textContent,
        localEngineCta: Boolean(document.querySelector('#prepare-local-pc')),
        passwordInputs: document.querySelectorAll('input[type="password"]')
          .length,
        pageScriptExecuted: Boolean(window.acaPageScriptExecuted),
      }));
      assert.equal(result.overflow, false);
      assert.equal(result.fontLoaded, true);
      assert.equal(result.pageScriptExecuted, false);
      assert.equal(result.cta, 'Collega');
      assert.equal(result.localEngineCta, false);
      assert.equal(result.passwordInputs, 0);
      await page.screenshot({
        path: join(evidence, `${platform.name}-wizard-${width}.png`),
        fullPage: true,
      });
      results.push({ platform: platform.name, ...result });
    }
  }
  const appearances = [];
  for (const theme of ['light', 'dark', 'cyan']) {
    const expected = {};
    await page.goto(pathToFileURL(referenceFile).href);
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme =
        theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.accent =
        theme === 'cyan' ? 'cyan' : 'blue';
    }, theme);
    await page.evaluate(() => document.fonts.ready);
    for (const state of ['normal', 'pressed', 'focused', 'disabled']) {
      await visualState(page, true, state);
      expected[state] = await appearance(page, true);
    }
    for (const platform of [
      { name: 'windows', file: pageFile },
      { name: 'android', file: androidFile },
    ]) {
      await page.goto(pathToFileURL(platform.file).href);
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme =
          theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.accent =
          theme === 'cyan' ? 'cyan' : 'blue';
      }, theme);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).colorScheme,
        ),
        theme === 'dark' ? 'dark' : 'light',
      );
      for (const state of ['normal', 'pressed', 'focused', 'disabled']) {
        await visualState(page, false, state);
        const actual = await appearance(page, false);
        assert.deepEqual(
          actual,
          expected[state],
          `${platform.name}, ${theme}, ${state}: materiale diverso dalla webapp`,
        );
        appearances.push({
          platform: platform.name,
          theme,
          state,
          matchesWebComponents: true,
        });
      }
      await visualState(page, false, 'normal');
      await page
        .locator('label.shell-field[for="host"]')
        .click({ position: { x: 12, y: 24 } });
      assert.equal(
        await page
          .locator('#host')
          .evaluate((input) => document.activeElement === input),
        true,
      );
      assert.equal(
        await page.getByRole('textbox', { name: /Indirizzo IP/ }).count(),
        1,
      );
      assert.equal(await page.locator('[style]').count(), 0);
    }
  }
  for (const view of ['scan', 'pairing-choice', 'error']) {
    await page.goto(pathToFileURL(androidFile).href);
    await page.evaluate((view) => {
      document.body.dataset.view = view;
    }, view);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: join(evidence, `android-${view}-390.png`),
      fullPage: true,
    });
  }
  assert.deepEqual(networkRequests, []);
  await writeFile(
    join(evidence, 'results.json'),
    JSON.stringify(
      { results, appearances, networkRequests, evidence },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      results,
      materialComparisons: appearances.length,
      networkRequests,
      evidence,
    }),
  );
} finally {
  await app?.close();
}
