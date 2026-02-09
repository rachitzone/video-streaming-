import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamsService } from './streams.service';
import { StreamsController } from './streams.controller';
import { Stream } from './streams.entity';
import { RedisModule } from '../redis/redis.module';
import { StreamViewerService } from './streams.viewer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stream]),
    RedisModule,
  ],
  controllers: [StreamsController],
  providers: [
    StreamsService,
    StreamViewerService,
  ],
  exports: [
    StreamViewerService, // 👈 MOST IMPORTANT
  ],
})
export class StreamsModule {}
