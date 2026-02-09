/**
 * Error handling utility to prevent information leakage
 * Maps database and API errors to user-friendly messages
 */

interface ErrorWithCode {
  code?: string;
  error_code?: string;
  message?: string;
}

// PostgreSQL and Supabase error code mappings
const ERROR_MAPPINGS: Record<string, string> = {
  // PostgreSQL constraint violations
  '23505': 'This item already exists.',
  '23503': 'Cannot complete this action - the item is referenced elsewhere.',
  '23502': 'Required information is missing.',
  '23514': 'The provided data does not meet the requirements.',
  
  // Access/permission errors
  '42501': 'You do not have permission to perform this action.',
  '42503': 'Access denied.',
  'PGRST116': 'The requested item was not found.',
  'PGRST301': 'You do not have permission to access this resource.',
  
  // RLS violations
  '42P01': 'Access denied.',
  
  // Connection/server errors
  '08000': 'Unable to connect. Please try again.',
  '08003': 'Connection lost. Please refresh and try again.',
  '08006': 'Connection failed. Please check your internet connection.',
  
  // Authentication errors
  'invalid_grant': 'Invalid login credentials.',
  'invalid_credentials': 'Invalid email or password.',
  'email_not_confirmed': 'Please verify your email address before signing in.',
  'user_not_found': 'No account found with this email.',
  'user_already_exists': 'An account with this email already exists.',
  'weak_password': 'Password is too weak. Please use a stronger password.',
  'same_password': 'New password must be different from your current password.',
  
  // Rate limiting
  'over_request_limit': 'Too many requests. Please wait a moment and try again.',
  'rate_limit_exceeded': 'Too many attempts. Please try again later.',
  
  // Storage errors
  'storage/object-not-found': 'The requested file was not found.',
  'storage/unauthorized': 'You do not have permission to access this file.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/invalid-file-type': 'This file type is not allowed.',
};

// Authentication-specific errors that are safe to show detailed messages
const AUTH_SAFE_ERRORS = [
  'invalid_credentials',
  'invalid_grant',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'same_password',
];

/**
 * Converts a database or API error to a user-friendly message
 * Logs the full error for debugging while returning a safe message to users
 */
export function getUserFriendlyError(error: unknown, context?: string): string {
  // Log full error for debugging (in development)
  if (import.meta.env.DEV) {
    console.error(`[${context || 'Error'}]`, error);
  }

  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const err = error as ErrorWithCode;
  const code = err.code || err.error_code;
  
  // Check for known error codes
  if (code && ERROR_MAPPINGS[code]) {
    return ERROR_MAPPINGS[code];
  }

  // For auth errors, check if it's safe to show the message
  if (code && AUTH_SAFE_ERRORS.includes(code)) {
    return err.message || ERROR_MAPPINGS[code] || 'Authentication error occurred.';
  }

  // Handle specific error message patterns safely
  const message = err.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (message.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  
  if (message.includes('duplicate') || message.includes('unique')) {
    return 'This item already exists.';
  }
  
  if (message.includes('permission') || message.includes('denied') || message.includes('not authorized')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (message.includes('not found')) {
    return 'The requested item was not found.';
  }

  // Default generic message
  return 'An error occurred. Please try again.';
}

/**
 * Returns a safe error message for display to users.
 * In development, returns the original message for debugging.
 * In production, routes through getUserFriendlyError to prevent leaking internals.
 */
export function getSafeErrorMessage(error: unknown, context?: string): string {
  return getUserFriendlyError(error, context);
}

/**
 * Helper to handle Supabase errors consistently
 * Use this when handling errors from Supabase operations
 */
export function handleSupabaseError(
  error: unknown, 
  toast: (props: { title: string; description: string; variant?: 'destructive' | 'default' }) => void,
  context?: string
): void {
  const userMessage = getUserFriendlyError(error, context);
  
  toast({
    title: 'Error',
    description: userMessage,
    variant: 'destructive',
  });
}
