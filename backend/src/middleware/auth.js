import { db } from "../config/database.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";

/**
 * Middleware to require authentication for protected routes.
 * 
 * Checks if the user is authenticated via session. If not authenticated,
 * responds with a 401 status. If authenticated, verifies the user still exists
 * in the database. If the user does not exist, destroys the session and responds
 * with a 401 status. Otherwise, attaches the user object to the request and calls next().
 *
 * @async
 * @function requireAuth
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 */
export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify user still exists
    const user = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (user.length === 0) {
      req.session.destroy();
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user[0];
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Middleware to check if user is already logged in
export const requireGuest = (req, res, next) => {
  if (req.session.userId) {
    return res.status(400).json({ message: "Already logged in" });
  }
  next();
};
