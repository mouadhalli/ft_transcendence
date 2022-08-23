import {Entity, PrimaryGeneratedColumn, Column, BeforeInsert} from 'typeorm'
import * as bcrypt from 'bcryptjs'
@Entity('user')
export class UserEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;  

    @Column({unique: true})
    username: string;

    @Column({unique: true})
    email: string;

    @Column()
    password: string;

    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 10);  
    }

}
