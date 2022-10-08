import { IsAlphanumeric } from 'class-validator';

export class FindQueryString {

    @IsAlphanumeric()
    username: string;

}