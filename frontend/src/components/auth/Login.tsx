/**
 * Login component for user authentication.
 *
 * Renders a login form using Material UI components and validates input using React Hook Form with Yup schema validation.
 * Handles user login via the `useAuth` context, displays loading state, and shows error messages on failure.
 * On successful login, navigates the user to the dashboard.
 *
 * Features:
 * - Email and password fields with validation and error display.
 * - Loading indicator on submit.
 * - Error alerts for authentication or validation failures.
 * - Link to registration page for new users.
 *
 * @component
 * @example
 * return (
 *   <Login />
 * )
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";

// Validation schema
const schema = yup.object({
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { login, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitError(null);
      clearError();
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              🤖 AI Content Generator
            </Typography>
            <Typography component="h2" variant="h5" gutterBottom>
              Sign In
            </Typography>

            {(error || submitError) && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {error || submitError}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ mt: 1 }}
            >
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Email Address"
                autoComplete="email"
                autoFocus
                {...register("email")}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : "Sign In"}
              </Button>
              <Box textAlign="center">
                <MuiLink component={Link} to="/register" variant="body2">
                  Don't have an account? Sign Up
                </MuiLink>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
