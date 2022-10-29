import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './user/user.module';
import { typeormConfig } from './config/typeorm.config';
import { gameModule } from './game/game.module';
import { ChatModule } from './chat/chat.module';
import { AppGateway } from './app.gateway';
import { GatewayConnectionService } from './connection.service';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		TypeOrmModule.forRootAsync(typeormConfig),
		UsersModule,
		AuthModule,
		ChatModule,
		gameModule
	],
	providers: [AppGateway, GatewayConnectionService],
	controllers: [AppController]
})

export class AppModule {}
