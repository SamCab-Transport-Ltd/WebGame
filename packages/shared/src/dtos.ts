import type { BuildingType, ResourceKind, WeatherKind, AttackType, EventKind } from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  allianceId: string | null;
}

export interface ResourceDto {
  kind: ResourceKind;
  amount: number;
  cap: number;
}

export interface BuildingDto {
  id: string;
  type: BuildingType;
  level: number;
  hp: number;
  constructionEndsAt: string | null;
}

export interface TownDto {
  id: string;
  name: string;
  sectorX: number;
  sectorY: number;
  defenseRating: number;
  population: number;
  happiness: number;
  hunger: number;
  lastTickAt: string;
  resources: ResourceDto[];
  buildings: BuildingDto[];
}

export interface BuildRequest {
  type: BuildingType;
}

export interface UpgradeRequest {
  buildingId: string;
}

export interface WeatherDto {
  kind: WeatherKind;
  startedAt: string;
  endsAt: string;
}

export interface WorldEventDto {
  id: string;
  kind: EventKind;
  headline: string;
  body: string;
  sectorX: number | null;
  sectorY: number | null;
  createdAt: string;
}

export interface LaunchAttackRequest {
  defenderTownId: string;
  troopCount: number;
  attackType: AttackType;
}

export interface CombatReportDto {
  id: string;
  attackerTownId: string;
  defenderTownId: string;
  attackType: AttackType;
  troopCount: number;
  arriveAt: string;
  resolvedAt: string | null;
  report: CombatReportPayload | null;
}

export interface CombatReportPayload {
  attackerCasualties: number;
  defenderCasualties: number;
  loot: Partial<Record<ResourceKind, number>>;
  damage: number;
  outcome: 'ATTACKER_WINS' | 'DEFENDER_WINS' | 'DRAW';
}
