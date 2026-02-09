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

/* ======================
   TYPES
====================== */
interface JwtUserPayload {
  email: string;
  sub: number;
  role: 'ADMIN' | 'USER';
}

function isJwtUserPayload(payload: any): payload is JwtUserPayload {
  return (
    payload &&
    typeof payload.email === 'string' &&
    typeof payload.sub === 'number' &&
    (payload.role === 'ADMIN' || payload.role === 'USER')
  );
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /* ======================
     CONNECTION
  ====================== */
  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) return client.disconnect();

      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET missing');
      }

      const decoded = jwt.verify(token, secret);
      if (!isJwtUserPayload(decoded)) {
        throw new Error('Invalid JWT payload');
      }

      client.data.user = decoded;
      console.log('✅ WS connected:', decoded.email);
    } catch (e: any) {
      console.log('❌ WS auth failed:', e.message);
      client.disconnect();
    }
  }

  /* ======================
     DISCONNECT
  ====================== */
  async handleDisconnect(client: Socket) {
    const streamId = client.data.streamId;
    const user = client.data.user as JwtUserPayload | undefined;
    if (!streamId || !user) return;

    const viewerKey = `stream:viewers:${streamId}`;
    await this.redis.srem(viewerKey, user.sub.toString());

    const count = await this.redis.scard(viewerKey);
    this.server.to(`stream-${streamId}`).emit('viewerCount', count);
  }

  /* ======================
     JOIN STREAM
  ====================== */
  @SubscribeMessage('joinStream')
  async joinStream(client: Socket, streamId: number) {
    const user = client.data.user as JwtUserPayload;
    if (!user) return;

    client.join(`stream-${streamId}`);
    client.data.streamId = streamId;

    const viewerKey = `stream:viewers:${streamId}`;
    await this.redis.sadd(viewerKey, user.sub.toString());

    this.server
      .to(`stream-${streamId}`)
      .emit('viewerCount', await this.redis.scard(viewerKey));

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
    const user = client.data.user as JwtUserPayload;

    const muteKey = `chat:mute:stream:${data.streamId}:user:${user.sub}`;
    const ttl = await this.redis.ttl(muteKey);

    if (ttl > 0) {
      client.emit('youAreMuted', { secondsLeft: ttl });
      return;
    }

    const chat = {
      id: randomUUID(),
      user: user.email,
      userId: user.sub,
      role: user.role,
      message: data.message,
      time: new Date().toISOString(),
      deleted: false,
    };

    const key = `livechat:stream:${data.streamId}`;
    await this.redis.lpush(key, JSON.stringify(chat));
    await this.redis.ltrim(key, 0, 99);

    this.server.to(`stream-${data.streamId}`).emit('chatMessage', chat);
  }

  /* ======================
     ADMIN: DELETE MESSAGE
  ====================== */
  @SubscribeMessage('adminDeleteMessage')
  async deleteMessage(
    client: Socket,
    data: { streamId: number; messageId: string },
  ) {
    const admin = client.data.user as JwtUserPayload;
    if (admin.role !== 'ADMIN') return;

    const key = `livechat:stream:${data.streamId}`;
    const messages = await this.redis.lrange(key, 0, -1);

    const updated = messages.map((m) => {
      const msg = JSON.parse(m);
      if (msg.id !== data.messageId) return m;

      msg.deleted = true;
      msg.message =
        msg.userId === admin.sub
          ? 'You deleted your message'
          : 'This message was deleted';

      return JSON.stringify(msg);
    });

    await this.redis.del(key);
    if (updated.length) await this.redis.rpush(key, ...updated);

    this.server
      .to(`stream-${data.streamId}`)
      .emit('chatMessageDeleted', { messageId: data.messageId });
  }

  /* ======================
     ADMIN: MUTE / UNMUTE
  ====================== */
  @SubscribeMessage('adminMuteUser')
  async muteUser(
    client: Socket,
    data: { streamId: number; userId: number; duration: number },
  ) {
    const admin = client.data.user as JwtUserPayload;
    if (admin.role !== 'ADMIN') return;

    const key = `chat:mute:stream:${data.streamId}:user:${data.userId}`;
    await this.redis.set(key, '1', 'EX', data.duration);

    this.server.to(`stream-${data.streamId}`).emit('userMuted', {
      userId: data.userId,
      duration: data.duration,
    });
  }

  @SubscribeMessage('adminUnmuteUser')
  async unmuteUser(
    client: Socket,
    data: { streamId: number; userId: number },
  ) {
    const admin = client.data.user as JwtUserPayload;
    if (admin.role !== 'ADMIN') return;

    const key = `chat:mute:stream:${data.streamId}:user:${data.userId}`;
    await this.redis.del(key);

    this.server.to(`stream-${data.streamId}`).emit('youAreUnmuted', {
      userId: data.userId,
    });
  }
}
