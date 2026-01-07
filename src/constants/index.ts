// API Rate Limits
export const RATE_LIMIT_SECONDS = 30;

// Call Types
export const CALL_TYPES = {
  CALL_WAITER: "CALL_WAITER",
  REQUEST_BILL: "REQUEST_BILL",
} as const;

// Call Status
export const CALL_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  WAITER: "WAITER",
} as const;

// Rating Config
export const RATING_EXPIRY_MINUTES = 30;
export const MAX_RATING = 5;
export const MIN_RATING = 1;
