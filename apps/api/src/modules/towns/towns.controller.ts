import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { TownsService } from './towns.service';

@Controller('towns')
@UseGuards(JwtAuthGuard)
export class TownsController {
  constructor(private readonly towns: TownsService) {}

  @Get('me')
  getMyTown(@CurrentUser() user: CurrentUserPayload) {
    return this.towns.getMyTown(user.id);
  }
}
