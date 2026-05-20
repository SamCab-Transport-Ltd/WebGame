import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BuildingType,
  DEFAULT_RESOURCE_CAP,
  ResourceKind,
  STARTER_RESOURCES,
  WORLD_SECTOR_SIZE,
  type TownDto,
} from '@webgame/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TownsService {
  constructor(private readonly prisma: PrismaService) {}

  async createStarterTown(userId: string, displayName: string): Promise<TownDto> {
    const sector = await this.pickFreeSector();
    const town = await this.prisma.town.create({
      data: {
        userId,
        name: `${displayName}'s Settlement`,
        sectorX: sector.x,
        sectorY: sector.y,
        resources: {
          create: (Object.keys(STARTER_RESOURCES) as ResourceKind[]).map((kind) => ({
            kind,
            amount: STARTER_RESOURCES[kind],
            cap: DEFAULT_RESOURCE_CAP,
          })),
        },
        buildings: {
          create: [{ type: BuildingType.HQ, level: 1 }],
        },
      },
      include: { resources: true, buildings: true },
    });
    return this.toDto(town);
  }

  async getMyTown(userId: string): Promise<TownDto> {
    const town = await this.prisma.town.findUnique({
      where: { userId },
      include: { resources: true, buildings: true },
    });
    if (!town) throw new NotFoundException('town not found');
    return this.toDto(town);
  }

  async assertOwnership(userId: string, townId: string) {
    const town = await this.prisma.town.findUnique({ where: { id: townId } });
    if (!town) throw new NotFoundException('town not found');
    if (town.userId !== userId) throw new ForbiddenException('not your town');
    return town;
  }

  private async pickFreeSector(): Promise<{ x: number; y: number }> {
    // MVP: random in a 50x50 grid, retry on collision (very low at MVP scale).
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * WORLD_SECTOR_SIZE);
      const y = Math.floor(Math.random() * WORLD_SECTOR_SIZE);
      const existing = await this.prisma.town.findUnique({ where: { sectorX_sectorY: { sectorX: x, sectorY: y } } });
      if (!existing) return { x, y };
    }
    throw new Error('world full');
  }

  toDto(town: {
    id: string;
    name: string;
    sectorX: number;
    sectorY: number;
    defenseRating: number;
    population: number;
    happiness: number;
    hunger: number;
    lastTickAt: Date;
    resources: { kind: ResourceKind; amount: number; cap: number }[];
    buildings: { id: string; type: BuildingType; level: number; hp: number; constructionEndsAt: Date | null }[];
  }): TownDto {
    return {
      id: town.id,
      name: town.name,
      sectorX: town.sectorX,
      sectorY: town.sectorY,
      defenseRating: town.defenseRating,
      population: town.population,
      happiness: town.happiness,
      hunger: town.hunger,
      lastTickAt: town.lastTickAt.toISOString(),
      resources: town.resources.map((r) => ({ kind: r.kind, amount: r.amount, cap: r.cap })),
      buildings: town.buildings.map((b) => ({
        id: b.id,
        type: b.type,
        level: b.level,
        hp: b.hp,
        constructionEndsAt: b.constructionEndsAt ? b.constructionEndsAt.toISOString() : null,
      })),
    };
  }
}
