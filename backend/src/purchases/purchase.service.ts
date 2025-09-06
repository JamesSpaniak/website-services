import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/courses/types/course.entity';
import { Role } from 'src/users/types/role.enum';
import { User } from 'src/users/types/user.entity';
import { Repository } from 'typeorm';
import { ProMembershipDuration } from './types/purchase.dto';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async purchaseCourse(userId: number, courseId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['purchased_courses'],
    });
    const course = await this.courseRepository.findOneBy({ id: courseId });

    if (!user || !course) {
      throw new NotFoundException('User or Course not found.');
    }

    const alreadyOwns = user.purchased_courses.some((c) => c.id === course.id);
    if (alreadyOwns) {
      throw new BadRequestException('You have already purchased this course.');
    }

    user.purchased_courses.push(course);
    return this.userRepository.save(user);
  }

  async upgradeToPro(userId: number, duration: ProMembershipDuration): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin) throw new BadRequestException('Admins cannot be downgraded to Pro.');

    const now = new Date();
    const expiryDate = duration === ProMembershipDuration.Monthly
      ? new Date(now.setMonth(now.getMonth() + 1))
      : new Date(now.setFullYear(now.getFullYear() + 1));

    user.role = Role.Pro;
    user.pro_membership_expires_at = expiryDate;
    return this.userRepository.save(user);
  }
}