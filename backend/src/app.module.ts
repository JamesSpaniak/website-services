import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleModule } from './articles/article.module';
import { AuthModule } from './auth/auth.module';
import { defaultConnection } from './config/app.config';
import { UsersModule } from './users/user.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CourseModule } from './courses/course.module';
import { PurchaseModule } from './purchases/purchase.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [
    ArticleModule,
    AuthModule,
    CourseModule,
    TypeOrmModule.forRoot({
        ...defaultConnection,
        migrationsRun: true,
    }),
    UsersModule,
    PurchaseModule,
    ProgressModule,
    ScheduleModule.forRoot()
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {

    }
}
