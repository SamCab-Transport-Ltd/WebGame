import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BUILDING_BASE_BUILD_SECONDS,
  BUILDING_BASE_COST,
  BuildingType,
  ResourceKind,
} from '@webgame/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TownsService } from '../towns/towns.service';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly towns: TownsService,
  ) {}

  async construct(userId: string, type: BuildingType) {
    const town = await this.prisma.town.findUnique({
      where: { userId },
      include: { resources: true },
    });
    if (!town) throw new NotFoundException('town not found');

    const cost = BUILDING_BASE_COST[type];
    for (const [kindStr, requiredRaw] of Object.entries(cost)) {
      const required = requiredRaw ?? 0;
      const kind = kindStr as ResourceKind;
      const res = town.resources.find((r) => r.kind === kind);
      if (!res || res.amount < required) {
        throw new BadRequestException(`not enough ${kind}`);
      }
    }

    const buildSeconds = BUILDING_BASE_BUILD_SECONDS[type];
    const endsAt = new Date(Date.now() + buildSeconds * 1000);

    return this.prisma.$transaction(async (tx) => {
      for (const [kindStr, requiredRaw] of Object.entries(cost)) {
        const required = requiredRaw ?? 0;
        const kind = kindStr as ResourceKind;
        await tx.resource.update({
          where: { townId_kind: { townId: town.id, kind } },
          data: { amount: { decrement: required } },
        });
      }
      const building = await tx.building.create({
        data: {
          townId: town.id,
          type,
          level: 1,
          constructionEndsAt: endsAt,
        },
      });
      return building;
    });
  }
}
