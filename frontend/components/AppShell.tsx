"use client";

import Sidebar from "@/components/Sidebar";
import {
  getAuthDisplayName,
  getAuthUser,
  getAuthUserServerSnapshot,
  logoutUser,
  subscribeAuth,
} from "@/services/authStore";
import { KeepAliveService } from "@/services/KeepAliveService";
import { NotificationService } from "@/services/NotificationService";
import { syncTripsFromBackend } from "@/services/tripStore";
import { AppNotification } from "@/types/notification";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "travel-schedule-theme";
const THEME_UPDATED_EVENT = "travel-theme-updated";
const keepAliveService = new KeepAliveService();
const notificationService = new NotificationService();
const configuredTripRefreshInterval = Number(process.env.NEXT_PUBLIC_TRIP_REFRESH_INTERVAL_MS);
const TRIP_REFRESH_INTERVAL_MS = Number.isFinite(configuredTripRefreshInterval)
  ? Math.max(15_000, configuredTripRefreshInterval)
  : 45_000;
const configuredKeepAliveInterval = Number(process.env.NEXT_PUBLIC_KEEP_ALIVE_INTERVAL_MS);
const KEEP_ALIVE_INTERVAL_MS = Number.isFinite(configuredKeepAliveInterval)
  ? Math.max(5 * 60 * 1000, configuredKeepAliveInterval)
  : 60 * 60 * 1000;
const READ_NOTIFICATION_VISIBLE_MS = 24 * 60 * 60 * 1000;

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

function shouldShowNotification(notification: AppNotification) {
  if (!notification.readFlag) {
    return true;
  }

  const createdAt = new Date(notification.createdDate).getTime();

  if (Number.isNaN(createdAt)) {
    return true;
  }

  return Date.now() - createdAt <= READ_NOTIFICATION_VISIBLE_MS;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const themeMode = useSyncExternalStore(subscribeTheme, getInitialTheme, getThemeServerSnapshot);
  const authUser = useSyncExternalStore(subscribeAuth, getAuthUser, getAuthUserServerSnapshot);
  const isLoginPage = pathname === "/login";
  const authDisplayName = getAuthDisplayName(authUser);
  const visibleNotifications = notifications.filter(shouldShowNotification);
  const unreadNotificationCount = notifications.filter((notification) => !notification.readFlag).length;

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;

    async function pingBackend() {
      if (!navigator.onLine) {
        return;
      }

      try {
        const ok = await keepAliveService.ping();

        if (!cancelled) {
          console.info(`Backend keep-alive ping ${ok ? "OK" : "failed"}`);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Backend keep-alive ping failed:", error);
        }
      }
    }

    void pingBackend();

    const intervalId = window.setInterval(() => {
      void pingBackend();
    }, KEEP_ALIVE_INTERVAL_MS);
    const handleOnlineOrFocus = () => {
      void pingBackend();
    };

    window.addEventListener("online", handleOnlineOrFocus);
    window.addEventListener("focus", handleOnlineOrFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnlineOrFocus);
      window.removeEventListener("focus", handleOnlineOrFocus);
    };
  }, []);

  useEffect(() => {
    if (!authUser && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (authUser && isLoginPage) {
      router.replace("/");
    }
  }, [authUser, isLoginPage, router]);

  useEffect(() => {
    if (!authUser || isLoginPage) {
      return;
    }

    const refreshTrips = () => {
      if (document.hidden || !navigator.onLine) {
        return;
      }

      void syncTripsFromBackend();
    };

    refreshTrips();

    const intervalId = window.setInterval(refreshTrips, TRIP_REFRESH_INTERVAL_MS);

    const handleResume = () => refreshTrips();
    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [authUser, isLoginPage]);

  useEffect(() => {
    if (!authUser || isLoginPage) {
      return;
    }

    let cancelled = false;

    async function refreshNotifications() {
      try {
        const response = await notificationService.list(authDisplayName);

        if (!cancelled && response?.result) {
          setNotifications(response.body ?? []);
        }
      } catch (error) {
        console.error("Failed to refresh notifications:", error);
      }
    }

    void refreshNotifications();
    const intervalId = window.setInterval(refreshNotifications, TRIP_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authDisplayName, authUser, isLoginPage]);

  async function markAllNotificationsRead() {
    if (!authUser) {
      return;
    }

    setNotifications((currentNotifications) => (
      currentNotifications.map((notification) => ({
        ...notification,
        readFlag: true,
      }))
    ));

    try {
      const response = await notificationService.markAllRead(authDisplayName);

      if (response?.result) {
        setNotifications(response.body ?? []);
      }
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    }
  }

  function handleOpenNotifications() {
    setNotificationsOpen(true);
    void markAllNotificationsRead();
  }

  function openNotification(notification: AppNotification) {
    if (!notification.tripId) {
      return;
    }

    setNotificationsOpen(false);
    router.push(`/trip/${notification.tripId}`);
  }

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
    setNotifications([]);
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

  const renderNotificationButton = () => (
    <IconButton
      aria-label="Open notifications"
      onClick={handleOpenNotifications}
      className="theme-toggle-button"
    >
      <Badge badgeContent={unreadNotificationCount} color="error">
        <NotificationsIcon />
      </Badge>
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
          <Typography sx={{ fontWeight: 800 }}>Trip Schedule</Typography>
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            {renderNotificationButton()}
            {themeToggle}
          </Stack>
        </Box>

        <Box className="notification-fab">{renderNotificationButton()}</Box>

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

        <Dialog
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
            Notifications
            <Button onClick={markAllNotificationsRead} disabled={unreadNotificationCount === 0}>
              Mark all read
            </Button>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1.25}>
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <Box
                    key={notification.id}
                    className={`notification-item${notification.tripId ? " clickable-card" : ""}${notification.readFlag ? " read" : " unread"}`}
                    onClick={() => openNotification(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openNotification(notification);
                      }
                    }}
                    role={notification.tripId ? "button" : undefined}
                    tabIndex={notification.tripId ? 0 : -1}
                  >
                    <Typography sx={{ fontWeight: notification.readFlag ? 700 : 950 }}>
                      {notification.message || notification.tripName || "Trip update"}
                    </Typography>
                    <Typography sx={{ color: "var(--muted)", fontSize: "0.84rem" }}>
                      {notification.createdDate ? new Date(notification.createdDate).toLocaleString() : ""}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography sx={{ color: "var(--muted)" }}>
                  No notifications yet.
                </Typography>
              )}
            </Stack>
          </DialogContent>
        </Dialog>
      </div>
      )}
    </ThemeProvider>
  );
}
