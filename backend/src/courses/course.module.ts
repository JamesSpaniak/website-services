import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './course.service';
import { Course } from './types/course.entity';
import { CourseUnit } from './types/course-unit.entity';
import { CourseController } from './course.controller';
import { Module } from '@nestjs/common';
import { User } from 'src/users/types/user.entity';
import { Question } from 'src/questions/types/question.entity';
import { CourseUnitService } from './course-unit.service';
import { UsersModule } from 'src/users/user.module';
import { MediaModule } from 'src/media/media.module';
import { OrganizationModule } from 'src/organizations/organization.module';
import { ProgressModule } from 'src/progress/progress.module';

@Module({
  imports: [
    UsersModule,
    MediaModule,
    OrganizationModule,
    ProgressModule,
    TypeOrmModule.forFeature([Course, CourseUnit, User, Question]),
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseUnitService],
  exports: [CourseService, CourseUnitService],
})
export class CourseModule {}
