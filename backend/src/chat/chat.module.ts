import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service'
import { AuthModule } from '../auth/auth.module'
import { ChannelController } from './channel/channel.controller';
import { ChannelService } from './channel/channel.service';
import { MessageService } from './message/message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelEntity } from './entities/channel.entity';
import { ChannelMembershipEntity } from './entities/channelMember.entity';
import { MessageEntity } from './entities/message.entity';
import { UsersModule } from 'src/user/user.module';
import { GatewayConnectionService } from 'src/connection.service';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChannelEntity,
            ChannelMembershipEntity,
            MessageEntity
        ]),
        AuthModule,
        UsersModule,
    ],
    controllers: [ChannelController],
    providers: [ChatGateway, ChatService, ChannelService, MessageService, GatewayConnectionService],
})

export class ChatModule {}
