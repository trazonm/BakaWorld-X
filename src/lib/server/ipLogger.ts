// src/lib/server/ipLogger.ts
// IP geolocation logging utilities
import { env } from '$env/dynamic/private';
import { logIp, getIpInfo } from './ipLogModel';

interface IpInfoResponse {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  loc?: string;
  org?: string;
  timezone?: string;
}

/**
 * Determine if an IP is private/local
 */
export function isPrivateIp(ip: string): boolean {
  // Skip localhost and private IP ranges
  return ip === 'localhost' ||
         ip === '127.0.0.1' || 
         ip === '::1' || 
         ip === 'unknown' ||
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.20.') ||
         ip.startsWith('172.21.') ||
         ip.startsWith('172.22.') ||
         ip.startsWith('172.23.') ||
         ip.startsWith('172.24.') ||
         ip.startsWith('172.25.') ||
         ip.startsWith('172.26.') ||
         ip.startsWith('172.27.') ||
         ip.startsWith('172.28.') ||
         ip.startsWith('172.29.') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.');
}

/**
 * Extract client IP from request, handling proxies and IPv6
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let clientIp = forwardedFor?.split(',')[0]?.trim() || 
                 realIp || 
                 'unknown';

  // Strip IPv6 prefix if present
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.split(':').pop() || clientIp;
  }

  // Normalize localhost
  if (clientIp === '127.0.0.1' || clientIp === '::1') {
    clientIp = 'localhost';
  }

  return clientIp;
}

/**
 * Fetch geolocation data from ipinfo.io
 */
export async function fetchIpGeolocation(ip: string): Promise<IpInfoResponse | null> {
  const token = env.IP_INFO_TOKEN || process.env.IP_INFO_TOKEN;
  
  if (!token) {
    console.warn('IP_INFO_TOKEN not configured - skipping IP geolocation');
    return null;
  }

  try {
    const response = await fetch(`https://ipinfo.io/${ip}?token=${token}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('IP geolocation API rate limit exceeded');
      } else {
        console.error(`IP geolocation API error: ${response.status}`);
      }
      return null;
    }

    const data: IpInfoResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch IP geolocation:', error);
    return null;
  }
}

/**
 * Log IP geolocation (checks if already logged first)
 */
export async function logIpGeolocation(ip: string): Promise<void> {
  // Skip private IPs
  if (isPrivateIp(ip)) {
    return;
  }

  try {
    // Check if already logged
    const ipInfo = await getIpInfo(ip);
    if (ipInfo) {
      // Already logged, skip API call
      return;
    }

    // Fetch geolocation from API
    const geoData = await fetchIpGeolocation(ip);
    if (!geoData) {
      return;
    }

    // Format location string
    const location = geoData.city 
      ? `${geoData.city}, ${geoData.region}, ${geoData.country} ${geoData.postal || ''}`
      : `${geoData.country || 'Unknown location'}`;

    // Log to database
    await logIp(ip, location.trim());
  } catch (error) {
    console.error(`Failed to log IP ${ip}:`, error);
  }
}

/**
 * Check if IP is from the United States
 * Returns { allowed: boolean, country?: string }
 */
export async function checkUsOnly(ip: string): Promise<{ allowed: boolean; country?: string }> {
  // Always allow localhost
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    return { allowed: true };
  }

  try {
    // Check database first
    const ipInfo = await getIpInfo(ip);
    if (ipInfo && ipInfo.location) {
      // Try to extract country code from location string
      const match = ipInfo.location.match(/([A-Z]{2})\s?\d*$/);
      const country = match ? match[1] : null;
      
      if (country) {
        return { allowed: country === 'US', country };
      }
    }

    // Not in DB or couldn't parse, fetch from API
    const geoData = await fetchIpGeolocation(ip);
    if (!geoData) {
      // If we can't determine location, allow access (fail open)
      return { allowed: true };
    }

    const country = geoData.country;

    // Log if not already in database
    if (!ipInfo && geoData.city) {
      const location = `${geoData.city}, ${geoData.region}, ${country} ${geoData.postal || ''}`;
      await logIp(ip, location.trim());
    }

    return { allowed: country === 'US', country };
  } catch (error) {
    console.error(`Geolocation error for IP ${ip}:`, error);
    // On error, fail open (allow access)
    return { allowed: true };
  }
}

