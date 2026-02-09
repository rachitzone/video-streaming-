import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stream } from './streams.entity';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { StreamViewerService } from './streams.viewer.service';

@Injectable()
export class StreamsService {
  constructor(
    @InjectRepository(Stream)
    private streamRepo: Repository<Stream>,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,

    private readonly viewerService: StreamViewerService,
  ) {}

  // ✅ CREATE
  async createStream(hostId: number, title: string) {
    const stream = this.streamRepo.create({
      host_id: hostId,
      title,
      stream_key: randomUUID(),
      status: 'CREATED',
    });

    return this.streamRepo.save(stream);
  }

  // ✅ LIST ADMIN STREAMS
  async getStreamsByHost(hostId: number) {
    return this.streamRepo.find({
      where: { host_id: hostId },
      order: { created_at: 'DESC' },
    });
  }

  // ✅ START STREAM (OWNERSHIP CHECK)
  async startStream(streamId: number, user: any) {
    const stream = await this.streamRepo.findOne({
      where: { id: streamId },
    });

    if (!stream) throw new NotFoundException();

    if (stream.host_id !== user.sub) {
      throw new ForbiddenException();
    }

    return this.streamRepo.update(streamId, {
      status: 'LIVE',
    });
  }

  // ✅ END STREAM (LOCK CHAT + CLEANUP)
  async endStream(streamId: number, user: any) {
    const stream = await this.streamRepo.findOne({
      where: { id: streamId },
    });

    if (!stream) throw new NotFoundException();

    if (stream.host_id !== user.sub) {
      throw new ForbiddenException();
    }

    // DB update
    await this.streamRepo.update(streamId, {
      status: 'ENDED',
      ended_at: new Date(),
    });

    // 🔥 cleanup
    await this.redis.set(
  `chat:locked:stream:${streamId}`,
  '1',
  'EX',
  60 * 60
);

    await this.redis.del(`livechat:stream:${streamId}`);
    await this.redis.set(`chat:locked:stream:${streamId}`, '1');
    await this.viewerService.resetViewers(streamId);

    return { message: 'Stream ended' };
  }

  async getLiveStreams() {
  return this.streamRepo.find({
    where: { status: 'LIVE' },
    select: ['id', 'title', 'status', 'created_at'],
    order: { created_at: 'DESC' },
  });
}


  // 🌍 PUBLIC
  async getStream(id: number) {
    return this.streamRepo.findOne({ where: { id } });
  }
}
