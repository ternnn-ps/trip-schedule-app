"use client";

import {
  getAuthUser,
  getAuthUserServerSnapshot,
  subscribeAuth,
} from "@/services/authStore";
import { formatDisplayDate, parseTripDateRange } from "@/services/dateRange";
import { canViewTrip } from "@/services/tripPermissions";
import {
  getTrips,
  getTripsServerSnapshot,
  syncTripsFromBackend,
  subscribeTrips,
} from "@/services/tripStore";
import { Trip } from "@/types/trip";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RouteIcon from "@mui/icons-material/Route";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

type CalendarTrip = Trip & {
  startDate: string;
  endDate: string;
  startDateValue: Date;
  endDateValue: Date;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value: Date, amount: number) {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getCalendarStart(value: Date) {
  const monthStart = startOfMonth(value);
  const weekday = monthStart.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addDays(monthStart, -offset);
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function toLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function isSameDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function isSameMonth(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth();
}

function getCalendarTrips(trips: Trip[], today: Date) {
  return trips
    .map((trip) => {
      const parsedRange = parseTripDateRange(trip.dateRange);

      if (!parsedRange) {
        return null;
      }

      const startDateValue = toLocalDate(parsedRange.startDate);
      const endDateValue = toLocalDate(parsedRange.endDate);

      if (endDateValue < today) {
        return null;
      }

      return {
        ...trip,
        startDate: parsedRange.startDate,
        endDate: parsedRange.endDate,
        startDateValue,
        endDateValue,
      } satisfies CalendarTrip;
    })
    .filter((trip): trip is CalendarTrip => Boolean(trip))
    .sort((first, second) => (
      first.startDateValue.getTime() - second.startDateValue.getTime()
    ));
}

export default function TripCalendar() {
  const router = useRouter();
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getTripsServerSnapshot);
  const authUser = useSyncExternalStore(subscribeAuth, getAuthUser, getAuthUserServerSnapshot);
  const today = startOfDay(new Date());
  const visibleTrips = trips.filter((trip) => canViewTrip(trip, authUser));
  const upcomingTrips = getCalendarTrips(visibleTrips, today);
  const nextTrip = upcomingTrips[0] ?? null;
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const displayMonth = selectedMonth ?? startOfMonth(nextTrip?.startDateValue ?? today);

  const calendarStart = getCalendarStart(displayMonth);
  const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
  const tripsThisMonth = upcomingTrips.filter((trip) => (
    trip.startDateValue <= addDays(addMonths(displayMonth, 1), -1)
      && trip.endDateValue >= startOfMonth(displayMonth)
  ));

  useEffect(() => {
    void syncTripsFromBackend();
  }, []);

  function openTrip(tripId: string) {
    router.push(`/trip/${tripId}`);
  }

  function moveDisplayMonth(amount: number) {
    setSelectedMonth((currentMonth) => addMonths(currentMonth ?? displayMonth, amount));
  }

  return (
    <Stack spacing={{ xs: 2, sm: 3 }} className="trip-calendar-page">
      <Box className="page-heading calendar-page-heading">
        <Box>
          <Typography variant="overline" sx={{ color: "var(--muted)", fontWeight: 800 }}>
            Calendar
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontSize: { xs: "1.65rem", sm: "2.125rem" } }}>
            Upcoming trips
          </Typography>
          <Typography className="calendar-page-copy" sx={{ color: "var(--muted)", mt: 0.75 }}>
            Keep an eye on what is coming next and where each trip lands on the month view.
          </Typography>
        </Box>
      </Box>

      <Box className="summary-grid calendar-summary-grid">
        <Card className="travel-stat-card">
          <CardContent>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <CalendarMonthIcon color="primary" />
              <Box>
                <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                  Upcoming
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  {upcomingTrips.length} trip{upcomingTrips.length === 1 ? "" : "s"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card className="travel-stat-card">
          <CardContent>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <RouteIcon color="primary" />
              <Box>
                <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                  Next trip
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  {nextTrip?.name ?? "Nothing scheduled"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card className="travel-panel calendar-panel">
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <Stack
              className="calendar-toolbar"
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<ChevronLeftIcon />}
                onClick={() => moveDisplayMonth(-1)}
              >
                Previous
              </Button>
              <Typography variant="h6" className="calendar-month-label" sx={{ fontWeight: 900, textAlign: "center" }}>
                {formatMonthLabel(displayMonth)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ChevronRightIcon />}
                onClick={() => moveDisplayMonth(1)}
              >
                Next
              </Button>
            </Stack>

            <Box className="calendar-desktop-grid">
              <Box className="calendar-grid">
                {weekdayLabels.map((label) => (
                  <Box key={label} className="calendar-weekday">
                    {label}
                  </Box>
                ))}

                {days.map((day) => {
                  const dayTrips = tripsThisMonth.filter((trip) => (
                    trip.startDateValue <= day && trip.endDateValue >= day
                  ));

                  return (
                    <Box
                      key={day.toISOString()}
                      className={`calendar-day-card${isSameMonth(day, displayMonth) ? "" : " muted"}${isSameDay(day, today) ? " today" : ""}`}
                    >
                      <Typography className="calendar-day-number">
                        {day.getDate()}
                      </Typography>
                      <Box className="calendar-day-indicator-row">
                        {dayTrips.slice(0, 3).map((trip) => (
                          <span key={`${trip.id}-${day.toISOString()}-dot`} className="calendar-day-dot" />
                        ))}
                        {dayTrips.length > 0 ? (
                          <Typography className="calendar-day-count">
                            {dayTrips.length}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack spacing={0.5} sx={{ mt: 1 }} className="calendar-day-trip-list">
                        {dayTrips.slice(0, 2).map((trip) => (
                          <Button
                            key={`${trip.id}-${day.toISOString()}`}
                            onClick={() => openTrip(trip.id)}
                            className="calendar-trip-pill"
                          >
                            {trip.name}
                          </Button>
                        ))}
                        {dayTrips.length > 2 ? (
                          <Typography className="calendar-more-label">
                            +{dayTrips.length - 2} more
                          </Typography>
                        ) : null}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card className="travel-panel calendar-upcoming-panel">
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Box className="section-heading">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Upcoming list
                </Typography>
                <Typography sx={{ color: "var(--muted)" }}>
                  Sorted by the next trip date so it is easy to scan what is coming soon.
                </Typography>
              </Box>
            </Box>

            {upcomingTrips.length > 0 ? (
              <Stack spacing={1.25}>
                {upcomingTrips.map((trip) => (
                  <Box
                    key={trip.id}
                    className="calendar-upcoming-item clickable-card"
                    onClick={() => openTrip(trip.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTrip(trip.id);
                      }
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        {trip.name}
                      </Typography>
                      <Typography sx={{ color: "var(--muted)" }}>
                        {trip.destination} · {formatDisplayDate(trip.startDate)}
                        {trip.startDate !== trip.endDate ? ` - ${formatDisplayDate(trip.endDate)}` : ""}
                      </Typography>
                    </Box>
                    <Chip label={`${trip.plans.length} stops`} size="small" />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box className="travel-empty-state">
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  No upcoming trips
                </Typography>
                <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
                  Add a trip with future dates and it will show up here automatically.
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
