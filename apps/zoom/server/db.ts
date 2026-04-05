import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const migrations = ['001_initial.sql', '002_magic_codes.sql'];
    for (const file of migrations) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [file]
      );
      if (rows.length === 0) {
        const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file]
        );
        console.log(`Migration applied: ${file}`);
      }
    }
  } finally {
    client.release();
  }
}
