import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { GatewayConnectionService } from "src/connection.service";
import { UsersModule } from "src/user/user.module";
import { GameEntity } from "./entities/game.entity";
import { ScoreEntity } from "./entities/score.entity";
import { GameController } from "./game.controller";
import { gameGateway } from "./game.gateway";
import { GameService } from "./game.service";

const jwtFactory = {
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get('JWT_SECRET2'),
    signOptions: {
      expiresIn: configService.get('JWT_EXP_Game'),
    },
  }),
  inject: [ConfigService],
};

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEntity, ScoreEntity]),
    UsersModule,
    AuthModule,
    JwtModule.registerAsync(jwtFactory)
  ],
  controllers: [GameController],
  providers: [gameGateway, GameService, GatewayConnectionService],
})

export class gameModule {}
