import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //filter out Properties
      transform: true //transform payloads to be objects typed according to their DTO classes
    })
  );
  app.enableCors({
    // origin: 'http://localhost:8080'
    origin: `http://${process.env.APP_NAME}:${process.env.FRONT_END_PORT}`
  })
  await app.listen(process.env.HOST_PORT);
}
bootstrap();
