import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { BuildingType } from '@webgame/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { BuildingsService } from './buildings.service';

class BuildDto {
  @IsEnum(BuildingType)
  type!: BuildingType;
}

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Post()
  build(@CurrentUser() user: CurrentUserPayload, @Body() dto: BuildDto) {
    return this.buildings.construct(user.id, dto.type);
  }
}
