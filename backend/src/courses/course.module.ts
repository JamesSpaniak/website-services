import { TypeOrmModule } from "@nestjs/typeorm";
import { CourseService } from "./course.service";
import { Course } from "./types/course.entity";
import { CourseController } from "./course.controller";
import { Module } from "@nestjs/common";




@Module({
    imports: [
      TypeOrmModule.forFeature([Course])
    ],
    controllers: [CourseController],
    providers: [CourseService],
  })
  export class CourseModule {}
  