// Configuration for the mobile app
export const CONFIG = {
  // Update this to your deployed agentcore URL
  AGENTCORE_BASE_URL: 'http://localhost:8080',
  
  // Default user ID for the mobile app
  DEFAULT_USER_ID: 'mobile-user-123',
  
  // App settings
  APP_NAME: 'Business Plan App',
  VERSION: '1.0.0',
  
  // API endpoints
  ENDPOINTS: {
    INVOKE: '/invoke',
    INVOCATIONS: '/invocations',
    V1_INVOKE: '/v1/invoke',
    CALL: '/call',
    PING: '/ping',
  },
  
  // UI settings
  UI: {
    PRIMARY_COLOR: '#007BFF',
    SUCCESS_COLOR: '#28A745',
    WARNING_COLOR: '#FFC107',
    ERROR_COLOR: '#DC3545',
    BACKGROUND_COLOR: '#F8F9FA',
    CARD_BACKGROUND: '#FFFFFF',
  },
  
  // Chat settings
  CHAT: {
    MAX_MESSAGE_LENGTH: 500,
    TYPING_INDICATOR_DELAY: 1000,
  },
};
