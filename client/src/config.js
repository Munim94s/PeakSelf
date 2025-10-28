/**
 * API Configuration
 * 
 * Centralized API base URL.
 * Set VITE_API_BASE in .env file to override the default.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Debug logging
console.log('🔧 CONFIG DEBUG:');
console.log('  VITE_API_BASE env var:', import.meta.env.VITE_API_BASE);
console.log('  Final API_BASE:', API_BASE);

export default API_BASE;
