import { TypeOrmModuleAsyncOptions } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from "src/user/entities/user.entity";
import { RelationshipEntity } from "src/user/entities/relationship.entity";
import { ChannelEntity } from "src/chat/entities/channel.entity";
import { ChannelMembershipEntity } from "src/chat/entities/channelMember.entity";
import { MessageEntity } from "src/chat/entities/message.entity";
import { GameEntity } from "src/game/entities/game.entity";
import { ScoreEntity } from "src/game/entities/score.entity";
import { DirectMessageEntity } from "src/chat/entities/directMessage.entity";
import { DirectChannelEntity } from "src/chat/entities/directChannel.entity";

export const typeormConfig: TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST'),
      port: +configService.get<number>('DB_PORT'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
      entities: [
        UserEntity, RelationshipEntity, ChannelEntity,
        ChannelMembershipEntity, MessageEntity, DirectMessageEntity,
        DirectChannelEntity, GameEntity, ScoreEntity],
      synchronize: true,
    }),
    inject: [ConfigService],
}