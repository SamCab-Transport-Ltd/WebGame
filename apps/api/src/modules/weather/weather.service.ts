import { Injectable } from '@nestjs/common';
import { WeatherKind } from '@webgame/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const WEATHER_DURATION_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class WeatherService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(): Promise<{ kind: WeatherKind; startedAt: Date; endsAt: Date }> {
    const now = new Date();
    const current = await this.prisma.weather.findFirst({
      where: { startedAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { startedAt: 'desc' },
    });
    if (current) return current;
    return this.rotate();
  }

  async rotate(): Promise<{ kind: WeatherKind; startedAt: Date; endsAt: Date }> {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + WEATHER_DURATION_MS);
    const kinds: WeatherKind[] = ['CLEAR', 'RAIN', 'HEATWAVE', 'SNOW', 'FOG'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    return this.prisma.weather.create({ data: { kind, startedAt, endsAt } });
  }
}
