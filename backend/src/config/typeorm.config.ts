import { TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from "src/user/entities/user.entity";
import { RelationshipEntity } from "src/user/entities/friendship.entity";
import { ChannelEntity } from "src/chat/entities/channel.entity";
import { ChannelMembershipEntity } from "src/chat/entities/channelMember.entity";
import { MessageEntity } from "src/chat/entities/message.entity";

export const typeormConfig :TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST'),
      port: +configService.get<number>('DB_PORT'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
      entities: [UserEntity, RelationshipEntity, ChannelEntity, ChannelMembershipEntity, MessageEntity],
      synchronize: true,
    }),
    inject: [ConfigService],
}