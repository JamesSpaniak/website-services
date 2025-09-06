import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/courses/types/course.entity';
import { User } from 'src/users/types/user.entity';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course])],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}