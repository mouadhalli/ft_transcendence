import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('users_table')
export class UserEntity {

    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    username: string;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    email: string;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    displayName: string;

    @Column({ default: '' })
    imgPath: string;

    @Column({ default: false })
    is2faEnabled: boolean;

    @Column({ nullable: true, select: false })
    twoFactorSecret: string;

    @Column({type: 'int', default: -1})
    xp: number

    @Column({type: 'int', default: 1})
    lvl: number

    @Column({ nullable: false, default: false })
    loggedIn: boolean
}
