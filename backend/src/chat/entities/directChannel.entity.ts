import { Entity, OneToOne, PrimaryColumn } from "typeorm"
import { RelationshipEntity } from '../../user/entities/relationship.entity'
import { v4 as uuidv4 } from 'uuid';

@Entity('direct_channel_table')
export class DirectChannelEntity {

    @PrimaryColumn()
    id: string = uuidv4()

    @OneToOne(() => RelationshipEntity, (relationship) => relationship.dm, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    relationship: RelationshipEntity
}