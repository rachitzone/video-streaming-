import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

async function bootstrap() {

  console.log('ENV JWT SECRET:', process.env.JWT_SECRET);

  const app = await NestFactory.create(AppModule);

  // 🔥 FIXED CORS (mobile safe)
  app.enableCors({
    origin: "*",                       // allow all origins
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "*",
    credentials: false,                // IMPORTANT
  });

  await app.listen(3000, "0.0.0.0");    // allow mobile access
}

bootstrap();