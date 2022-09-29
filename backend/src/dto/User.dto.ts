import {IsNumber, IsString, IsNotEmpty, IsAlphanumeric, IsEmail, IsUrl, IsOptional} from 'class-validator'

/*
There are few special tokens you can use in your messages:

$value - the value that is being validated
$property - name of the object's property being validated
$target - name of the object's class being validated
$constraint1, $constraint2, ... $constraintN - constraints defined by specific validation type
*/


// export class RegisterInput {
//     @IsNotEmpty()
//     @Length(6, 30)
//     username: string

//     @IsNotEmpty()
//     @IsEmail()
//     email: string

//     @IsNotEmpty()
//     @MinLength(8)
//     // @Matches(/((=.*\d)|(=.*\W+))(![.\n])(=.*[A-Z])(=.*[a-z]).*$/, {message: 'password too weak'})
//     password: string

//     @IsNotEmpty()
//     confirmPassword: string

// }

// export class LoginInput {
//     @IsNotEmpty()
//     username: string
    
//     @IsNotEmpty()
//     password: string
// }

// export interface UserDto {
//     id: number
//     username: string
// }

export class UserDto {
    @IsNotEmpty()
	@IsNumber()
	id: number

    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    username: string

    // @IsString()
    @IsNotEmpty()
    @IsEmail() // handle isString
    email: string

    @IsNotEmpty()
    @IsString()
    displayName: string

    @IsNotEmpty()
    @IsUrl() // also handles IsString case
    imageUrl: string

    is2faEnabled: boolean

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    twoFactorSecret?: string
}
