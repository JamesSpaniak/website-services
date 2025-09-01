import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './types/user.entity';
import { UserDto, UserFull } from './types/user.dto';

@Injectable()
export class UsersService {
  constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
  ) {}

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, user: User): Promise<boolean> {
    if(!(password && user))
        return false;
    try {
        return bcrypt.compare(password, user.password);
    } catch(err) {
        return false;
    }
  }

  async getUserByUsername(username: string): Promise<UserFull | undefined> {
    const res = this.userRepository.findOne({
        where: { username: username }
    });
    return res;
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async saveUser(user: User): Promise<User> {
    const hashedPassword = await UsersService.hashPassword(user.password);
    return this.userRepository.save({
        ...user,
        password: hashedPassword
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
