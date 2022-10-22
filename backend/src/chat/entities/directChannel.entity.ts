import { UserEntity } from "src/user/entities/user.entity"
import { AfterUpdate, BeforeUpdate, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { RelationCountAttribute } from "typeorm/query-builder/relation-count/RelationCountAttribute"
import { ChannelMembershipEntity } from "./channelMember.entity"
import { MessageEntity } from "./message.entity"

@Entity('direct_channel_table')
export class DirectChannelEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinTable()
    memberA: UserEntity

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinTable()
    memberB: UserEntity

}