export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  ENDPOINTS: {
    AUTH: '/auth',
    USERS: '/users',
    EMAILS: '/emails',
    TRANSACTIONS: '/transactions',
    SUBSCRIPTIONS: '/subscriptions',
    SUPERADMIN: '/superadmin'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}; 