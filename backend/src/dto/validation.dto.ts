import { IsAlphanumeric, IsOptional, Max, MaxLength, Min } from 'class-validator';

export class validateQueryString {

    @IsOptional()   
    @IsAlphanumeric()
    @MaxLength(10)
    q: string;
}

export class ValidateDisplayName {
    @IsAlphanumeric()
    @MaxLength(10)
    displayName: string
}