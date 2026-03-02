import { TypeOrmModule } from "@nestjs/typeorm";
import { CourseService } from "./course.service";
import { Course } from "./types/course.entity";
import { CourseController } from "./course.controller";
import { Module } from "@nestjs/common";
import { User } from "src/users/types/user.entity";
import { Progress } from "../progress/types/progress.entity";
import { CourseProgressService } from "./course-progress.service";
import { UsersModule } from "src/users/user.module";
import { MediaModule } from "src/media/media.module";
import { OrganizationModule } from "src/organizations/organization.module";

@Module({
    imports: [
        UsersModule,
        MediaModule,
        OrganizationModule,
        TypeOrmModule.forFeature([Course, User, Progress])
    ],
    controllers: [CourseController],
    providers: [CourseService, CourseProgressService],
    exports: [CourseService],
  })
  export class CourseModule {}
