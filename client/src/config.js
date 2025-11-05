/**
 * Application Configuration
 * 
 * Centralized configuration for API and analytics.
 * Set environment variables in .env file to override defaults.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Google Analytics 4 Configuration
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
export const GA_ENABLED = !!GA_MEASUREMENT_ID;

// Debug logging
console.log('🔧 CONFIG DEBUG:');
console.log('  VITE_API_BASE env var:', import.meta.env.VITE_API_BASE);
console.log('  Final API_BASE:', API_BASE);
console.log('  VITE_GA_MEASUREMENT_ID env var:', import.meta.env.VITE_GA_MEASUREMENT_ID);
console.log('  GA_MEASUREMENT_ID:', GA_MEASUREMENT_ID || 'EMPTY');
console.log('  GA_ENABLED:', GA_ENABLED);

export default API_BASE;
