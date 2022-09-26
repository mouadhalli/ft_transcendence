import { UserEntity } from "src/user/entities/user.entity"
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { ChannelMembershipEntity } from "./channelMember.entity"
import { MessageEntity } from "./message.entity"

export enum Channel_Type {
    PRIVATE = 'private',    // private direct channel or group channel accessible on invite only
    PUBLIC = 'public',      // public  groupe channel without a password
    PROTECTED = 'protected', // public groupe channel protected with a password
    DIRECT = 'direct'        // I need to think more about this
}

@Entity('channel_table')
export class ChannelEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'varchar',
        default: '',
    })
    name: string

    @Column({
        type: 'varchar',
        nullable: true
    })
    password?: string

    @Column({
        type: 'varchar',
        nullable: true
        // default: ''
    })
    img_path?: string

    @Column({
        type: 'enum',
        enum: Channel_Type ,
        default: Channel_Type.PUBLIC ,
    })
    type: Channel_Type

    @OneToMany(() => ChannelMembershipEntity, (membership) => membership.channel, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    members: ChannelMembershipEntity[]

}