import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './types/question.entity';
import { Exam } from './types/exam.entity';
import { ExamAttempt } from './types/exam-attempt.entity';
import { ClassExam } from './types/class-exam.entity';
import { Progress } from '../progress/types/progress.entity';
import { User } from '../users/types/user.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
import { QuestionService } from './question.service';
import { ExamGeneratorService } from './exam-generator.service';
import { ExamAttemptService } from './exam-attempt.service';
import { ManagerOrAdminGuard } from './guards/manager-or-admin.guard';
import { QuestionController } from './question.controller';
import { ExamController } from './exam.controller';
import { CourseModule } from '../courses/course.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      Exam,
      ExamAttempt,
      ClassExam,
      Progress,
      User,
      OrganizationMember,
    ]),
    CourseModule, // provides CourseService for access-control checks
  ],
  controllers: [QuestionController, ExamController],
  providers: [QuestionService, ExamGeneratorService, ExamAttemptService, ManagerOrAdminGuard],
  exports: [QuestionService, ExamGeneratorService, ExamAttemptService, ManagerOrAdminGuard],
})
export class QuestionModule {}
