// src/lib/server/ipLogModel.ts
// IP logging model for tracking visitor geolocation
import { query } from './db';

export interface IpLogEntry {
  id: number;
  ip: string;
  location: string;
  timestamp: Date;
}

/**
 * Create iplog table if it doesn't exist
 */
export async function createIpLogTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS iplog (
      id SERIAL PRIMARY KEY,
      ip VARCHAR(45) NOT NULL,
      location VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await query(sql);
    console.log('IP log table ready');
  } catch (err) {
    console.error('Error creating iplog table:', err);
  }
}

/**
 * Log an IP address with its location (only if not already logged)
 */
export async function logIp(ip: string, location: string): Promise<void> {
  try {
    // Check if IP already exists
    const checkResult = await query('SELECT COUNT(*) FROM iplog WHERE ip = $1', [ip]);
    const count = parseInt(checkResult.rows[0].count);
    
    if (count === 0) {
      await query('INSERT INTO iplog (ip, location) VALUES ($1, $2)', [ip, location]);
      console.log(`Logged new IP: ${ip} - ${location}`);
    }
  } catch (err) {
    console.error('Error logging IP:', err);
  }
}

/**
 * Get IP information from the database
 */
export async function getIpInfo(ip: string): Promise<IpLogEntry | null> {
  try {
    const result = await query('SELECT * FROM iplog WHERE ip = $1', [ip]);
    if (result.rows.length > 0) {
      return result.rows[0] as IpLogEntry;
    }
    return null;
  } catch (err) {
    console.error('Error fetching IP info:', err);
    return null;
  }
}

/**
 * Get all logged IPs (useful for analytics)
 */
export async function getAllIpLogs(): Promise<IpLogEntry[]> {
  try {
    const result = await query('SELECT * FROM iplog ORDER BY timestamp DESC');
    return result.rows as IpLogEntry[];
  } catch (err) {
    console.error('Error fetching all IP logs:', err);
    return [];
  }
}

