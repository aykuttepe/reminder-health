import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const actions = {
  server: ['--address', '127.0.0.1', '--port', '4723'],
  doctor: ['driver', 'doctor', 'uiautomator2'],
  drivers: ['driver', 'list', '--installed'],
  emulator: ['-avd', 'Reminder_Health_API_35', '-port', '5554', '-no-snapshot-load', '-no-boot-anim'],
};
const action = process.argv[2];
const args = Object.hasOwn(actions, action) ? actions[action] : undefined;
if (!args) {
  console.error('Usage: node tooling.mjs server|doctor|drivers|emulator');
  process.exit(2);
}

const env = { ...process.env, APPIUM_HOME: root };
if (!env.ANDROID_HOME) {
  const properties = resolve(root, '../../mobile-app/android/local.properties');
  const sdk = existsSync(properties)
    ? readFileSync(properties, 'utf8').match(/^sdk\.dir=(.+)$/m)?.[1]?.trim()
    : undefined;
  env.ANDROID_HOME = env.ANDROID_SDK_ROOT || sdk || '';
}
if (env.ANDROID_HOME) {
  env.PATH = [join(env.ANDROID_HOME, 'platform-tools'), join(env.ANDROID_HOME, 'emulator'), env.PATH]
    .filter(Boolean).join(process.platform === 'win32' ? ';' : ':');
}
if (!env.JAVA_HOME && process.platform === 'darwin') {
  try {
    env.JAVA_HOME = execFileSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' }).trim();
  } catch {
    console.error('Java 17 could not be located. Set JAVA_HOME before running Appium.');
    process.exit(1);
  }
}

const isEmulator = action === 'emulator';
const executable = isEmulator ? join(env.ANDROID_HOME, 'emulator', 'emulator') : process.execPath;
if (isEmulator && (!env.ANDROID_HOME || !existsSync(executable))) {
  console.error('Android emulator not found. Install it in the configured ANDROID_HOME.');
  process.exit(1);
}
const commandArgs = isEmulator ? args : [join(root, 'node_modules/appium/index.js'), ...args];
const child = spawn(executable, commandArgs, {
  cwd: root, env, stdio: 'inherit',
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
