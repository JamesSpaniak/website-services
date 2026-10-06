// One database per Jest worker (blog_test_1, blog_test_2, …): every e2e suite
// TRUNCATEs shared tables, so suites in parallel workers must not share a DB.
// Runs before the test file imports app config, which reads DB_NAME at load.
const base = process.env.DB_NAME || 'blog_test';
if (base === 'blog') {
  throw new Error('e2e tests truncate tables — never point DB_NAME at blog');
}
process.env.DB_NAME = `${base}_${process.env.JEST_WORKER_ID || '1'}`;
