// API Response Messages
export const MESSAGES = {
  // Success
  SUCCESS: "Operation successful",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",

  // Auth
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration successful",
  TOKEN_EXPIRED: "Token expired",
  TOKEN_INVALID: "Invalid token",
  UNAUTHORIZED: "Unauthorized access",

  // Errors
  NOT_FOUND: "Resource not found",
  ALREADY_EXISTS: "Resource already exists",
  VALIDATION_ERROR: "Validation failed",
  INTERNAL_ERROR: "Internal server error",
  BAD_REQUEST: "Bad request",

  // Chat
  CHAT_NOT_FOUND: "Chat not found",
  MESSAGE_SENT: "Message sent successfully",
  CHAT_CREATED: "Chat created successfully",

  // User
  USER_NOT_FOUND: "User not found",
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",

  // Doctor
  DOCTOR_NOT_FOUND: "Doctor not found",
  DOCTOR_CREATED: "Doctor created successfully",
  DOCTOR_UPDATED: "Doctor updated successfully",
};

export default MESSAGES;
