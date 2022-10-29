import { IsAlphanumeric, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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