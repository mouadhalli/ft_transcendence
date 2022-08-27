import {Entity, PrimaryColumn, Column} from 'typeorm'
// import * as bcrypt from 'bcryptjs'
@Entity('user')
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
    imageUrl: string;

    @Column({ default: false })
    is2faEnabled: boolean;

/* in typescript:
    ? = optional = we can create a user without the optional collumn = allowed to be undefined
    ! = telling Typescript to not warn you that you didn't initialize it */
    @Column({ nullable: true })
    twoFactorSecret?: string;

}
