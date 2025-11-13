/**
 * Application Configuration
 * 
 * Centralized configuration for API and analytics.
 * Set environment variables in .env file to override defaults.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Google Analytics Configuration
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
export const GA_ENABLED = !!GA_MEASUREMENT_ID;

export default API_BASE;
