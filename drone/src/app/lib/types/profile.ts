interface UserDto {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
    role: string; // e.g., 'user', 'admin', 'pro'
    pro_membership_expires_at?: Date;
}

interface CreateUserDto {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

interface ContactPayload {
    name: string;
    contact: string;
    message: string;
}

export type {
    CreateUserDto,
    ContactPayload,
    UserDto
}