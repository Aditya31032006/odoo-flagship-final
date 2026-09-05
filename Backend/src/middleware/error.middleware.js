import { STATUS_CODES } from "../constants/statusCodes.js";
import { MESSAGES } from "../constants/messages.js";

export function handleError(err, req, res, next) {
  console.error(err);
  if (err?.name === "MulterError") {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: "File upload error",
      detail: err.message,
    });
  }

  if (err?.code === "23505") {
    let message = MESSAGES.SYSTEM.DUPLICATE_VALUE;
    if (err?.constraint === "users_username_key") {
      message = "Username is already taken";
    } else if (err?.constraint === "users_email_key") {
      message = MESSAGES.AUTH.ALREADY_EXISTS;
    }

    return res.status(STATUS_CODES.CONFLICT).json({
      message,
    });
  }

  const response = {
    message: err.message || MESSAGES.SYSTEM.INTERNAL_ERROR,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }
  res.status(err.status || STATUS_CODES.INTERNAL_SERVER_ERROR).json(response);
}

export default handleError;
