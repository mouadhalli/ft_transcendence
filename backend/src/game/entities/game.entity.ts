import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../../user/entities/user.entity";
import { ScoreEntity } from "./score.entity";

@Entity('game_match_table')
export class GameEntity {

    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => UserEntity, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'        
    })
    winner: UserEntity

    @ManyToOne(() => UserEntity, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'        
    })
    opponent: UserEntity

    @OneToOne(() => ScoreEntity, (score) => score.game ,{
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    score: ScoreEntity

}
