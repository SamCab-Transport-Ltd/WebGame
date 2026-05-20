import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TownsService } from '../towns/towns.service';
import type { AuthTokens, UserDto } from '@webgame/shared';

const REFRESH_TOKEN_BYTES = 64;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly towns: TownsService,
  ) {}

  async register(email: string, password: string, displayName: string): Promise<AuthTokens & { user: UserDto }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('email already in use');
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
    await this.towns.createStarterTown(user.id, displayName);
    const tokens = await this.issueTokens(user.id);
    return { ...tokens, user: this.toDto(user) };
  }

  async login(email: string, password: string): Promise<AuthTokens & { user: UserDto }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    const tokens = await this.issueTokens(user.id);
    return { ...tokens, user: this.toDto(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const hash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash: hash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
        expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
      },
    );
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const ttlDays = this.refreshTtlDays();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 3600 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTtlDays(): number {
    const raw = process.env.JWT_REFRESH_TTL ?? '30d';
    const m = raw.match(/^(\d+)d$/);
    return m ? Number(m[1]) : 30;
  }

  private toDto(user: {
    id: string;
    email: string;
    displayName: string;
    allianceId: string | null;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      allianceId: user.allianceId,
    };
  }
}
