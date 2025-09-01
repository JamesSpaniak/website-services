import { IsNotEmpty, IsString } from 'class-validator';


class UserDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    write_access: boolean;

    first_name?: string;

    last_name?: string;

    email?: string;

    picture_url?: string;
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

export {
    UserDto,
    UserFull,
    UserSlim,
}