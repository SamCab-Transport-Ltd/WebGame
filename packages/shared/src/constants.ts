import { BuildingType, ResourceKind, WeatherKind } from './enums';

export const TICK_INTERVAL_SECONDS = 30;
export const WORLD_SECTOR_SIZE = 50;

// Per-second production rates at level 1 (per building).
export const BUILDING_BASE_RATES: Record<BuildingType, Partial<Record<ResourceKind, number>>> = {
  HQ: {},
  FARM: { FOOD: 0.5 },
  WATER_PUMP: { WATER: 0.5 },
  SCRAP_YARD: { SCRAP: 0.25 },
  BARRACKS: {},
  WALL: {},
};

// Construction cost at level 1.
export const BUILDING_BASE_COST: Record<BuildingType, Partial<Record<ResourceKind, number>>> = {
  HQ: { SCRAP: 100 },
  FARM: { SCRAP: 40 },
  WATER_PUMP: { SCRAP: 40 },
  SCRAP_YARD: { SCRAP: 60 },
  BARRACKS: { SCRAP: 80 },
  WALL: { SCRAP: 50 },
};

// Construction duration in seconds at level 1.
export const BUILDING_BASE_BUILD_SECONDS: Record<BuildingType, number> = {
  HQ: 60,
  FARM: 30,
  WATER_PUMP: 30,
  SCRAP_YARD: 45,
  BARRACKS: 60,
  WALL: 45,
};

// Weather production modifier: 1.0 = no change.
export const WEATHER_MODIFIERS: Record<WeatherKind, Partial<Record<ResourceKind, number>>> = {
  CLEAR: {},
  RAIN: { WATER: 1.3, FOOD: 1.1 },
  HEATWAVE: { FOOD: 0.6, WATER: 0.7 },
  SNOW: { FOOD: 0.7, FUEL: 1.2 },
  FOG: {},
};

// Starter resources granted to new towns.
export const STARTER_RESOURCES: Record<ResourceKind, number> = {
  FOOD: 200,
  WATER: 200,
  SCRAP: 300,
  FUEL: 50,
};

// Default cap per resource (overridable per town later).
export const DEFAULT_RESOURCE_CAP = 2000;
