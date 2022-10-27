import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //filter out Properties
      transform: true //transform payloads to be objects typed according to their DTO classes
    })
  );
  app.enableCors({
    origin: 'http://localhost:8080'
  })
  await app.listen(3000);
}
bootstrap();
