"use client";

import { getAuthDisplayName } from "@/services/authStore";
import type { AuthUser } from "@/services/authStore";
import {
  getTrips,
  getTripsServerSnapshot,
  OPEN_CREATE_TRIP_EVENT,
  subscribeTrips,
} from "@/services/tripStore";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MapIcon from "@mui/icons-material/Map";
import RouteIcon from "@mui/icons-material/Route";
import { Box, Button, Chip, Divider, IconButton, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import type { ThemeMode } from "@/components/AppShell";

type SidebarProps = {
  onNavigate?: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  authUser: AuthUser;
  onRequestLogout: () => void;
};

export default function Sidebar({
  onNavigate,
  themeMode,
  onToggleTheme,
  authUser,
  onRequestLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getTripsServerSnapshot);
  const activeTripId = pathname.startsWith("/trip/") ? pathname.split("/")[2] : null;

  function handleNewTrip() {
    onNavigate?.();

    if (pathname === "/") {
      window.dispatchEvent(new Event(OPEN_CREATE_TRIP_EVENT));
      return;
    }

    router.push("/#create-trip");
  }

  return (
    <Box component="aside" className="sidebar-shell">
      <Stack spacing={2.5}>
        <Box>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
            <Box className="brand-mark">
              <MapIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, lineHeight: 1 }}>Travel</Typography>
              <Typography sx={{ color: "var(--sidebar-muted)", fontSize: "0.86rem" }}>
                Schedule App
              </Typography>
            </Box>
            <IconButton
              aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
              onClick={onToggleTheme}
              className="sidebar-theme-button"
            >
              {themeMode === "light" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Stack>
        </Box>

        <Box className="sidebar-profile">
          <Typography variant="overline" sx={{ color: "var(--sidebar-muted)", fontWeight: 900 }}>
            Current user
          </Typography>
          <Chip
            icon={<AccountCircleIcon />}
            label={getAuthDisplayName(authUser)}
            title={authUser.email || authUser.userName || getAuthDisplayName(authUser)}
            className="profile-chip"
            variant="outlined"
            sx={{ mt: 0.75 }}
          />
          <Button
            onClick={() => {
              onNavigate?.();
              onRequestLogout();
            }}
            startIcon={<LogoutIcon />}
            className="sidebar-link"
            sx={{ mt: 1 }}
          >
            Logout
          </Button>
        </Box>

        <Stack spacing={1}>
          <Button
            component={Link}
            href="/"
            onClick={onNavigate}
            startIcon={<RouteIcon />}
            className={pathname === "/" ? "sidebar-link active" : "sidebar-link"}
          >
            Overview
          </Button>
          <Button
            onClick={handleNewTrip}
            startIcon={<AddIcon />}
            className="sidebar-link"
          >
            New Trip
          </Button>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

        <Box>
          <Typography variant="overline" sx={{ color: "var(--sidebar-muted)", fontWeight: 900 }}>
            Trips
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {trips.slice(0, 8).map((trip) => (
              <Button
                key={trip.id}
                component={Link}
                href={`/trip/${trip.id}`}
                onClick={onNavigate}
                className={activeTripId === trip.id ? "trip-nav-item active" : "trip-nav-item"}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography className="trip-nav-title">{trip.name}</Typography>
                  <Typography className="trip-nav-meta">
                    {trip.destination} · {trip.plans.length} plans
                  </Typography>
                </Box>
              </Button>
            ))}

            {trips.length === 0 ? (
              <Typography sx={{ color: "var(--sidebar-muted)", fontSize: "0.92rem" }}>
                No trips yet.
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
