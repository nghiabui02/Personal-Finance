/** Supabase Auth codes are stable; provider sentences are never displayed. */
export function authErrorKey(code?: string): string {
  switch (code) {
    case 'invalid_credentials': return 'invalidEmailOrPassword'
    case 'email_not_confirmed': return 'emailNotConfirmed'
    case 'user_already_exists': case 'email_exists': return 'accountExists'
    case 'weak_password': return 'weakPassword'
    case 'same_password': return 'newPasswordMustBeDifferentFromTheCurrentPassword'
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'tooManyAttemptsPleaseTryAgainLater'
    case 'otp_expired': case 'session_expired': case 'refresh_token_not_found': return 'sessionExpired'
    default: return 'authenticationFailed'
  }
}
