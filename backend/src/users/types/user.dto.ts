import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';


class UserDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    first_name?: string;

    last_name?: string;

    email?: string;

    picture_url?: string;
    role?: string;
    pro_membership_expires_at?: Date;
    courses?: string[];
};

type UserDtoResponseOnly = {
    id?: number;

    submitted_at?: Date;

    updated_at?: Date;
};

type UserFull = UserDto & UserDtoResponseOnly;

type UserSlim = {
    username: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
}

class UpdateUserDto {
    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    last_name?: string;
}

export {
    UpdateUserDto,
    UserDto,
    UserFull,
    UserSlim,
}