import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TownsModule } from './modules/towns/towns.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { WeatherModule } from './modules/weather/weather.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WorldEventsModule } from './modules/world-events/world-events.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TownsModule,
    BuildingsModule,
    ResourcesModule,
    WeatherModule,
    RealtimeModule,
    WorldEventsModule,
    SimulationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
