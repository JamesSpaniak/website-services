import { TypeOrmModule } from "@nestjs/typeorm";
import { Progress } from "./types/progress.entity";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { Module } from "@nestjs/common";
import { Course } from "src/courses/types/course.entity";
import { CourseUnit } from "src/courses/types/course-unit.entity";
import { AuditModule } from "src/audit/audit.module";

@Module({
    imports: [
        AuditModule,
        TypeOrmModule.forFeature([Progress, Course, CourseUnit]),
    ],
    controllers: [ProgressController],
    providers: [ProgressService],
    exports: [ProgressService],
})
export class ProgressModule {}
