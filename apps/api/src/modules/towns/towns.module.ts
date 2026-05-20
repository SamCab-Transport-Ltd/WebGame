import { Module } from '@nestjs/common';
import { TownsService } from './towns.service';
import { TownsController } from './towns.controller';

@Module({
  controllers: [TownsController],
  providers: [TownsService],
  exports: [TownsService],
})
export class TownsModule {}
