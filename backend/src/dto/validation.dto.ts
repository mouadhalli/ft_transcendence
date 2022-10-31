import { IsAlphanumeric, IsNotEmpty, IsNumber, isNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class validateQueryString {

    @IsOptional()
    @IsAlphanumeric()
    @MaxLength(10)
    q: string;
}

export class ValidateDisplayName {

    @IsOptional()
    @IsAlphanumeric()
    @IsString()
    @MaxLength(10)
    displayName: string

}

export class getIdsData {

    @IsNotEmpty()
    @IsString()
    token: string

    @IsNotEmpty()
    id: any
    
    @IsString()
    socket: string
    
    @IsString()
    room: string
    
    @IsNotEmpty()
    @IsString()
    mode: string

    @IsNotEmpty()
    pos: any
}

export class mouseData {

    @IsString()
    room: string

    @IsNumber()
    pos: number
    
    @IsNumber()
    mousepos: number
    
}