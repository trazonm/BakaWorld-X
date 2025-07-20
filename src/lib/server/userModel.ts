// src/lib/server/userModel.ts
import { query } from './db';

export async function createUserTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      downloads JSONB DEFAULT '[]',
      hoster_downloads JSONB DEFAULT '[]'
    );
  `;
  await query(sql);
}

export async function getUsers() {
  const result = await query('SELECT * FROM users');
  return result.rows;
}

export async function findUserByUsername(username: string) {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];
}

export async function createUser(username: string, password: string) {
  const sql = `
    INSERT INTO users (username, password)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const result = await query(sql, [username, password]);
  return result.rows[0];
}

export async function updateUserDownloads(username: string, downloads: any) {
  const sql = `
    UPDATE users
    SET downloads = $1
    WHERE username = $2;
  `;
  await query(sql, [JSON.stringify(downloads), username]);
}

export async function deleteDownloadById(username: string, downloadId: string) {
  const sql = `
    UPDATE users
    SET downloads = COALESCE(
      (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(downloads) elem
        WHERE elem->>'id' != $2
      ), '[]'::jsonb
    )
    WHERE username = $1;
  `;
  await query(sql, [username, downloadId]);
}
