import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { StreamsModule } from '../streams/streams.module';

@Module({
  imports: [
    RedisModule,
    ConfigModule,
    StreamsModule, // 👈 THIS FIXES THE ERROR
  ],
  providers: [ChatGateway],
})
export class ChatModule {}
