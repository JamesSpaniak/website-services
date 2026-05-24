interface UserDto {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
    role: string; // e.g., 'user', 'admin', 'pro'
    pro_membership_expires_at?: Date;
    organization?: { id: number; name: string; role: 'manager' | 'member' };
}

interface CreateUserDto {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    invite_code?: string;
}

interface ContactPayload {
    name: string;
    contact: string;
    message: string;
}

interface ConsultationPayload {
    name: string;
    email: string;
    organization: string;
    role: string;
    student_count?: string;
    preferred_time: string;
    topics: string;
}

export type {
    CreateUserDto,
    ContactPayload,
    ConsultationPayload,
    UserDto
}