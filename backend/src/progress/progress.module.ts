import { TypeOrmModule } from "@nestjs/typeorm";
import { Progress } from "./types/progress.entity";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { Module } from "@nestjs/common";
import { CourseModule } from "src/courses/course.module";
import { Course } from "src/courses/types/course.entity";

@Module({
    imports: [
        CourseModule,
        TypeOrmModule.forFeature([Progress, Course]),
    ],
    controllers: [ProgressController],
    providers: [ProgressService],
})
export class ProgressModule {}