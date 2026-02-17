import { DataSource } from 'typeorm';
import { defaultConnection } from './app.config';

const dataSource = new DataSource({
    ...defaultConnection,
    logging: true,
});

export default dataSource;