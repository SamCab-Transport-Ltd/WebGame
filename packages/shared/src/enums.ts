export const BuildingType = {
  HQ: 'HQ',
  FARM: 'FARM',
  WATER_PUMP: 'WATER_PUMP',
  SCRAP_YARD: 'SCRAP_YARD',
  BARRACKS: 'BARRACKS',
  WALL: 'WALL',
} as const;
export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType];

export const ResourceKind = {
  FOOD: 'FOOD',
  WATER: 'WATER',
  SCRAP: 'SCRAP',
  FUEL: 'FUEL',
} as const;
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export const WeatherKind = {
  CLEAR: 'CLEAR',
  RAIN: 'RAIN',
  HEATWAVE: 'HEATWAVE',
  SNOW: 'SNOW',
  FOG: 'FOG',
} as const;
export type WeatherKind = (typeof WeatherKind)[keyof typeof WeatherKind];

export const AttackType = {
  RAID: 'RAID',
  SIEGE: 'SIEGE',
  SCOUT: 'SCOUT',
} as const;
export type AttackType = (typeof AttackType)[keyof typeof AttackType];

export const EventKind = {
  WEATHER: 'WEATHER',
  SHORTAGE: 'SHORTAGE',
  DISASTER: 'DISASTER',
  RAID: 'RAID',
  ECONOMY: 'ECONOMY',
  POLITICAL: 'POLITICAL',
} as const;
export type EventKind = (typeof EventKind)[keyof typeof EventKind];
