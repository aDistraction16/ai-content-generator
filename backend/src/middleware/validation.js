import { body, validationResult } from "express-validator";
/**
 * Middleware to handle validation errors from express-validator.
 * If validation errors exist, responds with 400 and error details.
 *
 * @function handleValidationErrors
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 */

/**
 * Validation rules for user registration.
 * - Validates email format and normalizes it.
 * - Ensures password is at least 8 characters and contains lowercase, uppercase, and a number.
 *
 * @constant
 * @type {import('express-validator').ValidationChain[]}
 */

/**
 * Validation rules for user login.
 * - Validates email format and normalizes it.
 * - Ensures password is not empty.
 *
 * @constant
 * @type {import('express-validator').ValidationChain[]}
 */

/**
 * Validation rules for content generation.
 * - Validates topic length.
 * - Optionally validates keyword length.
 * - Ensures contentType is one of the allowed values.
 * - Optionally validates platformTarget.
 *
 * @constant
 * @type {import('express-validator').ValidationChain[]}
 */

/**
 * Validation rules for content scheduling.
 * - Validates scheduledAt is a valid ISO8601 date in the future.
 *
 * @constant
 * @type {import('express-validator').ValidationChain[]}
 */

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Registration validation rules
export const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
];

// Login validation rules
export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Content generation validation rules
export const contentValidation = [
  body("topic")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Topic must be between 2 and 255 characters"),
  body("keyword")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Keyword must not exceed 255 characters"),
  body("contentType")
    .isIn(["blog_post", "social_caption"])
    .withMessage("Content type must be either blog_post or social_caption"),
  body("platformTarget")
    .optional()
    .isIn(["Twitter", "LinkedIn", "Facebook", "Instagram", "General"])
    .withMessage("Invalid platform target"),
];

// Content scheduling validation rules
export const scheduleValidation = [
  body("scheduledAt")
    .isISO8601()
    .withMessage("Please provide a valid date and time")
    .custom((value) => {
      const scheduleDate = new Date(value);
      const now = new Date();
      if (scheduleDate <= now) {
        throw new Error("Scheduled time must be in the future");
      }
      return true;
    }),
];
