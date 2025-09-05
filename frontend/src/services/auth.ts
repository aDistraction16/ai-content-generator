/**
 * Provides authentication API functions for user registration, login, logout, and retrieving the current user.
 * 
 * This module defines TypeScript interfaces for user and authentication data, and exposes
 * an `authAPI` object with methods to interact with the backend authentication endpoints.
 * 
 * @module auth
 */
import api from "./api";

// Auth types
export interface User {
  id: number;
  email: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Login user
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  // Logout user
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
