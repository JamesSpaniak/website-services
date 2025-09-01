import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleModule } from './articles/article.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { AuthModule } from './auth/auth.module';
import { defaultConnection } from './config/app.config';
import { UsersController } from './users/user.controller';
import { UsersModule } from './users/user.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CourseModule } from './courses/course.module';

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
    ScheduleModule.forRoot()
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthMiddleware)
            .forRoutes(
                { path: 'users', method: RequestMethod.GET },
                { path: 'users', method: RequestMethod.DELETE }
            ); // Create user not protected with access_token
        consumer.apply(AuthMiddleware)
            .forRoutes(
                { path: 'articles', method: RequestMethod.POST },
                { path: 'articles', method: RequestMethod.PATCH },
                { path: 'articles', method: RequestMethod.DELETE }
            ); // Get Articles not protected with access token
        consumer.apply(AuthMiddleware)
            .forRoutes(
                { path: 'courses', method: RequestMethod.POST },
                { path: 'courses', method: RequestMethod.PATCH },
                { path: 'courses', method: RequestMethod.DELETE }
            ); // Get Courses not protected with access token
    }
}
