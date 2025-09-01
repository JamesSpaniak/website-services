import { DataSource } from 'typeorm';
import { defaultConnection } from './app.config';

export default new DataSource({
    ...defaultConnection,
    logging: true,
});