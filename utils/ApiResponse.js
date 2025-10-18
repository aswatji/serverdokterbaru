import HTTP_STATUS from "../constants/httpStatus.js";

/**
 * Standard API response formatter
 */
export class ApiResponse {
  static success(
    res,
    data = null,
    message = "Success",
    statusCode = HTTP_STATUS.OK
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res,
    message = "Error",
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors = null
  ) {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = "Resource created") {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static badRequest(res, message = "Bad request", errors = null) {
    return this.error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(res, message = "Forbidden") {
    return this.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  static notFound(res, message = "Resource not found") {
    return this.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  static conflict(res, message = "Resource already exists") {
    return this.error(res, message, HTTP_STATUS.CONFLICT);
  }

  static serverError(res, message = "Internal server error", error = null) {
    if (process.env.NODE_ENV === "development" && error) {
      return this.error(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: error.message,
        stack: error.stack,
      });
    }
    return this.error(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export default ApiResponse;
