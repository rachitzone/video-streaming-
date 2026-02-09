import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class StreamViewerService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async addViewer(streamId: number) {
    return this.redis.incr(`stream:${streamId}:viewer_count`);
  }

  async removeViewer(streamId: number) {
    const count = await this.redis.decr(`stream:${streamId}:viewer_count`);
    return count < 0 ? 0 : count;
  }

  async getViewerCount(streamId: number) {
    const count = await this.redis.get(`stream:${streamId}:viewer_count`);
    return Number(count) || 0;
  }

  async resetViewers(streamId: number) {
    await this.redis.del(`stream:${streamId}:viewer_count`);
  }
}
