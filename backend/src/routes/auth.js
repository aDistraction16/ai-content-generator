/**
 * @file auth.js
 * @module routes/auth
 * @description Express router for user authentication routes including registration, login, logout, and retrieving the current user.
 * 
 * @requires express
 * @requires bcryptjs
 * @requires ../config/database.js
 * @requires ../models/schema.js
 * @requires drizzle-orm
 * @requires ../middleware/auth.js
 * @requires ../middleware/validation.js
 * 
 * @route POST /register - Register a new user. Requires guest access and request body validation.
 * @route POST /login - Log in an existing user. Requires guest access and request body validation.
 * @route POST /logout - Log out the currently authenticated user. Requires authentication.
 * @route GET /me - Get the currently authenticated user's information. Requires authentication.
 * 
 * @exports router
 */
import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireGuest } from "../middleware/auth.js";
import {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} from "../middleware/validation.js";

const router = express.Router();

// Register new user
router.post(
  "/register",
  requireGuest,
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email });

      // Set session
      req.session.userId = newUser[0].id;

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  }
);

// Login user
router.post(
  "/login",
  requireGuest,
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user[0].passwordHash
      );
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user[0].id;

      res.json({
        message: "Login successful",
        user: {
          id: user[0].id,
          email: user[0].email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  }
);

// Logout user
router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logout successful" });
  });
});

// Get current user
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

export default router;
