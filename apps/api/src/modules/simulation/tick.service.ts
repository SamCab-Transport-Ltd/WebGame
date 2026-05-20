import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  BUILDING_BASE_RATES,
  ResourceKind,
  WEATHER_MODIFIERS,
  WeatherKind,
} from '@webgame/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WorldEventsService } from '../world-events/world-events.service';
import { TownsService } from '../towns/towns.service';

interface TownForTick {
  id: string;
  userId: string;
  lastTickAt: Date;
  happiness: number;
  buildings: { type: string; level: number; constructionEndsAt: Date | null }[];
  resources: { kind: ResourceKind; amount: number; cap: number }[];
}

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);
  private running = false;
  private lastWeatherKind: WeatherKind | null = null;
  private lastWeatherRotation = 0;
  private readonly WEATHER_ROTATE_MS = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly weather: WeatherService,
    private readonly realtime: RealtimeService,
    private readonly events: WorldEventsService,
    private readonly towns: TownsService,
  ) {}

  @Cron('*/30 * * * * *')
  async tick() {
    if (this.running) {
      this.logger.warn('tick overrun, skipping');
      return;
    }
    this.running = true;
    const started = Date.now();
    try {
      await this.completeBuildings();
      const current = await this.weather.getCurrent();
      await this.maybeRotateWeather(current.kind);
      await this.runResourceTick(current.kind);
    } catch (err) {
      this.logger.error(`tick failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
      this.logger.debug(`tick done in ${Date.now() - started}ms`);
    }
  }

  private async completeBuildings() {
    const now = new Date();
    await this.prisma.building.updateMany({
      where: { constructionEndsAt: { lte: now } },
      data: { constructionEndsAt: null },
    });
  }

  private async maybeRotateWeather(currentKind: WeatherKind) {
    if (this.lastWeatherKind === null) {
      this.lastWeatherKind = currentKind;
      this.lastWeatherRotation = Date.now();
      return;
    }
    if (Date.now() - this.lastWeatherRotation < this.WEATHER_ROTATE_MS) return;
    const next = await this.weather.rotate();
    this.lastWeatherKind = next.kind;
    this.lastWeatherRotation = Date.now();
    this.realtime.pushWeatherChange({
      kind: next.kind,
      startedAt: next.startedAt.toISOString(),
      endsAt: next.endsAt.toISOString(),
    });
    await this.events.emitWeatherChange(next.kind);
  }

  private async runResourceTick(weather: WeatherKind) {
    const batchSize = 50;
    let cursor: string | undefined = undefined;
    for (;;) {
      const towns: TownForTick[] = await this.prisma.town.findMany({
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          userId: true,
          lastTickAt: true,
          happiness: true,
          buildings: { select: { type: true, level: true, constructionEndsAt: true } },
          resources: { select: { kind: true, amount: true, cap: true } },
        },
      });
      if (towns.length === 0) break;
      for (const town of towns) {
        const updated = await this.applyTickForTown(town, weather);
        if (updated) {
          const dto = await this.towns.getMyTown(town.userId).catch(() => null);
          if (dto) this.realtime.pushTownUpdate(town.userId, dto);
        }
      }
      cursor = towns[towns.length - 1].id;
      if (towns.length < batchSize) break;
    }
  }

  private async applyTickForTown(town: TownForTick, weather: WeatherKind): Promise<boolean> {
    const now = new Date();
    const elapsedS = Math.max(0, (now.getTime() - town.lastTickAt.getTime()) / 1000);
    if (elapsedS <= 0) return false;

    const happinessMod = Math.min(1.2, Math.max(0.5, town.happiness / 100));
    const updates: { kind: ResourceKind; nextAmount: number }[] = [];

    for (const resource of town.resources) {
      let baseRatePerSecond = 0;
      for (const b of town.buildings) {
        if (b.constructionEndsAt) continue;
        const rateMap = BUILDING_BASE_RATES[b.type as keyof typeof BUILDING_BASE_RATES] ?? {};
        const rate = rateMap[resource.kind] ?? 0;
        baseRatePerSecond += rate * b.level;
      }
      const weatherMod = WEATHER_MODIFIERS[weather]?.[resource.kind] ?? 1;
      const produced = Math.floor(baseRatePerSecond * weatherMod * happinessMod * elapsedS);
      if (produced <= 0) continue;
      updates.push({ kind: resource.kind, nextAmount: Math.min(resource.cap, resource.amount + produced) });
    }

    if (updates.length === 0) {
      await this.prisma.town.update({ where: { id: town.id }, data: { lastTickAt: now } });
      return false;
    }

    await this.prisma.$transaction([
      ...updates.map((u) =>
        this.prisma.resource.update({
          where: { townId_kind: { townId: town.id, kind: u.kind } },
          data: { amount: u.nextAmount },
        }),
      ),
      this.prisma.town.update({
        where: { id: town.id },
        data: { lastTickAt: now, version: { increment: 1 } },
      }),
    ]);
    return true;
  }
}
