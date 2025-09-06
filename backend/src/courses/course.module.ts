import { TypeOrmModule } from "@nestjs/typeorm";
import { CourseService } from "./course.service";
import { Course } from "./types/course.entity";
import { CourseController } from "./course.controller";
import { Module } from "@nestjs/common";
import { User } from "src/users/types/user.entity";
import { Progress } from "../progress/types/progress.entity";
import { CourseProgressService } from "./course-progress.service";




@Module({
    imports: [
      TypeOrmModule.forFeature([Course, User, Progress])
    ],
    controllers: [CourseController],
    providers: [CourseService, CourseProgressService],
  })
  export class CourseModule {}
  