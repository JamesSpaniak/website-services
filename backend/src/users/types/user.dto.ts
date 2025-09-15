import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDate, IsArray, IsNumber } from 'class-validator';
import { Role } from './role.enum';


export class UserSlim {
    @ApiProperty()
    @Expose()
    @IsString()
    username: string;

    @ApiPropertyOptional()
    @Expose()
    @IsOptional()
    @IsString()
    first_name?: string;

    @ApiPropertyOptional()
    @Expose()
    @IsOptional()
    @IsString()
    last_name?: string;

    @ApiPropertyOptional()
    @Expose()
    @IsOptional()
    @IsString()
    picture_url?: string;
}

export class UserFull extends UserSlim {
    @ApiProperty()
    @Expose()
    @IsNumber()
    id: number;

    @ApiProperty()
    @Expose()
    @IsEmail()
    email: string;

    @ApiProperty({ enum: Role })
    @Expose()
    role: Role;

    @ApiPropertyOptional()
    @Expose()
    @IsOptional()
    pro_membership_expires_at?: Date;

    @ApiPropertyOptional({ type: [String] })
    @Expose()
    @IsArray()
    courses?: string[];

    @ApiProperty()
    @Expose()
    submitted_at?: Date;

    @ApiProperty()
    @Expose()
    updated_at?: Date;
}

export class UserDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    first_name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    last_name?: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    picture_url?: string;
};

export class UpdateUserDto {
    @ApiPropertyOptional({ description: "User's email address." })
    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: "User's first name." })
    @IsOptional()
    @IsString()
    first_name?: string;

    @ApiPropertyOptional({ description: "User's last name." })
    @IsOptional()
    @IsString()
    last_name?: string;
}