"use client";

import Sidebar from "@/components/Sidebar";
import {
  getAuthUser,
  getAuthUserServerSnapshot,
  logoutUser,
  subscribeAuth,
} from "@/services/authStore";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "travel-schedule-theme";
const THEME_UPDATED_EVENT = "travel-theme-updated";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
    },
    background: {
      default: "#f6f7f1",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 8,
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7aa2ff",
    },
    background: {
      default: "#0f1720",
      paper: "#17212b",
    },
  },
  shape: {
    borderRadius: 8,
  },
});

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeServerSnapshot(): ThemeMode {
  return "light";
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_UPDATED_EVENT, onStoreChange);
  };
}

function saveThemeMode(themeMode: ThemeMode) {
  window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  window.dispatchEvent(new Event(THEME_UPDATED_EVENT));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const themeMode = useSyncExternalStore(subscribeTheme, getInitialTheme, getThemeServerSnapshot);
  const authUser = useSyncExternalStore(subscribeAuth, getAuthUser, getAuthUserServerSnapshot);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (!authUser && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (authUser && isLoginPage) {
      router.replace("/");
    }
  }, [authUser, isLoginPage, router]);

  function toggleThemeMode() {
    saveThemeMode(themeMode === "light" ? "dark" : "light");
  }

  function handleRequestLogout() {
    setLogoutDialogOpen(true);
  }

  function handleConfirmLogout() {
    logoutUser();
    setDrawerOpen(false);
    setLogoutDialogOpen(false);
    router.replace("/login");
  }

  const themeToggle = (
    <IconButton
      aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
      onClick={toggleThemeMode}
      className="theme-toggle-button"
    >
      {themeMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  );

  return (
    <ThemeProvider theme={themeMode === "light" ? lightTheme : darkTheme}>
      {isLoginPage ? (
        <div className="auth-shell">
          <Box className="auth-theme-control">{themeToggle}</Box>
          {children}
        </div>
      ) : !authUser ? (
        <div className="auth-shell">
          <Box className="travel-empty-state">
            <Typography sx={{ fontWeight: 900 }}>Opening login...</Typography>
          </Box>
        </div>
      ) : (
      <div className="app-shell">
        <Box className="mobile-topbar">
          <IconButton
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            sx={{
              border: "1px solid var(--border)",
              borderRadius: 2,
              backgroundColor: "var(--panel-strong)",
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 800 }}>Travel Schedule</Typography>
          <Box sx={{ ml: "auto" }}>{themeToggle}</Box>
        </Box>

        <Box className="desktop-sidebar">
          <Sidebar
            themeMode={themeMode}
            onToggleTheme={toggleThemeMode}
            authUser={authUser}
            onRequestLogout={handleRequestLogout}
          />
        </Box>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: "min(300px, calc(100vw - 24px))",
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <Box sx={{ p: 1.5 }}>
            <IconButton
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              sx={{
                mb: 1,
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 2,
                color: "#fff",
                backgroundColor: "#20313f",
              }}
            >
              <CloseIcon />
            </IconButton>
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              themeMode={themeMode}
              onToggleTheme={toggleThemeMode}
              authUser={authUser}
              onRequestLogout={handleRequestLogout}
            />
          </Box>
        </Drawer>

        <main className="app-main">
          <div className="app-main-inner">{children}</div>
        </main>

        <Dialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 900 }}>Logout?</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "var(--muted)" }}>
              You will return to the login page and need to sign in again to continue planning trips.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleConfirmLogout}>
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </div>
      )}
    </ThemeProvider>
  );
}
