import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UserService } from "src/user/user.service";
import { GameService } from "./game.service";


@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {

    constructor(
        private gameService: GameService,
        private userService: UserService,
    ) {}

    @Get('user-games/:user_id')
    async getUserGames(
        @Param('user_id', ParseIntPipe) userId: number,
    ) {
        return await this.gameService.findUserGames(userId)
    }

    @Get('user-profile/:user_id')
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

    @Get('leaderboard')
    async getLeaderboard(
    ) {
        return await this.userService.getUsersSortedWithXp()
    }

}