import { Module } from '@nestjs/common';
import { WorldEventsService } from './world-events.service';
import { WorldEventsController } from './world-events.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [WorldEventsController],
  providers: [WorldEventsService],
  exports: [WorldEventsService],
})
export class WorldEventsModule {}
