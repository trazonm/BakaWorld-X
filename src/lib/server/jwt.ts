// src/lib/server/jwt.ts
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

const JWT_EXPIRES_IN = '7d'; // 7 days

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}
