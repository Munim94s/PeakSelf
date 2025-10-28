/**
 * API Module
 * 
 * Centralized API layer for the application.
 * 
 * Usage:
 * ```js
 * import { apiClient, endpoints, APIError } from '@/api';
 * 
 * // Making requests
 * const result = await apiClient.get(endpoints.auth.me);
 * const data = result.data;
 * 
 * // With error handling
 * try {
 *   const { data } = await apiClient.post(endpoints.auth.login, { email, password });
 * } catch (error) {
 *   if (error instanceof APIError) {
 *     console.error(error.message, error.status);
 *   }
 * }
 * ```
 */

export { default as apiClient, APIError, response, auth, configure } from './client';
export { default as endpoints } from './endpoints';
export * from './endpoints';
