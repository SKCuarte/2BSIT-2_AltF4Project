export function getPasswordResetRequestErrorMessage(status) {
  if (status === 429) {
    return "Supabase's password-reset email limit or cooldown has been reached. The built-in email service allows 2 emails per hour. Wait before retrying or ask the administrator to configure custom SMTP.";
  }

  if (status >= 500) {
    return "Supabase could not send the reset email. Check the Supabase Auth email settings. The built-in email service only sends to authorized project-team addresses; custom SMTP is needed for other recipients.";
  }

  return "Unable to process your request right now. Check the email address and try again later.";
}
