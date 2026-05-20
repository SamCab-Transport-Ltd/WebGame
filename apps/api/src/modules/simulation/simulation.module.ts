import { Module } from '@nestjs/common';
import { TickService } from './tick.service';
import { WeatherModule } from '../weather/weather.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WorldEventsModule } from '../world-events/world-events.module';
import { TownsModule } from '../towns/towns.module';

@Module({
  imports: [WeatherModule, RealtimeModule, WorldEventsModule, TownsModule],
  providers: [TickService],
})
export class SimulationModule {}
