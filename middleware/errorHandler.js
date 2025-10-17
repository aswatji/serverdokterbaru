const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Prisma error handling
  if (err.code === "P2002") {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry error",
      error: err.meta?.target
        ? `${err.meta.target.join(", ")} already exists`
        : "Duplicate entry",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  }

  // Validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
