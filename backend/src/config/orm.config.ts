import { DataSource } from 'typeorm';
import { defaultConnection } from './app.config';

const dataSource = new DataSource({
  ...defaultConnection,
  // Full SQL echo locally; errors only in production (app-review L1 — query
  // parameters can carry emails and tokens).
  logging: process.env.NODE_ENV === 'production' ? ['error'] : true,
});

export default dataSource;
