import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { defaultConnection } from '../src/config/app.config';

const TEMPLATE = 'blog_test';

// Creates this worker's database on first use as a copy of blog_test (the
// migrations can't build the base tables from an empty DB), then applies any
// pending migrations, so the suite's own app boot has nothing left to do
// inside its 5 s hook timeout. Each worker has its own name, so no race on it.
beforeAll(async () => {
  const name = process.env.DB_NAME as string;
  const client = new Client({
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
  });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    // Workers starting together can briefly hold the template busy; retry.
    for (let attempt = 1; !rowCount; attempt++) {
      try {
        await client.query(`CREATE DATABASE "${name}" TEMPLATE "${TEMPLATE}"`);
        break;
      } catch (err) {
        if (attempt >= 20 || !/being accessed by other users/.test(String(err)))
          throw err;
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
  } finally {
    await client.end();
  }
  // defaultConnection read DB_NAME after jest-e2e.db-env.ts set it.
  const ds = new DataSource(defaultConnection);
  await ds.initialize();
  try {
    await ds.runMigrations();
  } finally {
    await ds.destroy();
  }
}, 180_000);
