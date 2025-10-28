import { apiFetch, resetCsrfToken } from '../utils/api';

/**
 * Custom API Error class for better error handling
 */
export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isNetworkError() {
    return this.status === 0 || this.status >= 500;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * API Client Configuration
 */
const config = {
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  retryAttempts: 2,
  retryDelay: 1000, // 1 second
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse JSON response safely
 */
async function parseJSON(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: 'Invalid JSON response', raw: text };
  }
}

/**
 * Main request handler with retry logic
 */
async function request(endpoint, options = {}, retryCount = 0) {
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseURL}${endpoint}`;
  
  try {
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    const response = await apiFetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Parse response
    const data = await parseJSON(response);
    
    // Handle errors
    if (!response.ok) {
      throw new APIError(
        data.error || data.message || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }
    
    return { data, response };
  } catch (error) {
    // Handle abort/timeout
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 0);
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new APIError('Network error - check your connection', 0);
    }
    
    // Retry on network errors
    if (error instanceof APIError && error.isNetworkError && retryCount < config.retryAttempts) {
      await sleep(config.retryDelay * (retryCount + 1));
      return request(endpoint, options, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * HTTP Methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request(url, { method: 'GET' });
  },

  /**
   * POST request
   */
  async post(endpoint, body = null, options = {}) {
    return request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  /**
   * PUT request
   */
  async put(endpoint, body = null, options = {}) {
    return request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  /**
   * PATCH request
   */
  async patch(endpoint, body = null, options = {}) {
    return request(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },

  /**
   * Upload file (FormData)
   */
  async upload(endpoint, formData, options = {}) {
    return request(endpoint, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type, let browser set it with boundary
      ...options,
    });
  },
};

/**
 * Response helpers
 */
export const response = {
  /**
   * Extract data from API response
   */
  getData: (result) => result?.data || null,

  /**
   * Check if response was successful
   */
  isSuccess: (result) => !!result?.data,

  /**
   * Get error message from error object
   */
  getErrorMessage: (error) => {
    if (error instanceof APIError) {
      return error.message;
    }
    return error?.message || 'An unexpected error occurred';
  },
};

/**
 * Auth helpers
 */
export const auth = {
  /**
   * Handle logout
   */
  logout: () => {
    resetCsrfToken();
    // Clear any other auth state if needed
  },

  /**
   * Check if error is authentication related
   */
  isAuthError: (error) => {
    return error instanceof APIError && error.isAuthError;
  },

  /**
   * Redirect to login on auth error
   */
  handleAuthError: () => {
    resetCsrfToken();
    window.location.href = '/login';
  },
};

/**
 * Configure API client
 */
export function configure(newConfig) {
  Object.assign(config, newConfig);
}

export default apiClient;
