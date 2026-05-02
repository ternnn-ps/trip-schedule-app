"use client";

import {
  createTrip,
  deleteTrip,
  getTrips,
  getTripsServerSnapshot,
  OPEN_CREATE_TRIP_EVENT,
  syncTripsFromBackend,
  subscribeTrips,
  updateTrip,
} from "@/services/tripStore";
import { UserService } from "@/services/UserService";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RouteIcon from "@mui/icons-material/Route";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useState, useSyncExternalStore } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Trip } from "@/types/trip";
import { User } from "@/types/user";

const userService = new UserService();

type TripForm = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  users: string[];
  notes: string;
};

type EditTripForm = {
  name: string;
  destination: string;
  dateRange: string;
  users: string[];
  notes: string;
};

const emptyTripForm: TripForm = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  users: [],
  notes: "",
};

const emptyEditTripForm: EditTripForm = {
  name: "",
  destination: "",
  dateRange: "",
  users: [],
  notes: "",
};

function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDisplayDate(startDate);
  }

  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function getUserDisplayName(user: User) {
  return user.userFullName?.trim() || user.userName?.trim() || user.email?.trim() || "Unnamed user";
}

function uniqueNames(names: string[]) {
  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
}

export default function TripOverview() {
  const router = useRouter();
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getTripsServerSnapshot);
  const [form, setForm] = useState(emptyTripForm);
  const [editForm, setEditForm] = useState(emptyEditTripForm);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripMenu, setTripMenu] = useState<{
    anchorEl: HTMLElement;
    trip: Trip;
  } | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [open, setOpen] = useState(() => {
    return typeof window !== "undefined" && window.location.hash === "#create-trip";
  });

  useEffect(() => {
    const handleOpenCreateTrip = () => setOpen(true);

    window.addEventListener(OPEN_CREATE_TRIP_EVENT, handleOpenCreateTrip);
    return () => window.removeEventListener(OPEN_CREATE_TRIP_EVENT, handleOpenCreateTrip);
  }, []);

  useEffect(() => {
    void syncTripsFromBackend();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      try {
        setUsersLoading(true);
        setUsersError("");

        const response = await userService.search({}, 0, 100, [{ field: "userName", order: 1 }]);

        if (cancelled) {
          return;
        }

        if (!response?.result) {
          setAvailableUsers([]);
          setUsersError(response?.msgDetail || "Could not load users from the database.");
          return;
        }

        setAvailableUsers(response.body?.content ?? []);
      } catch (fetchError) {
        console.error("Failed to fetch users:", fetchError);

        if (!cancelled) {
          setAvailableUsers([]);
          setUsersError("Could not connect to the user database.");
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  function openTrip(tripId: string) {
    router.push(`/trip/${tripId}`);
  }

  function handleTripCardKeyDown(event: KeyboardEvent<HTMLDivElement>, tripId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTrip(tripId);
    }
  }

  function handleCreateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.destination.trim() || !form.startDate || !form.endDate) {
      setError("Trip name, destination, start date, and end date are required.");
      return;
    }

    const nextTrip = createTrip({
      name: form.name.trim(),
      destination: form.destination.trim(),
      dateRange: formatDateRange(form.startDate, form.endDate),
      users: uniqueNames(form.users),
      notes: form.notes.trim(),
    });

    setForm(emptyTripForm);
    setError("");
    setOpen(false);
    router.push(`/trip/${nextTrip.id}`);
  }

  function handleOpenEditTrip(trip: Trip) {
    setTripMenu(null);
    setEditingTrip(trip);
    setEditForm({
      name: trip.name,
      destination: trip.destination,
      dateRange: trip.dateRange,
      users: trip.users,
      notes: trip.notes,
    });
    setEditError("");
  }

  function handleUpdateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTrip || !editForm.name.trim() || !editForm.destination.trim() || !editForm.dateRange.trim()) {
      setEditError("Trip name, destination, and date range are required.");
      return;
    }

    updateTrip(editingTrip.id, {
      name: editForm.name.trim(),
      destination: editForm.destination.trim(),
      dateRange: editForm.dateRange.trim(),
      users: uniqueNames(editForm.users),
      notes: editForm.notes.trim(),
    });

    setEditingTrip(null);
    setEditForm(emptyEditTripForm);
    setEditError("");
  }

  function handleOpenDeleteTrip(trip: Trip) {
    setTripMenu(null);
    setTripToDelete(trip);
  }

  function handleConfirmDeleteTrip() {
    if (!tripToDelete) {
      return;
    }

    deleteTrip(tripToDelete.id);
    setTripToDelete(null);
  }

  const totalPlans = trips.reduce((sum, trip) => sum + trip.plans.length, 0);
  const nextTrip = trips[0];
  const busiestTrip = [...trips].sort((first, second) => second.plans.length - first.plans.length)[0];
  const tripMenuOpen = Boolean(tripMenu);
  const userOptions = uniqueNames([
    ...availableUsers.map(getUserDisplayName),
    ...form.users,
    ...editForm.users,
  ]);

  return (
    <>
      <Stack spacing={3}>
        <Box className="page-heading" id="create-trip">
          <Box>
            <Typography variant="overline" sx={{ color: "var(--muted)", fontWeight: 800 }}>
              Overview
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
              Travel Schedule
            </Typography>
            <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
              Manage trips, compare schedule progress, and open any itinerary quickly.
            </Typography>
          </Box>
        </Box>

        <Box className="summary-grid">
          <Card className="travel-stat-card">
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <RouteIcon color="primary" />
                <Box>
                  <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                    Trips
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {trips.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card className="travel-stat-card">
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <CalendarMonthIcon color="primary" />
                <Box>
                  <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                    Plans
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {totalPlans}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card className="travel-stat-card">
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <LocationOnIcon color="primary" />
                <Box>
                  <Typography variant="overline" sx={{ color: "var(--muted)" }}>
                    Focus
                  </Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {busiestTrip?.destination ?? "Create a trip"}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {nextTrip ? (
          <Box
            className="focus-strip clickable-card"
            onClick={() => openTrip(nextTrip.id)}
            onKeyDown={(event) => handleTripCardKeyDown(event, nextTrip.id)}
            role="button"
            tabIndex={0}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Box>
                <Typography variant="overline" sx={{ color: "var(--muted)", fontWeight: 800 }}>
                  Latest trip
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {nextTrip.name}
                </Typography>
                <Typography sx={{ color: "var(--muted)" }}>
                  {nextTrip.destination} · {nextTrip.dateRange}
                </Typography>
              </Box>
              <Chip label="Tap to open" variant="outlined" sx={{ alignSelf: { xs: "flex-start", md: "center" } }} />
            </Stack>
          </Box>
        ) : null}

        <Box className="section-heading">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Trips
            </Typography>
            <Typography sx={{ color: "var(--muted)" }}>
              Pick one itinerary to add day, time, place, and detail.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Chip label={`${trips.length} saved`} />
            <IconButton
              aria-label="Add trip"
              onClick={() => setOpen(true)}
              className="add-trip-button"
            >
              <AddIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box className="trip-grid">
          {trips.map((trip) => (
            <Card
              key={trip.id}
              className="travel-trip-card clickable-card"
              onClick={() => openTrip(trip.id)}
              onKeyDown={(event) => handleTripCardKeyDown(event, trip.id)}
              role="button"
              tabIndex={0}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {trip.name}
                      </Typography>
                      <Typography sx={{ color: "var(--muted)" }}>{trip.destination}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start" }}>
                      <Chip label={`${trip.plans.length} plans`} size="small" />
                      <IconButton
                        aria-label={`Trip actions for ${trip.name}`}
                        size="small"
                        className="kebab-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setTripMenu({ anchorEl: event.currentTarget, trip });
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Box className="trip-meta-grid">
                    <Box>
                      <Typography variant="caption" sx={{ color: "var(--muted)" }}>
                        Dates
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>{trip.dateRange}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "var(--muted)" }}>
                        Next stop
                      </Typography>
                      <Typography sx={{ fontWeight: 800 }}>
                        {trip.plans[0]?.place ?? "No stops yet"}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    {trip.users.length > 0 ? (
                      trip.users.slice(0, 4).map((user) => (
                        <Chip key={user} label={user} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Chip label="No users" size="small" variant="outlined" />
                    )}
                    {trip.users.length > 4 ? (
                      <Chip label={`+${trip.users.length - 4}`} size="small" />
                    ) : null}
                  </Stack>

                  <Typography className="trip-note">
                    {trip.notes || "Open this trip to start planning the schedule."}
                  </Typography>

                  <Button
                    component={Link}
                    href={`/trip/${trip.id}`}
                    variant="contained"
                    className="travel-primary-button"
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Open Trip
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {trips.length === 0 ? (
          <Box className="travel-empty-state">
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              No trips yet
            </Typography>
            <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
              Create a trip to start building your travel schedule.
            </Typography>
            <IconButton
              aria-label="Add trip"
              onClick={() => setOpen(true)}
              className="add-trip-button"
              sx={{ mt: 2 }}
            >
              <AddIcon />
            </IconButton>
          </Box>
        ) : null}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
          Create Trip
          <IconButton onClick={() => setOpen(false)} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleCreateTrip}>
          <DialogContent>
            <Stack spacing={2}>
              {error ? <Alert severity="warning">{error}</Alert> : null}
              <TextField label="Trip name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} fullWidth />
              <TextField label="Destination" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} fullWidth />
              <Box className="plan-form-grid">
                <TextField
                  label="Start date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
                <TextField
                  label="End date"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Box>
              <Autocomplete
                multiple
                options={userOptions}
                value={form.users}
                onChange={(_, users) => {
                  setForm({ ...form, users });
                  setUsersError("");
                }}
                loading={usersLoading}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Users"
                    placeholder="Select users"
                    error={Boolean(usersError)}
                    helperText={
                      usersError ||
                      (usersLoading
                        ? "Loading users from database..."
                        : "Select database users who can view and edit this trip.")
                    }
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        endAdornment: (
                          <>
                            {usersLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.slotProps?.input?.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
              <TextField label="Trip note" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} multiline minRows={3} fullWidth />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" className="travel-primary-button">
              Create Trip
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Menu
        anchorEl={tripMenu?.anchorEl ?? null}
        open={tripMenuOpen}
        onClose={() => setTripMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (tripMenu) {
              handleOpenEditTrip(tripMenu.trip);
            }
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (tripMenu) {
              handleOpenDeleteTrip(tripMenu.trip);
            }
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(editingTrip)} onClose={() => setEditingTrip(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
          Edit Trip
          <IconButton onClick={() => setEditingTrip(null)} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleUpdateTrip}>
          <DialogContent>
            <Stack spacing={2}>
              {editError ? <Alert severity="warning">{editError}</Alert> : null}
              <TextField label="Trip name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} fullWidth />
              <TextField label="Destination" value={editForm.destination} onChange={(event) => setEditForm({ ...editForm, destination: event.target.value })} fullWidth />
              <TextField label="Date range" value={editForm.dateRange} onChange={(event) => setEditForm({ ...editForm, dateRange: event.target.value })} fullWidth />
              <Autocomplete
                multiple
                options={userOptions}
                value={editForm.users}
                onChange={(_, users) => {
                  setEditForm({ ...editForm, users });
                  setUsersError("");
                }}
                loading={usersLoading}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Users"
                    placeholder="Select users"
                    error={Boolean(usersError)}
                    helperText={
                      usersError ||
                      (usersLoading
                        ? "Loading users from database..."
                        : "Select database users who can view and edit this trip.")
                    }
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        endAdornment: (
                          <>
                            {usersLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.slotProps?.input?.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
              <TextField label="Trip note" value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} multiline minRows={3} fullWidth />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setEditingTrip(null)}>Cancel</Button>
            <Button type="submit" variant="contained" className="travel-primary-button">
              Save Trip
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(tripToDelete)} onClose={() => setTripToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Trip?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "var(--muted)" }}>
            {`Delete "${tripToDelete?.name}" and all plans inside it? This action cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTripToDelete(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteTrip}>
            Delete Trip
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
