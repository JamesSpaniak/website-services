import { TypeOrmModule } from "@nestjs/typeorm";
import { Progress } from "./types/progress.entity";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { Course } from "src/courses/types/course.entity";
import { Module } from "@nestjs/common";
import { CourseService } from "src/courses/course.service";
import { User } from "src/users/types/user.entity";


@Module({
    imports: [TypeOrmModule.forFeature([Progress, Course, User])],
    controllers: [ProgressController],
    providers: [ProgressService, CourseService]
})
export class ProgressModule {}