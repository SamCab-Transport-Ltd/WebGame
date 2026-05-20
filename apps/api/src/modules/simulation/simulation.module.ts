import { Module } from '@nestjs/common';
import { TickService } from './tick.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  providers: [TickService],
})
export class SimulationModule {}
