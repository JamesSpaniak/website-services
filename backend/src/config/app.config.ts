import { DataSourceOptions } from 'typeorm';
import { Article } from '../articles/types/article.entity';
import { User } from '../users/types/user.entity';
import { Course } from '../courses/types/course.entity';


const defaultConnection: DataSourceOptions = {
    type: 'postgres',
    database: process.env.DB_NAME || 'blog',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    entities: [
        Article,
        Course,
        User
    ],
    migrations: [
        'dist/**/migrations/**'
    ]
};

export {
    defaultConnection,
}