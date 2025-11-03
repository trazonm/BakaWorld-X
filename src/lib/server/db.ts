// src/lib/server/db.ts
// Postgres connection using 'pg' for SvelteKit endpoints
import { Pool } from 'pg';
import { env } from '$env/dynamic/private';

function getDbConfig() {
  return {
    user: env.DB_USER || process.env.DB_USER || 'bakaworld',
    host: env.DB_HOST || process.env.DB_HOST || 'localhost',
    database: env.DB_NAME || process.env.DB_NAME || 'bakaworld',
    password: env.DB_PASSWORD || process.env.DB_PASSWORD || '',
    port: Number(env.DB_PORT || process.env.DB_PORT || '5432')
  };
}

export const pool = new Pool(getDbConfig());

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
