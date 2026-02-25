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

interface JwtUserPayload {
  email: string;
  sub: number;
  role: 'ADMIN' | 'USER';
}

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
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
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
      const token = client.handshake.auth?.token;

      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET missing');

        const decoded = jwt.verify(token, secret) as any;

        const user: ConnectedUser = {
          type: 'user',
          email: decoded.email,
          sub: decoded.sub,
          role: decoded.role,
        };

        client.data.user = user;
        console.log('✅ User connected:', decoded.email);
      } else {
        // 🔥 GUEST MODE
        const guestId =
          client.handshake.auth?.guestId || randomUUID();

        const guest: ConnectedUser = {
          type: 'guest',
          guestId,
          name: `Guest_${guestId.slice(0, 5)}`,
        };

        client.data.user = guest;
        console.log('👤 Guest connected:', guestId);
      }
    } catch (e) {
      console.log('❌ WS auth failed');
      client.disconnect();
    }
  }

  /* ======================
     DISCONNECT
  ====================== */
  async handleDisconnect(client: Socket) {
    const streamId = client.data.streamId;
    if (!streamId) return;

    const viewerKey = `stream:viewers:${streamId}`;
    const user: ConnectedUser = client.data.user;

    const viewerId =
      user.type === 'user' ? user.sub : user.guestId;

    if (!viewerId) return;

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

    const viewerKey = `stream:viewers:${streamId}`;
    const user: ConnectedUser = client.data.user;

    const viewerId =
      user.type === 'user' ? user.sub : user.guestId;

    if (!viewerId) return;

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

    const chat = {
      id: randomUUID(),
      user:
        user.type === 'user'
          ? user.email
          : user.name,
      userId:
        user.type === 'user'
          ? user.sub
          : user.guestId,
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

      if (msg.id !== data.messageId) return m;

      msg.deleted = true;
      msg.message = 'This message was deleted';

      return JSON.stringify(msg);
    });

    await this.redis.del(key);
    if (updated.length) await this.redis.rpush(key, ...updated);

    this.server
      .to(`stream-${data.streamId}`)
      .emit('chatMessageUpdated', {
        messageId: data.messageId,
      });
  }
}