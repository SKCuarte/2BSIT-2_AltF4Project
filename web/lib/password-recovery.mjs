export const PASSWORD_RECOVERY_STORAGE_KEY = "hope_password_recovery_user";

export function getPasswordValidationError(password, confirmPassword) {
  if (typeof password !== "string" || password.length === 0) {
    return "Enter a new password.";
  }
  if (password.length < 8 || password.length > 128) {
    return "Your password must be between 8 and 128 characters.";
  }
  if (password !== confirmPassword) {
    return "The passwords do not match.";
  }
  return null;
}
