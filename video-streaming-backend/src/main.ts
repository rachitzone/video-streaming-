import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

async function bootstrap() {
  console.log('ENV JWT SECRET:', process.env.JWT_SECRET);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // remove verbose/debug
  });

  // 🔥 ENABLE CORS (THIS IS THE KEY FIX)
  app.enableCors({
    origin: true, // 🔥 allow ALL origins (DEV ONLY)
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
