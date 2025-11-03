// DNS configuration for Node.js to prefer IPv4
import dns from 'dns';

// Set DNS to prefer IPv4 first (important for local network IPs)
dns.setDefaultResultOrder('ipv4first');

