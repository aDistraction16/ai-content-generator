import { db } from '../config/database.js';
import { users } from '../models/schema.js';
import { eq } from 'drizzle-orm';

// Middleware to check if user is authenticated
export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify user still exists
    const user = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (user.length === 0) {
      req.session.destroy();
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to check if user is already logged in
export const requireGuest = (req, res, next) => {
  if (req.session.userId) {
    return res.status(400).json({ message: 'Already logged in' });
  }
  next();
};
