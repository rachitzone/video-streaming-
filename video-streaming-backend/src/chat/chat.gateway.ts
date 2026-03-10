import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

interface ConnectedUser {
  type: 'user' | 'guest';
  email?: string;
  sub?: number;
  role?: 'ADMIN' | 'USER';
  guestId?: string;
  name?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /* ======================
     CONNECTION
  ====================== */
  handleConnection(client: Socket) {
    try {
      const { token, guestId, guestName } = client.handshake.auth || {};

      // Registered user
      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET missing');

        const decoded: any = jwt.verify(token, secret);

        client.data.user = {
          type: 'user',
          name: decoded.name,
          sub: decoded.sub,
          role: decoded.role,
        };

        return;
      }

      // Guest
      const finalGuestId = guestId || randomUUID();
      const finalGuestName =
        guestName && guestName.trim() !== ''
          ? guestName
          : `Guest_${finalGuestId.slice(0, 5)}`;

      client.data.user = {
        type: 'guest',
        guestId: finalGuestId,
        name: finalGuestName,
      };
    } catch (err) {
      client.disconnect();
    }
  }

  /* ======================
     DISCONNECT
  ====================== */
  async handleDisconnect(client: Socket) {
    const streamId = client.data.streamId;
    if (!streamId) return;

    const user: ConnectedUser = client.data.user;
    const viewerId =
      user?.type === 'user' ? user.sub : user?.guestId;

    if (!viewerId) return;

    const viewerKey = `stream:viewers:${streamId}`;

    await this.redis.srem(viewerKey, viewerId.toString());
    const count = await this.redis.scard(viewerKey);

    this.server.to(`stream-${streamId}`).emit('viewerCount', count);
  }

  /* ======================
     JOIN STREAM
  ====================== */
  @SubscribeMessage('joinStream')
  async joinStream(client: Socket, streamId: number) {
    client.join(`stream-${streamId}`);
    client.data.streamId = streamId;

    const user: ConnectedUser = client.data.user;
    const viewerId =
      user.type === 'user' ? user.sub : user.guestId;

    if (!viewerId) return;

    const viewerKey = `stream:viewers:${streamId}`;
    await this.redis.sadd(viewerKey, viewerId.toString());

    const count = await this.redis.scard(viewerKey);
    this.server.to(`stream-${streamId}`).emit('viewerCount', count);

    const history = await this.redis.lrange(
      `livechat:stream:${streamId}`,
      0,
      50,
    );

    client.emit(
      'chatHistory',
      history.map((m) => JSON.parse(m)).reverse(),
    );
  }

  /* ======================
     CHAT MESSAGE
  ====================== */
  @SubscribeMessage('chatMessage')
  async chatMessage(
    client: Socket,
    data: { streamId: number; message: string },
  ) {
    const user: ConnectedUser = client.data.user;
    const viewerId =
      user.type === 'user' ? user.sub : user.guestId;

    if (!viewerId) return;

    const muteKey = `stream:mute:${data.streamId}:${viewerId}`;

    const ttl = await this.redis.ttl(muteKey);

    // 🔥 If muted, send remaining seconds
    if (ttl > 0) {
      client.emit('youAreMuted', {
        secondsLeft: ttl,
      });
      return;
    }

    const chat = {
      id: randomUUID(),
      user: user.name,
      userId: viewerId,
      role:
        user.type === 'user'
          ? user.role
          : 'GUEST',
      message: data.message,
      time: new Date().toISOString(),
      deleted: false,
    };

    const key = `livechat:stream:${data.streamId}`;
    await this.redis.lpush(key, JSON.stringify(chat));
    await this.redis.ltrim(key, 0, 99);

    this.server
      .to(`stream-${data.streamId}`)
      .emit('chatMessage', chat);
  }

  /* ======================
     ADMIN DELETE
  ====================== */
  @SubscribeMessage('adminDeleteMessage')
  async deleteMessage(
    client: Socket,
    data: { streamId: number; messageId: string },
  ) {
    const user: ConnectedUser = client.data.user;

    if (user.type !== 'user' || user.role !== 'ADMIN') return;

    const key = `livechat:stream:${data.streamId}`;
    const messages = await this.redis.lrange(key, 0, -1);

    const updated = messages.map((m) => {
      const msg = JSON.parse(m);

      if (msg.id === data.messageId) {
        msg.deleted = true;
        msg.message = 'This message was deleted';
      }

      return JSON.stringify(msg);
    });

    await this.redis.del(key);
    if (updated.length) {
      await this.redis.rpush(key, ...updated);
    }

    this.server
      .to(`stream-${data.streamId}`)
      .emit('chatMessageUpdated', {
        messageId: data.messageId,
      });
  }

  /* ======================
     ADMIN MUTE USER (90 sec)
  ====================== */
  @SubscribeMessage('adminMuteUser')
  async muteUser(
    client: Socket,
    data: { streamId: number; userId: string },
  ) {
    const user: ConnectedUser = client.data.user;

    if (user.type !== 'user' || user.role !== 'ADMIN') return;

    const muteKey = `stream:mute:${data.streamId}:${data.userId}`;

    await this.redis.set(muteKey, '1', 'EX', 90);

    // 🔥 Instantly notify muted user if connected
    const sockets = await this.server
      .in(`stream-${data.streamId}`)
      .fetchSockets();

    for (const s of sockets) {
      const u = s.data.user;

      if (!u) continue;

      const id =
        u.type === 'user' ? u.sub : u.guestId;

      if (id?.toString() === data.userId.toString()) {
        s.emit('youAreMuted', { secondsLeft: 90 });
      }
    }
  }

  /* ======================
     ADMIN UNMUTE
  ====================== */
  @SubscribeMessage('adminUnmuteUser')
  async unmuteUser(
    client: Socket,
    data: { streamId: number; userId: string },
  ) {
    const user: ConnectedUser = client.data.user;

    if (user.type !== 'user' || user.role !== 'ADMIN') return;

    const muteKey = `stream:mute:${data.streamId}:${data.userId}`;
    await this.redis.del(muteKey);

    const sockets = await this.server
      .in(`stream-${data.streamId}`)
      .fetchSockets();

    for (const s of sockets) {
      const u = s.data.user;

      const id =
        u.type === 'user' ? u.sub : u.guestId;

      if (id?.toString() === data.userId.toString()) {
        s.emit('userUnmuted');
      }
    }
  }
}