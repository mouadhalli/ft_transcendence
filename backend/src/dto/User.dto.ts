import { IsNumber, IsNotEmpty, IsAlphanumeric, IsEmail, IsUrl } from 'class-validator'

export class UserDto {
    @IsNotEmpty()
	@IsNumber()
	id: number

    @IsNotEmpty()
    @IsAlphanumeric()
    username: string

    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsAlphanumeric()
    displayName: string

    @IsNotEmpty()
    @IsUrl()
    imgPath: string

    is2faEnabled: boolean

    xp?: number

    lvl?: number

    loggedIn: boolean
}
