import { TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from "src/user/user.entity";

export const typeormConfig :TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST'),
      port: +configService.get<number>('DB_PORT'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
      entities: [UserEntity],
      synchronize: true,
    }),
    inject: [ConfigService],
}