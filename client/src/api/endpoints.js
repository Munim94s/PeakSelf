/**
 * Centralized API Endpoints
 * 
 * All API endpoints are defined here for easy maintenance and updates.
 * Use template strings for dynamic parameters.
 */

// Base paths
const API = '/api';

// Auth endpoints
export const auth = {
  me: `${API}/auth/me`,
  login: `${API}/auth/login`,
  register: `${API}/auth/register`,
  logout: `${API}/auth/logout`,
  verifyEmail: (token) => `${API}/auth/verify/${token}`,
  googleAuth: `${API}/auth/google`,
  googleCallback: `${API}/auth/google/callback`,
};

// User endpoints
export const user = {
  profile: `${API}/user/profile`,
  updateProfile: `${API}/user/profile`,
  changePassword: `${API}/user/password`,
};

// Newsletter endpoints
export const newsletter = {
  subscribe: `${API}/subscribe`,
  unsubscribe: (token) => `${API}/unsubscribe/${token}`,
};

// Blog endpoints
export const blog = {
  list: `${API}/blog`,
  bySlug: (slug) => `${API}/blog/${slug}`,
  create: `${API}/admin/blog`,
  update: (id) => `${API}/admin/blog/${id}`,
  delete: (id) => `${API}/admin/blog/${id}`,
  publish: (id) => `${API}/admin/blog/${id}/publish`,
  uploadImage: `${API}/admin/blog/upload-image`,
};

// Tags endpoints
export const tags = {
  list: `${API}/admin/tags`,
  byId: (id) => `${API}/admin/tags/${id}`,
  create: `${API}/admin/tags`,
  update: (id) => `${API}/admin/tags/${id}`,
  delete: (id) => `${API}/admin/tags/${id}`,
};

// Niches endpoints
export const niches = {
  list: `${API}/admin/niches`,
  byId: (id) => `${API}/admin/niches/${id}`,
  create: `${API}/admin/niches`,
  update: (id) => `${API}/admin/niches/${id}`,
  delete: (id) => `${API}/admin/niches/${id}`,
  reorder: `${API}/admin/niches/reorder`,
  // Public endpoints
  public: `${API}/blog/niches`,
  bySlug: (slug) => `${API}/blog/niches/${slug}`,
};

// Admin endpoints
export const admin = {
  // Dashboard
  dashboard: `${API}/admin`,
  overview: `${API}/admin/overview`,
  sessionsTimeline: `${API}/admin/sessions-timeline`,
  
  // Users
  users: `${API}/admin/users`,
  deletedUsers: `${API}/admin/users/deleted`,
  usersCSV: `${API}/admin/users.csv`,
  userById: (id) => `${API}/admin/users/${encodeURIComponent(id)}`,
  inviteUser: `${API}/admin/users/invite`,
  makeAdmin: (id) => `${API}/admin/users/${encodeURIComponent(id)}/make-admin`,
  removeAdmin: (id) => `${API}/admin/users/${encodeURIComponent(id)}/remove-admin`,
  restoreUser: (id) => `${API}/admin/users/${encodeURIComponent(id)}/restore`,
  bulkRestore: `${API}/admin/users/bulk-restore`,
  bulkDelete: `${API}/admin/users/bulk-delete`,
  
  // Sessions
  sessions: `${API}/admin/sessions`,
  sessionById: (id) => `${API}/admin/sessions/${id}`,
  sessionEvents: (id) => `${API}/admin/sessions/${id}/events`,
  
  // Traffic
  traffic: `${API}/admin/traffic`,
  trafficSummary: `${API}/admin/traffic/summary`,
  trafficBySource: (source) => `${API}/admin/traffic/source/${source}`,
  
  // Content
  blogPosts: `${API}/admin/blog`,
};

// Utility endpoints
export const util = {
  health: `${API}/health`,
  csrfToken: `${API}/csrf-token`,
};

/**
 * Helper function to build query strings
 */
export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
}

/**
 * Helper to build URL with query params
 */
export function withQuery(endpoint, params) {
  const query = buildQuery(params);
  return query ? `${endpoint}?${query}` : endpoint;
}

export default {
  auth,
  user,
  newsletter,
  blog,
  tags,
  niches,
  admin,
  util,
};
