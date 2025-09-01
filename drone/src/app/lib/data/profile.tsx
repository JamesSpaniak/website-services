interface UserDto {
    username: string;

    write_access: boolean;

    first_name?: string;

    last_name?: string;

    email?: string;

    picture_url?: string;
};

export type {
    UserDto
}