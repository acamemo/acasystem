import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Esegue il Gradle wrapper del progetto Android con l'SDK e il JDK locali.
const androidDir = fileURLToPath(new URL('../android/', import.meta.url));
const sdk = process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
if (!existsSync(sdk)) {
  console.error(`Android SDK non trovato: imposta ANDROID_HOME (cercato in ${sdk}).`);
  process.exit(1);
}
const args = process.argv.slice(2);
const options = { cwd: androidDir, stdio: 'inherit', env: { ...process.env, ANDROID_HOME: sdk } };
// Su Windows un .bat passa da cmd.exe; il percorso ha spazi, quindi va tra virgolette.
const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `""${join(androidDir, 'gradlew.bat')}" ${args.join(' ')}"`], {
        ...options,
        windowsVerbatimArguments: true,
      })
    : spawnSync(join(androidDir, 'gradlew'), args, options);
process.exit(result.status ?? 1);
