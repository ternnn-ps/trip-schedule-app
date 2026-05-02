"use client";

import {
  addPlanToTrip,
  addUserToTrip,
  deletePlanFromTrip,
  deleteTrip,
  getTrips,
  getTripsServerSnapshot,
  removeUserFromTrip,
  subscribeTrips,
  syncTripsFromBackend,
  updatePlanInTrip,
  updateTrip,
} from "@/services/tripStore";
import { UserService } from "@/services/UserService";
import LocationPicker from "@/components/LocationPicker";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapIcon from "@mui/icons-material/Map";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { TripPlanItem } from "@/types/trip";
import { User } from "@/types/user";

const userService = new UserService();

const emptyPlanForm = {
  day: "",
  time: "",
  detail: "",
  place: "",
  latitude: "",
  longitude: "",
};

const emptyTripEditForm = {
  name: "",
  destination: "",
  dateRange: "",
  notes: "",
};

type ConfirmDialogState =
  | { type: "trip" }
  | { type: "plan"; plan: TripPlanItem }
  | { type: "user"; userName: string }
  | null;

const monthIndexes: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function parsePlanDayNumber(day: string) {
  const match = day.match(/\d+/);
  const dayNumber = match ? Number(match[0]) : Number.NaN;

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return null;
  }

  return dayNumber;
}

function parseDateSegment(segment: string, fallbackYear?: number) {
  const trimmedSegment = segment.trim();
  const isoMatch = trimmedSegment.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return {
      date: new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))),
      hasYear: true,
    };
  }

  const labelMatch = trimmedSegment.match(/^(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?$/);

  if (labelMatch) {
    const month = monthIndexes[labelMatch[2].toLowerCase()];
    const year = labelMatch[3] ? Number(labelMatch[3]) : fallbackYear;

    if (month === undefined || year === undefined) {
      return null;
    }

    return {
      date: new Date(Date.UTC(year, month, Number(labelMatch[1]))),
      hasYear: Boolean(labelMatch[3]),
    };
  }

  const fallbackDate = new Date(trimmedSegment);

  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return {
    date: fallbackDate,
    hasYear: /\d{4}/.test(trimmedSegment),
  };
}

function getTripDurationDays(dateRange: string) {
  const [startSegment, endSegment] = dateRange.split(/\s+-\s+/);

  if (!startSegment || !endSegment) {
    return null;
  }

  const end = parseDateSegment(endSegment);

  if (!end) {
    return null;
  }

  let start = parseDateSegment(startSegment, end.date.getUTCFullYear());

  if (!start) {
    return null;
  }

  if (!start.hasYear && start.date.getTime() > end.date.getTime()) {
    start = {
      date: new Date(Date.UTC(end.date.getUTCFullYear() - 1, start.date.getUTCMonth(), start.date.getUTCDate())),
      hasYear: false,
    };
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const durationDays = Math.round((end.date.getTime() - start.date.getTime()) / millisecondsPerDay) + 1;

  return durationDays > 0 ? durationDays : null;
}

function getUserDisplayName(user: User) {
  return user.userFullName?.trim() || user.userName?.trim() || user.email?.trim() || "Unnamed user";
}

function getUserKey(user: User) {
  return String(user.userId ?? user.userName ?? user.email ?? getUserDisplayName(user));
}

export default function TripDetailClient({ tripId }: { tripId: string }) {
  const router = useRouter();
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getTripsServerSnapshot);
  const trip = trips.find((item) => item.id === tripId) ?? null;
  const [form, setForm] = useState(emptyPlanForm);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planMenu, setPlanMenu] = useState<{
    anchorEl: HTMLElement;
    plan: TripPlanItem;
  } | null>(null);
  const [tripMenuAnchorEl, setTripMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [tripEditOpen, setTripEditOpen] = useState(false);
  const [tripEditForm, setTripEditForm] = useState(emptyTripEditForm);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [error, setError] = useState("");

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

  function openAddPlanDialog() {
    setForm(emptyPlanForm);
    setEditingPlanId(null);
    setError("");
    setPlanDialogOpen(true);
  }

  function openEditPlanDialog(plan: TripPlanItem) {
    setPlanMenu(null);
    setForm({
      day: plan.day,
      time: plan.time,
      detail: plan.detail,
      place: plan.place,
      latitude: plan.latitude ?? "",
      longitude: plan.longitude ?? "",
    });
    setEditingPlanId(plan.id);
    setError("");
    setPlanDialogOpen(true);
  }

  function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trip) {
      return;
    }

    if (!form.day.trim() || !form.time.trim() || !form.detail.trim() || !form.place.trim()) {
      setError("Day, time, detail, and place are required.");
      return;
    }

    const planDayNumber = parsePlanDayNumber(form.day);

    if (!planDayNumber) {
      setError('Use a valid day number, for example "Day 1".');
      return;
    }

    const tripDurationDays = getTripDurationDays(trip.dateRange);

    if (tripDurationDays && planDayNumber > tripDurationDays) {
      setError(`This trip is ${tripDurationDays} days long, so plans can only use Day 1 to Day ${tripDurationDays}.`);
      return;
    }

    const planInput = {
      day: form.day.trim(),
      time: form.time.trim(),
      detail: form.detail.trim(),
      place: form.place.trim(),
      latitude: form.latitude.trim(),
      longitude: form.longitude.trim(),
    };

    if (editingPlanId) {
      updatePlanInTrip(trip.id, editingPlanId, planInput);
    } else {
      addPlanToTrip(trip.id, planInput);
    }

    setForm(emptyPlanForm);
    setEditingPlanId(null);
    setPlanDialogOpen(false);
    setError("");
  }

  function openDeletePlanDialog(plan: TripPlanItem) {
    setPlanMenu(null);
    setConfirmDialog({ type: "plan", plan });
  }

  function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trip || !selectedUser) {
      return;
    }

    addUserToTrip(trip.id, getUserDisplayName(selectedUser));
    setSelectedUser(null);
  }

  function handleRemoveUser(userName: string) {
    setConfirmDialog({ type: "user", userName });
  }

  function openEditTripDialog() {
    setTripMenuAnchorEl(null);

    if (!trip) {
      return;
    }

    setTripEditForm({
      name: trip.name,
      destination: trip.destination,
      dateRange: trip.dateRange,
      notes: trip.notes,
    });
    setTripEditOpen(true);
  }

  function handleUpdateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trip || !tripEditForm.name.trim() || !tripEditForm.destination.trim() || !tripEditForm.dateRange.trim()) {
      return;
    }

    updateTrip(trip.id, {
      name: tripEditForm.name.trim(),
      destination: tripEditForm.destination.trim(),
      dateRange: tripEditForm.dateRange.trim(),
      notes: tripEditForm.notes.trim(),
    });
    setTripEditOpen(false);
  }

  function openDeleteTripDialog() {
    setTripMenuAnchorEl(null);
    setConfirmDialog({ type: "trip" });
  }

  function handleConfirmDialogAction() {
    if (!trip || !confirmDialog) {
      return;
    }

    if (confirmDialog.type === "trip") {
      deleteTrip(trip.id);
      setConfirmDialog(null);
      router.push("/");
      return;
    }

    if (confirmDialog.type === "plan") {
      deletePlanFromTrip(trip.id, confirmDialog.plan.id);
      setConfirmDialog(null);
      return;
    }

    removeUserFromTrip(trip.id, confirmDialog.userName);
    setConfirmDialog(null);
  }

  if (!trip) {
    return (
      <Box className="travel-empty-state">
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Trip not found
        </Typography>
        <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
          This trip may have been removed from browser storage.
        </Typography>
        <Button sx={{ mt: 2 }} component={Link} href="/" variant="contained" startIcon={<ArrowBackIcon />}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  const plansByDay = trip.plans.reduce<Record<string, typeof trip.plans>>((groups, plan) => {
    groups[plan.day] = [...(groups[plan.day] ?? []), plan];
    return groups;
  }, {});
  const tripDurationDays = getTripDurationDays(trip.dateRange);
  const dayOptions = Array.from(
    { length: tripDurationDays ?? 14 },
    (_, index) => `Day ${index + 1}`,
  );
  const hasSelectedDayOutsideOptions = Boolean(form.day) && !dayOptions.includes(form.day);
  const usersAvailableToAdd = availableUsers.filter((user) => !trip.users.includes(getUserDisplayName(user)));
  const planMenuOpen = Boolean(planMenu);
  const tripMenuOpen = Boolean(tripMenuAnchorEl);
  const confirmDialogTitle =
    confirmDialog?.type === "trip"
      ? "Delete Trip?"
      : confirmDialog?.type === "plan"
        ? "Delete Plan?"
        : "Remove User?";
  const confirmDialogMessage =
    confirmDialog?.type === "trip"
      ? `Delete "${trip.name}" and all plans inside it? This action cannot be undone.`
      : confirmDialog?.type === "plan"
        ? `Delete the plan at "${confirmDialog.plan.place}"? This action cannot be undone.`
        : `Remove ${confirmDialog?.userName ?? "this user"} from this trip? They will no longer have trip access.`;
  const confirmDialogAction =
    confirmDialog?.type === "trip"
      ? "Delete Trip"
      : confirmDialog?.type === "plan"
        ? "Delete Plan"
        : "Remove User";

  return (
    <>
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Button component={Link} href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 1, px: 0 }}>
            Overview
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {trip.name}
          </Typography>
          <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
            {trip.destination} · {trip.dateRange}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Chip icon={<LocationOnIcon />} label={trip.destination} />
            <Chip icon={<AccessTimeIcon />} label={`${trip.plans.length} plans`} />
          </Stack>
          <IconButton
            aria-label="Trip actions"
            className="kebab-button"
            onClick={(event) => setTripMenuAnchorEl(event.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        </Stack>
      </Box>

      {trip.notes ? (
        <Box className="focus-strip">
          <Typography sx={{ color: "var(--muted)" }}>{trip.notes}</Typography>
        </Box>
      ) : null}

      <Card className="travel-panel">
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Trip Users
              </Typography>
              <Typography sx={{ color: "var(--muted)", fontSize: "0.92rem", mt: 0.5 }}>
                Users added here have permission to view and edit this trip.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                {trip.users.length > 0 ? (
                  trip.users.map((user) => (
                    <Chip
                      key={user}
                      label={user}
                      title="Can view and edit"
                      onDelete={() => handleRemoveUser(user)}
                      deleteIcon={<CloseIcon />}
                    />
                  ))
                ) : (
                  <Chip label="No users yet" variant="outlined" />
                )}
              </Stack>
            </Box>
            <Box component="form" onSubmit={handleAddUser} className="add-user-form">
              <Autocomplete
                options={usersAvailableToAdd}
                value={selectedUser}
                onChange={(_, user) => {
                  setSelectedUser(user);
                  setUsersError("");
                }}
                loading={usersLoading}
                getOptionKey={getUserKey}
                getOptionLabel={getUserDisplayName}
                isOptionEqualToValue={(option, value) => getUserKey(option) === getUserKey(value)}
                noOptionsText={availableUsers.length === 0 ? "No users found" : "All database users are already in this trip"}
                renderOption={(props, user) => (
                  <Box component="li" {...props} key={getUserKey(user)}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>{getUserDisplayName(user)}</Typography>
                      <Typography noWrap sx={{ color: "var(--muted)", fontSize: "0.84rem" }}>
                        {user.email || user.userName || "Database user"}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add user"
                    helperText={
                      usersError ||
                      (usersLoading
                        ? "Loading users from database..."
                        : "")
                    }
                    error={Boolean(usersError)}
                    size="small"
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
              <Button
                type="submit"
                variant="outlined"
                startIcon={usersLoading ? <CircularProgress size={16} /> : <PersonAddIcon />}
                disabled={usersLoading || !selectedUser}
              >
                Grant Access
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box>
          <Box className="section-heading">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Itinerary
              </Typography>
              <Typography sx={{ color: "var(--muted)" }}>
                Plans are grouped by day for quick scanning.
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: { xs: "stretch", sm: "center" }, width: { xs: "100%", sm: "auto" } }}
            >
              <Chip label={`${trip.plans.length} stops`} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                className="travel-primary-button"
                onClick={openAddPlanDialog}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Add Plan
              </Button>
            </Stack>
          </Box>

          <Stack spacing={2.5} sx={{ mt: 2 }}>
            {Object.entries(plansByDay).map(([day, dayPlans]) => (
              <Box key={day} className="day-section">
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                  {day}
                </Typography>
                <Stack spacing={1.5}>
                  {dayPlans.map((plan) => (
                    <Card key={plan.id} className="travel-plan-card">
                      <CardContent sx={{ p: 2.25 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 900 }}>{plan.place}</Typography>
                              <Typography sx={{ color: "var(--muted)" }}>{plan.detail}</Typography>
                              {plan.latitude && plan.longitude ? (
                                <Box sx={{ mt: 1.5 }}>
                                  <LocationPicker
                                    latitude={plan.latitude}
                                    longitude={plan.longitude}
                                    readOnly
                                  />
                                  <Button
                                    component="a"
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${plan.latitude},${plan.longitude}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    startIcon={<MapIcon />}
                                    size="small"
                                    sx={{ mt: 1, px: 0 }}
                                  >
                                    Open map
                                  </Button>
                                </Box>
                              ) : null}
                            </Box>
                            <Stack spacing={1} sx={{ flexShrink: 0, alignItems: "flex-end" }}>
                              <Chip icon={<AccessTimeIcon />} label={plan.time} size="small" />
                              <IconButton
                                aria-label={`Plan actions for ${plan.place}`}
                                size="small"
                                className="kebab-button"
                                onClick={(event) => setPlanMenu({ anchorEl: event.currentTarget, plan })}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}

            {trip.plans.length === 0 ? (
              <Box className="travel-empty-state">
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  No plans yet
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ color: "var(--muted)" }}>
                  Add the first stop with a day, time, place, and detail.
                </Typography>
              </Box>
            ) : null}
          </Stack>
      </Box>
    </Stack>

    <Menu
      anchorEl={tripMenuAnchorEl}
      open={tripMenuOpen}
      onClose={() => setTripMenuAnchorEl(null)}
    >
      <MenuItem onClick={openEditTripDialog}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit trip</ListItemText>
      </MenuItem>
      <MenuItem onClick={openDeleteTripDialog}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Delete trip</ListItemText>
      </MenuItem>
    </Menu>

    <Menu
      anchorEl={planMenu?.anchorEl ?? null}
      open={planMenuOpen}
      onClose={() => setPlanMenu(null)}
    >
      <MenuItem
        onClick={() => {
          if (planMenu) {
            openEditPlanDialog(planMenu.plan);
          }
        }}
      >
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit plan</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (planMenu) {
            openDeletePlanDialog(planMenu.plan);
          }
        }}
      >
        <ListItemIcon>
          <DeleteIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText>Delete plan</ListItemText>
      </MenuItem>
    </Menu>

    <Dialog
      open={planDialogOpen}
      onClose={() => setPlanDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
        {editingPlanId ? "Edit Plan" : "Add Plan"}
        <IconButton onClick={() => setPlanDialogOpen(false)} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSavePlan}>
        <DialogContent>
          <Stack spacing={2.25}>
            {error ? <Alert severity="warning">{error}</Alert> : null}

            <Box className="plan-form-grid">
              <TextField
                label="Day"
                select
                value={form.day}
                onChange={(event) => setForm({ ...form, day: event.target.value })}
                helperText={
                  tripDurationDays
                    ? `This trip allows Day 1 to Day ${tripDurationDays}.`
                    : "Date range could not be read, so showing Day 1 to Day 14."
                }
                fullWidth
              >
                <MenuItem value="" disabled>
                  Select day
                </MenuItem>
                {hasSelectedDayOutsideOptions ? (
                  <MenuItem value={form.day} disabled>
                    {form.day} (outside trip range)
                  </MenuItem>
                ) : null}
                {dayOptions.map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Time"
                type="time"
                value={form.time}
                onChange={(event) => setForm({ ...form, time: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>
            <TextField label="Place" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder="Train station, hotel, cafe..." fullWidth />
            <Box>
              <Typography sx={{ mb: 1, color: "var(--muted)", fontWeight: 800 }}>
                Pin Location
              </Typography>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(coordinates) => setForm((currentForm) => ({ ...currentForm, ...coordinates }))}
                onPlaceSelect={(placeName) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    place: currentForm.place.trim() ? currentForm.place : placeName,
                  }))
                }
              />
              <Typography sx={{ mt: 1, color: "var(--muted)", fontSize: "0.88rem" }}>
                {form.latitude && form.longitude
                  ? `${form.latitude}, ${form.longitude}`
                  : "Click the map to drop a pin for this plan."}
              </Typography>
            </Box>
            <TextField label="Detail" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" className="travel-primary-button">
            {editingPlanId ? "Save Plan" : "Add Plan"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>

	    <Dialog
	      open={tripEditOpen}
	      onClose={() => setTripEditOpen(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
        Edit Trip
        <IconButton onClick={() => setTripEditOpen(false)} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleUpdateTrip}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField label="Trip name" value={tripEditForm.name} onChange={(event) => setTripEditForm({ ...tripEditForm, name: event.target.value })} fullWidth />
            <TextField label="Destination" value={tripEditForm.destination} onChange={(event) => setTripEditForm({ ...tripEditForm, destination: event.target.value })} fullWidth />
            <TextField label="Date range" value={tripEditForm.dateRange} onChange={(event) => setTripEditForm({ ...tripEditForm, dateRange: event.target.value })} fullWidth />
            <TextField label="Trip note" value={tripEditForm.notes} onChange={(event) => setTripEditForm({ ...tripEditForm, notes: event.target.value })} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTripEditOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" className="travel-primary-button">
            Save Trip
          </Button>
        </DialogActions>
	      </Box>
	    </Dialog>

	    <Dialog
	      open={Boolean(confirmDialog)}
	      onClose={() => setConfirmDialog(null)}
	      fullWidth
	      maxWidth="xs"
	    >
	      <DialogTitle sx={{ fontWeight: 900 }}>{confirmDialogTitle}</DialogTitle>
	      <DialogContent>
	        <Typography sx={{ color: "var(--muted)" }}>{confirmDialogMessage}</Typography>
	      </DialogContent>
	      <DialogActions>
	        <Button onClick={() => setConfirmDialog(null)}>Cancel</Button>
	        <Button variant="contained" color="error" onClick={handleConfirmDialogAction}>
	          {confirmDialogAction}
	        </Button>
	      </DialogActions>
	    </Dialog>
	    </>
	  );
	}
