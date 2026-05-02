"use client";

import { loginWithUser } from "@/services/authStore";
import { UserService } from "@/services/UserService";
import { User } from "@/types/user";
import LoginIcon from "@mui/icons-material/Login";
import MapIcon from "@mui/icons-material/Map";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const userService = new UserService();

function matchesLoginIdentifier(user: User, loginIdentifier: string) {
  const normalizedIdentifier = loginIdentifier.trim().toLowerCase();

  return [user.userName, user.email]
    .filter(Boolean)
    .some((value) => value.trim().toLowerCase() === normalizedIdentifier);
}

export default function LoginClient() {
  const router = useRouter();
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginIdentifier.trim()) {
      setError("Username or email is required.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await userService.search(
        { keyword: loginIdentifier.trim() },
        0,
        10,
        [{ field: "userName", order: 1 }],
      );

      if (!response?.result) {
        setError(response?.msgDetail || "Could not check this user.");
        return;
      }

      const matchedUser = response.body?.content?.find((user) => matchesLoginIdentifier(user, loginIdentifier));

      if (!matchedUser) {
        setError("No user found with that username or email.");
        return;
      }

      loginWithUser(matchedUser);
      router.replace("/");
    } catch (loginError) {
      console.error("Login failed:", loginError);
      setError("Could not connect to the user database. Please check the API server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="login-page">
      <Card className="login-card">
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Box className="login-brand-mark">
                <MapIcon />
              </Box>
              <Typography variant="overline" sx={{ color: "var(--muted)", fontWeight: 900 }}>
                Travel Schedule App
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.5 }}>
                Sign in to your travel workspace
              </Typography>
              <Typography sx={{ color: "var(--muted)", mt: 1 }}>
                Enter your username or email so trips can show who is currently planning.
              </Typography>
            </Box>

            {error ? <Alert severity="warning">{error}</Alert> : null}

            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2}>
                <TextField
                  label="Username or email"
                  value={loginIdentifier}
                  onChange={(event) => {
                    setLoginIdentifier(event.target.value);
                    setError("");
                  }}
                  required
                  helperText="Use an exact database username or email."
                  fullWidth
                />

                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                  helperText="Required"
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            edge="end"
                            onClick={() => setShowPassword((current) => !current)}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  className="travel-primary-button"
                  size="large"
                  startIcon={<LoginIcon />}
                  disabled={loading || !loginIdentifier.trim() || !password.trim()}
                >
                  {loading ? <CircularProgress color="inherit" size={20} /> : "Continue"}
                </Button>
              </Stack>
            </Box>

            <Typography sx={{ color: "var(--muted)", fontSize: "0.86rem" }}>
              Note: password is required here, but real password verification still needs a backend auth endpoint.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
