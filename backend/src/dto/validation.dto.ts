import { IsAlphanumeric, IsOptional, Max, MaxLength, Min } from 'class-validator';

export class FindQueryString {

    @IsOptional()   
    @IsAlphanumeric()
    @MaxLength(10)
    q: string;
}