import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { User } from "src/user/decorators/user.decorator";
import { GameService } from "./game.service";


@Controller('game')
export class GameController {

    constructor(
        private gameService: GameService,
    ) {}

    @Get('user-games/:user_id')
    @UseGuards(JwtAuthGuard)
    async getUserGames(
        @Param('user_id', ParseIntPipe) userId: number,
    ) {
        return await this.gameService.findUserGames(userId)
    }

    @Get('user-profile/:user_id')
    @UseGuards(JwtAuthGuard)
    async getUserProfile(
        @Param('user_id', ParseIntPipe) userId: number,
    ) {
        const totalWins: number = await this.gameService.countUserWins(userId)
        const totalDefeats: number = await this.gameService.countUserDefeats(userId)
        const totalGamesPlayed: number = await this.gameService.countUserTotalGamesPlayed(userId)
        const totalGoals: number = await this.gameService.countUserTotalGoals(userId)
        const { xp, lvl } = await this.gameService.getUserXpAndLvl(userId)

        return {totalGamesPlayed, totalGoals, totalWins, totalDefeats, xp, lvl}
    }

}