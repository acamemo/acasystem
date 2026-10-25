/**
 * The switch that lets the Casa 3D adapter send service calls to Home Assistant (ADR-0014, T7/R7).
 *
 * OFF unless the build says `VITE_CASA3D_COMMANDS=on`, exactly that value. While it is off the
 * adapter stays read-only whatever the page asks: `createCasa3dHass` refuses every `callService`
 * (as it did before T7), even in Esplora and with a command path given. The T7 work (the closed
 * list of services, the questions, the 350 ms limit) is kept and tested; the switch is turned on
 * only when step R7 of the revised plan (REP-20261021-002) is done and verified on the bench.
 *
 * Read at every call, not at import, so a test can switch it with `vi.stubEnv`.
 */
export function casa3dCommandsEnabled(): boolean {
  return import.meta.env.VITE_CASA3D_COMMANDS === 'on';
}
