import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StreamsModule } from './streams/streams.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgress',
      database: 'videostream',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    StreamsModule,
    RedisModule,

    ChatModule,
  ],
})
export class AppModule {}
