import { Injectable } from '@nestjs/common';
import { EventKind, WeatherKind } from '@webgame/shared';
import type { WorldEventDto } from '@webgame/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

// Templated narrative generators. Zero LLM calls. Keep these terse and varied.
const WEATHER_HEADLINES: Record<WeatherKind, string[]> = {
  CLEAR: ['Clear skies return.', 'A rare calm settles on the wastes.'],
  RAIN: ['Heavy rain across the territories.', 'Cisterns fill as storms roll in.'],
  HEATWAVE: ['Brutal heatwave grips the wastelands.', 'Crops wither under the merciless sun.'],
  SNOW: ['Snowfall blankets the ruined cities.', 'Cold front descends; fuel demand spikes.'],
  FOG: ['Thick fog reduces visibility.', 'Scouts vanish into the haze.'],
};

const WEATHER_BODIES: Record<WeatherKind, string[]> = {
  CLEAR: ['Farmers report no losses today. Convoys move freely.'],
  RAIN: ['Water pumps run overtime. Farms see modest boosts.'],
  HEATWAVE: ['Food production drops sharply. Citizens shelter indoors.'],
  SNOW: ['Movement is sluggish. Heating fuel reserves dwindle.'],
  FOG: ['Raids harder to spot until forces arrive at the gates.'],
};

@Injectable()
export class WorldEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(limit = 25): Promise<WorldEventDto[]> {
    const rows = await this.prisma.worldEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((r) => this.toDto(r));
  }

  async emitWeatherChange(kind: WeatherKind) {
    const headline = pick(WEATHER_HEADLINES[kind]);
    const body = pick(WEATHER_BODIES[kind]);
    const row = await this.prisma.worldEvent.create({
      data: { kind: EventKind.WEATHER, headline, body },
    });
    const dto = this.toDto(row);
    this.realtime.pushWorldEvent(dto);
    return dto;
  }

  async emitShortage(resource: string, reason: string) {
    const headline = `${reason} triggers ${resource.toLowerCase()} shortage.`;
    const body = `Communities across the sector struggle to keep ${resource.toLowerCase()} stockpiles intact.`;
    const row = await this.prisma.worldEvent.create({
      data: { kind: EventKind.SHORTAGE, headline, body },
    });
    const dto = this.toDto(row);
    this.realtime.pushWorldEvent(dto);
    return dto;
  }

  async emitRaid(attackerName: string, defenderName: string, outcome: string) {
    const headline = `${attackerName} raids ${defenderName}.`;
    const body = `${outcome} The wires hum with reports across the news feed.`;
    const row = await this.prisma.worldEvent.create({
      data: { kind: EventKind.RAID, headline, body },
    });
    const dto = this.toDto(row);
    this.realtime.pushWorldEvent(dto);
    return dto;
  }

  private toDto(row: {
    id: string;
    kind: EventKind;
    headline: string;
    body: string;
    sectorX: number | null;
    sectorY: number | null;
    createdAt: Date;
  }): WorldEventDto {
    return {
      id: row.id,
      kind: row.kind,
      headline: row.headline,
      body: row.body,
      sectorX: row.sectorX,
      sectorY: row.sectorY,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
