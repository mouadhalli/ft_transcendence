import { IsAlphanumeric, IsOptional } from 'class-validator';

export class FindQueryString {

    @IsOptional()
    @IsAlphanumeric()
    username: string;

}