/**
 * The empty plan the server also starts from (`emptyBuilding()` of the backend, as `empty_building()`
 * of the original): no floors, the default wall thickness and grid, nothing set for energy or presence.
 * «Ricomincia» saves it in place of the example house left on the bench by the T6 test (R1).
 */
export function emptyBuilding(): Record<string, unknown> {
  return {
    version: 1,
    floors: [],
    settings: { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05 },
    energy: {
      meter: null,
      grid: null,
      grid_invert: false,
      solar: null,
      battery: null,
      battery_invert: false,
      battery_soc: null,
      consumption: null,
      tariff: null,
      gas: null,
      water: null,
    },
    presence: [],
  };
}
