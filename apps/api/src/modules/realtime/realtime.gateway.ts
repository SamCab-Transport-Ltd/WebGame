import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service';

const NEWS_ROOM = 'news';
const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('socket.io gateway ready');
    // Auth on connect via token in handshake.
    server.use(async (socket, next) => {
      try {
        const token = (socket.handshake.auth?.token as string | undefined)
          ?? (socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, ''));
        if (!token) throw new Error('no token');
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
          secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
        });
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) throw new Error('no user');
        (socket.data as { userId: string }).userId = user.id;
        next();
      } catch (err) {
        next(new Error('unauthorized'));
      }
    });
  }

  async handleConnection(socket: Socket) {
    const userId = (socket.data as { userId?: string }).userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    await socket.join([userRoom(userId), NEWS_ROOM]);
    this.logger.debug(`socket connected user=${userId} id=${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const userId = (socket.data as { userId?: string }).userId;
    this.logger.debug(`socket disconnected user=${userId ?? 'unknown'} id=${socket.id}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  emitToNews(event: string, payload: unknown) {
    this.server.to(NEWS_ROOM).emit(event, payload);
  }
}
