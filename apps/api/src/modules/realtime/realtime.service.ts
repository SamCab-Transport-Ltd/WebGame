import { Injectable } from '@nestjs/common';
import { SOCKET_EVENTS } from '@webgame/shared';
import type { TownDto, WeatherDto, WorldEventDto, CombatReportDto } from '@webgame/shared';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  pushTownUpdate(userId: string, town: TownDto) {
    this.gateway.emitToUser(userId, SOCKET_EVENTS.TOWN_UPDATED, town);
  }

  pushWeatherChange(weather: WeatherDto) {
    this.gateway.emitToNews(SOCKET_EVENTS.WEATHER_CHANGED, weather);
  }

  pushWorldEvent(event: WorldEventDto) {
    this.gateway.emitToNews(SOCKET_EVENTS.WORLD_EVENT_CREATED, event);
  }

  pushCombatResolved(userId: string, report: CombatReportDto) {
    this.gateway.emitToUser(userId, SOCKET_EVENTS.COMBAT_RESOLVED, report);
  }
}
