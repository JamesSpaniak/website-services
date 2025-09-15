import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './types/user.entity';
import { UpdateUserDto, UserDto, UserFull } from './types/user.dto';
import { Role } from './types/role.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
  ) {}
  private readonly logger = new Logger(UsersService.name);

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

  async getUserById(id: number): Promise<User> {
    return this.userRepository.findOne({
        where: { id: id },
        join: {
            alias: 'user',
            leftJoinAndSelect: {
                purchasedCourses: 'user.purchased_courses',
            },}
    });
  }


  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({
        where: { username: username },
        relations: ['purchased_courses'],
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({
        where: { email: email }
    });
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
        purchased_courses: undefined,
        token_version: 0,
    }
    return this.userRepository.save(user); // TODO add unique constraint on email
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Merge the validated DTO into the user entity
    this.userRepository.merge(user, data);
    user.token_version = (user.token_version || 0) + 1;
    return this.userRepository.save(user);
  }

  async updatePassword(id: number, password: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.password = password; // The password should already be hashed
    user.token_version = (user.token_version || 0) + 1;
    await this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async incrementTokenVersion(userId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) {
      user.token_version = (user.token_version || 0) + 1;
      await this.userRepository.save(user);
    }
  }

  /**
   * A scheduled job that runs daily to deactivate expired Pro memberships.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredProMemberships() {
    this.logger.log('Running scheduled job: Deactivating expired Pro memberships...');
    const expiredUsers = await this.userRepository.find({
      where: {
        role: Role.Pro,
        pro_membership_expires_at: LessThan(new Date()),
      },
    });

    if (expiredUsers.length > 0) {
      for (const user of expiredUsers) {
        user.role = Role.User;
        user.pro_membership_expires_at = null;
        user.token_version = (user.token_version || 0) + 1; // Invalidate tokens
      }
      await this.userRepository.save(expiredUsers);
      this.logger.log(`Deactivated ${expiredUsers.length} expired Pro memberships.`);
    } else {
      this.logger.log('No expired Pro memberships found.');
    }
  }
}
