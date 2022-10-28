import { IsAlphanumeric, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class validateQueryString {

    @IsOptional()   
    @IsAlphanumeric()
    @MaxLength(10)
    q: string;
}

export class ValidateDisplayName {

    @IsNotEmpty()
    @IsAlphanumeric()
    @MaxLength(10)
    displayName: string

}