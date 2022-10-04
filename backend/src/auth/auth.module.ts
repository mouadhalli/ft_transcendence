import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { FortyTwoStrategy } from './strategies/42.strategy'
import { TwofaController } from './twoFactorAuthentication/twofa.controller';
import { TwofaService } from './twoFactorAuthentication/twofa.service';

const jwtFactory = {
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get('JWT_SECRET'),
    signOptions: {
      expiresIn: configService.get('JWT_EXP_D'),
    },
  }),
  inject: [ConfigService],
};

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync(jwtFactory),
  ],
  providers: [AuthService, JwtStrategy, FortyTwoStrategy, TwofaService],
  exports: [AuthService],
  controllers: [AuthController, TwofaController],
})
export class AuthModule {}
