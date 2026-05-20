import { BUILDING_BASE_RATES, WEATHER_MODIFIERS } from '@webgame/shared';

// Smoke test: ensure the production formula constants are wired correctly.
describe('tick formula constants', () => {
  it('farm produces food', () => {
    expect(BUILDING_BASE_RATES.FARM.FOOD).toBeGreaterThan(0);
  });

  it('heatwave reduces food', () => {
    expect((WEATHER_MODIFIERS.HEATWAVE.FOOD ?? 1)).toBeLessThan(1);
  });

  it('rain boosts water', () => {
    expect((WEATHER_MODIFIERS.RAIN.WATER ?? 1)).toBeGreaterThan(1);
  });
});
