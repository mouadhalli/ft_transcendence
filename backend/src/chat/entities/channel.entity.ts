import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm"
import { ChannelMembershipEntity } from "./channelMember.entity"
import { MessageEntity } from "./message.entity"
import { v4 as uuidv4 } from 'uuid';

export enum Channel_Type {
    PRIVATE = 'private',    // private groupe channel accessible on invite only
    PUBLIC = 'public',      // public  groupe channel without a password
    PROTECTED = 'protected', // public groupe channel protected with a password
}

@Entity('channel_table')
export class ChannelEntity {

    @PrimaryColumn()
    id: string = uuidv4()

    @Column({ unique: true })
    name: string

    @Column({
        nullable: true,
        select: false
    })
    password?: string

    @Column({ nullable: true })
    imgPath: string

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

    @OneToMany(() => MessageEntity, (message) => message.id, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    messages: MessageEntity[]

    @Column({type: 'int', default: 0})
    membersCount: number

}