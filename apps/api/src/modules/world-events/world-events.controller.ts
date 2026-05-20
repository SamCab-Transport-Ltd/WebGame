import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorldEventsService } from './world-events.service';

@Controller('world-events')
@UseGuards(JwtAuthGuard)
export class WorldEventsController {
  constructor(private readonly events: WorldEventsService) {}

  @Get()
  list(@Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number) {
    return this.events.list(limit);
  }
}
