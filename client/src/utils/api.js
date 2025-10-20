// Cache for CSRF token
let csrfToken = null;

// Fetch CSRF token from server
async function fetchCsrfToken() {
  if (csrfToken) return csrfToken;
  
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
}

// Wrapper for fetch that automatically includes CSRF token
export async function apiFetch(url, options = {}) {
  const method = options.method?.toUpperCase() || 'GET';
  
  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await fetchCsrfToken();
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }
  
  // Always include credentials
  options.credentials = 'include';
  
  // Make the request
  const response = await fetch(url, options);
  
  // If CSRF token is invalid, refresh and retry once
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.code === 'EBADCSRFTOKEN' || errorData.message?.includes('CSRF')) {
      csrfToken = null; // Invalidate cached token
      const newToken = await fetchCsrfToken();
      options.headers['X-CSRF-Token'] = newToken;
      return fetch(url, options);
    }
  }
  
  return response;
}

// Reset token (useful for logout)
export function resetCsrfToken() {
  csrfToken = null;
}
