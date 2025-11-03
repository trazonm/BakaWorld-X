// src/lib/server/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

const JWT_EXPIRES_IN = '7d'; // 7 days

function getJwtSecret(): string {
  const secret = env.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function signJwt(payload: object) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (e) {
    return null;
  }
}
