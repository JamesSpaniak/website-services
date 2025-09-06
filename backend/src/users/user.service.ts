import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './types/user.entity';
import { UpdateUserDto, UserDto, UserFull } from './types/user.dto';
import { Role } from './types/role.enum';

@Injectable()
export class UsersService {
  constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
  ) {}

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, expectedPassword: string): Promise<boolean> {
    if(!(password && expectedPassword))
        return false;
    try {
        return bcrypt.compare(password, expectedPassword);
    } catch(err) {
        return false;
    }
  }

  async getUserByUsername(username: string): Promise<UserFull | undefined> {
    const repRes = await this.userRepository.findOne({
        where: { username: username }
    });
    if(repRes.purchased_courses === undefined)
        repRes.purchased_courses = []
    const res: UserFull = {
        ...repRes,
        role: repRes.role.toString(),
        pro_membership_expires_at: repRes.pro_membership_expires_at,
        courses: repRes.purchased_courses.map((course) => course.id.toString()),
    }

    return res;
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async saveUser(userDto: UserDto): Promise<User> {
    const hashedPassword = await UsersService.hashPassword(userDto.password);
    const user: User = {
        ...userDto,
        password: hashedPassword,
        role: Role.User,
        pro_membership_expires_at: undefined,
        purchased_courses: undefined
    }
    return this.userRepository.save(user);
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Merge the validated DTO into the user entity
    this.userRepository.merge(user, data);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
