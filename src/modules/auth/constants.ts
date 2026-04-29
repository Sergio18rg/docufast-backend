const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

const MESSAGES = {
  ERROR: {
    REQUIRED_EMAIL_PASSWORD: "Email and password are required",
    INACTIVE_USER: "User is inactive",
    USER_NOT_FOUND: "User not found",
    UNAUTHORIZED: "Unauthorized",
    NEW_PASSWORD_REQUIRED: "New password and confirmation are required",
    PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
    PASSWORD_TOO_SHORT: "New password must be at least 8 characters long",
    UNABLE_TO_CHANGE_PASSWORD: "Unable to change password",
    CHANGE_PASSWORD_REQUIRED:
      "Password change required before accessing the system",
    NO_VALID_TOKEN: "No valid or expired token",
    INVALID_CREDENTIALS: "Invalid credentials",
  },
  SUCCESS: {
    PASSWORD_CHANGED: "Password updated successfully",
    PROTECTED_ROUTE: "Protected route accessed successfully",
  },
};

export { FIFTEEN_DAYS_IN_MS, MESSAGES };
