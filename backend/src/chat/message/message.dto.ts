import { IsNotEmpty, IsString } from 'class-validator'

export class MessageDto {

    id: number

    @IsNotEmpty()
    @IsString()
    content: string
    
}