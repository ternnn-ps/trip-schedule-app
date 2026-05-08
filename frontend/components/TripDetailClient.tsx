"use client";

import {
  addPlanToTrip,
  addUserToTrip,
  deletePlanFromTrip,
  deleteTrip,
  getTrips,
  getTripsServerSnapshot,
  removeUserFromTrip,
  requestJoinTrip,
  subscribeTrips,
  syncTripsFromBackend,
  updatePlanInTrip,
  updateTrip,
} from "@/services/tripStore";
import {
  getAuthDisplayName,
  getAuthUser,
  getAuthUserServerSnapshot,
  subscribeAuth,
} from "@/services/authStore";
import { formatDateRange, getTripDurationDays, parseTripDateRange } from "@/services/dateRange";
import { downloadTripReport } from "@/services/tripPdf";
import { getGoogleMapUrl, parseGoogleMapUrl } from "@/services/googleMaps";
import { canEditTrip, canViewTrip, hasRequestedTripAccess, isTripHost } from "@/services/tripPermissions";
import { UserService } from "@/services/UserService";
import LocationPicker from "@/components/LocationPicker";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapIcon from "@mui/icons-material/Map";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
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
  googleMapUrl: "",
};

const emptyTripEditForm = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  notes: "",
};

type ConfirmDialogState =
  | { type: "trip" }
  | { type: "plan"; plan: TripPlanItem }
  | { type: "user"; userName: string }
  | null;

type UserLocationDialogState = {
  name: string;
  user: User | null;
} | null;

function parsePlanDayNumber(day: string) {
  const match = day.match(/\d+/);
  const dayNumber = match ? Number(match[0]) : Number.NaN;

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return null;
  }

  return dayNumber;
}

function comparePlansByDayAndTime(first: TripPlanItem, second: TripPlanItem) {
  const firstDay = parsePlanDayNumber(first.day) ?? Number.MAX_SAFE_INTEGER;
  const secondDay = parsePlanDayNumber(second.day) ?? Number.MAX_SAFE_INTEGER;

  if (firstDay !== secondDay) {
    return firstDay - secondDay;
  }

  return first.time.localeCompare(second.time) || first.place.localeCompare(second.place);
}

function getUserDisplayName(user: User) {
  return user.userFullName?.trim() || user.userName?.trim() || user.email?.trim() || "Unnamed user";
}

function getUserKey(user: User) {
  return String(user.userId ?? user.userName ?? user.email ?? getUserDisplayName(user));
}

function userHasLocation(user?: User | null) {
  return Number.isFinite(user?.lastLatitude) && Number.isFinite(user?.lastLongitude);
}

function formatLocationTime(value?: string) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
}

export default function TripDetailClient({ tripId }: { tripId: string }) {
  const router = useRouter();
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getTripsServerSnapshot);
  const authUser = useSyncExternalStore(subscribeAuth, getAuthUser, getAuthUserServerSnapshot);
  const trip = trips.find((item) => item.id === tripId) ?? null;
  const [form, setForm] = useState(emptyPlanForm);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planMenu, setPlanMenu] = useState<{
    anchorEl: HTMLElement;
    plan: TripPlanItem;
  } | null>(null);
  const [tripMenuAnchorEl, setTripMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [usersMapOpen, setUsersMapOpen] = useState(false);
  const [tripEditOpen, setTripEditOpen] = useState(false);
  const [tripEditForm, setTripEditForm] = useState(emptyTripEditForm);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userLocationDialog, setUserLocationDialog] = useState<UserLocationDialogState>(null);
  const [error, setError] = useState("");
  const [mapUrlMessage, setMapUrlMessage] = useState("");

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

  useEffect(() => {
    if (!authUser?.userId || !navigator.geolocation) {
      return;
    }

    const throttleKey = `travel-user-location-updated-${authUser.userId}`;
    const lastUpdatedAt = Number(window.localStorage.getItem(throttleKey) ?? 0);
    const now = Date.now();

    if (now - lastUpdatedAt < 5 * 60 * 1000) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));

        window.localStorage.setItem(throttleKey, String(now));

        void userService.updateLocation(authUser.userId!, latitude, longitude)
          .then((response) => {
            if (!response?.result || !response.body) {
              return;
            }

            setAvailableUsers((users) => {
              const nextUser = response.body as User;
              const nextKey = getUserKey(nextUser);
              const hasExistingUser = users.some((user) => getUserKey(user) === nextKey);

              if (!hasExistingUser) {
                return users;
              }

              return users.map((user) => (getUserKey(user) === nextKey ? nextUser : user));
            });
          })
          .catch((locationError) => {
            console.error("Failed to update user location:", locationError);
          });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 6000,
      },
    );
  }, [authUser]);

  function openAddPlanDialog() {
    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    setForm(emptyPlanForm);
    setEditingPlanId(null);
    setError("");
    setMapUrlMessage("");
    setPlanDialogOpen(true);
  }

  function openEditPlanDialog(plan: TripPlanItem) {
    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    setPlanMenu(null);
    setForm({
      day: plan.day,
      time: plan.time,
      detail: plan.detail,
      place: plan.place,
      latitude: plan.latitude ?? "",
      longitude: plan.longitude ?? "",
      googleMapUrl: plan.googleMapUrl ?? "",
    });
    setEditingPlanId(plan.id);
    setError("");
    setMapUrlMessage("");
    setPlanDialogOpen(true);
  }

  function handleGoogleMapUrlChange(value: string) {
    const parsedPlace = parseGoogleMapUrl(value);

    setForm((currentForm) => ({
      ...currentForm,
      googleMapUrl: value,
      place: parsedPlace?.placeName && !currentForm.place.trim() ? parsedPlace.placeName : currentForm.place,
      latitude: parsedPlace?.latitude ?? currentForm.latitude,
      longitude: parsedPlace?.longitude ?? currentForm.longitude,
    }));

    if (!value.trim()) {
      setMapUrlMessage("");
      return;
    }

    if (!parsedPlace) {
      setMapUrlMessage("Paste a Google Maps URL to link this stop.");
      return;
    }

    setMapUrlMessage(
      parsedPlace.latitude && parsedPlace.longitude
        ? "Location found from Google Maps URL."
        : "Short Google Maps links can be saved, but coordinates need to be selected on the map.",
    );
  }

  function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trip) {
      return;
    }

    if (!canEditTrip(trip, authUser)) {
      setError("You do not have permission to edit this trip.");
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
      googleMapUrl: form.googleMapUrl.trim(),
      completed: editingPlanId
        ? Boolean(trip.plans.find((plan) => plan.id === editingPlanId)?.completed)
        : false,
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
    setMapUrlMessage("");
  }

  function openDeletePlanDialog(plan: TripPlanItem) {
    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    setPlanMenu(null);
    setConfirmDialog({ type: "plan", plan });
  }

  function togglePlanCompleted(plan: TripPlanItem) {
    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    const { id, ...planInput } = plan;

    setPlanMenu(null);
    updatePlanInTrip(trip.id, id, {
      ...planInput,
      completed: !Boolean(plan.completed),
    });
  }

  function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trip || !selectedUser || !canEditTrip(trip, authUser) || trip.allUsers) {
      return;
    }

    addUserToTrip(trip.id, getUserDisplayName(selectedUser));
    setSelectedUser(null);
    setAddUserDialogOpen(false);
  }

  function handleRemoveUser(userName: string) {
    if (!trip || !canEditTrip(trip, authUser) || trip.allUsers) {
      return;
    }

    setConfirmDialog({ type: "user", userName });
  }

  function findTripUser(userName: string) {
    const normalizedName = userName.trim().toLowerCase();

    return availableUsers.find((user) => {
      const displayName = getUserDisplayName(user).trim().toLowerCase();
      const userLogin = user.userName?.trim().toLowerCase();
      const email = user.email?.trim().toLowerCase();

      return displayName === normalizedName || userLogin === normalizedName || email === normalizedName;
    }) ?? null;
  }

  function openUserLocationDialog(userName: string) {
    setUserLocationDialog({
      name: userName,
      user: findTripUser(userName),
    });
  }

  function openEditTripDialog() {
    setTripMenuAnchorEl(null);

    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    const parsedDateRange = parseTripDateRange(trip.dateRange);
    setTripEditForm({
      name: trip.name,
      destination: trip.destination,
      startDate: parsedDateRange?.startDate ?? "",
      endDate: parsedDateRange?.endDate ?? "",
      notes: trip.notes,
    });
    setTripEditOpen(true);
  }

  function handleUpdateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !trip ||
      !canEditTrip(trip, authUser) ||
      !tripEditForm.name.trim() ||
      !tripEditForm.destination.trim() ||
      !tripEditForm.startDate ||
      !tripEditForm.endDate
    ) {
      return;
    }

    updateTrip(trip.id, {
      name: tripEditForm.name.trim(),
      destination: tripEditForm.destination.trim(),
      dateRange: formatDateRange(tripEditForm.startDate, tripEditForm.endDate),
      notes: tripEditForm.notes.trim(),
    });
    setTripEditOpen(false);
  }

  function openDeleteTripDialog() {
    setTripMenuAnchorEl(null);

    if (!trip || !canEditTrip(trip, authUser)) {
      return;
    }

    setConfirmDialog({ type: "trip" });
  }

  function handleConfirmDialogAction() {
    if (!trip || !confirmDialog) {
      return;
    }

    if (!canEditTrip(trip, authUser)) {
      setConfirmDialog(null);
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

  if (!canViewTrip(trip, authUser)) {
    const requestSent = hasRequestedTripAccess(trip, authUser);

    return (
      <Box className="travel-empty-state">
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Private trip
        </Typography>
        <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
          Only invited users can see this itinerary. You can ask the host to add you.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2, justifyContent: "center" }}>
          <Button
            variant="contained"
            className="travel-primary-button"
            disabled={requestSent}
            onClick={() => requestJoinTrip(trip.id, getAuthDisplayName(authUser))}
          >
            {requestSent ? "Request Sent" : "Request to Join"}
          </Button>
          <Button component={Link} href="/" variant="outlined" startIcon={<ArrowBackIcon />}>
            Back to Overview
          </Button>
        </Stack>
      </Box>
    );
  }

  const sortedPlans = [...trip.plans].sort(comparePlansByDayAndTime);
  const plansByDay = sortedPlans.reduce<Record<string, typeof trip.plans>>((groups, plan) => {
    groups[plan.day] = [...(groups[plan.day] ?? []), plan];
    return groups;
  }, {});
  const tripDurationDays = getTripDurationDays(trip.dateRange);
  const dayOptions = Array.from(
    { length: tripDurationDays ?? 14 },
    (_, index) => `Day ${index + 1}`,
  );
  const canEditCurrentTrip = canEditTrip(trip, authUser);
  const canReviewJoinRequests = isTripHost(trip, authUser) || canEditCurrentTrip;
  const hasSelectedDayOutsideOptions = Boolean(form.day) && !dayOptions.includes(form.day);
  const usersAvailableToAdd = trip.allUsers
    ? []
    : availableUsers.filter((user) => !trip.users.includes(getUserDisplayName(user)));
  const tripUsersForLocation = trip.allUsers
    ? availableUsers.map((user) => ({
        name: getUserDisplayName(user),
        user,
      }))
    : trip.users.map((userName) => ({
        name: userName,
        user: findTripUser(userName),
      }));
  const tripUserLocations = tripUsersForLocation
    .filter((item): item is { name: string; user: User } => userHasLocation(item.user))
    .map((item) => ({
      label: item.name,
      latitude: String(item.user.lastLatitude),
      longitude: String(item.user.lastLongitude),
    }));
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
      <Box className="page-heading trip-detail-heading">
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

        <Stack spacing={1} className="trip-detail-actions">
          <Stack direction="row" spacing={1} className="trip-detail-chip-row">
            <Chip icon={<LocationOnIcon />} label={trip.destination} />
            <Chip icon={<AccessTimeIcon />} label={`${trip.plans.length} plans`} />
          </Stack>
          {canEditCurrentTrip ? (
            <IconButton
              aria-label="Trip actions"
              className="kebab-button"
              onClick={(event) => setTripMenuAnchorEl(event.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          ) : null}
          <Button
            type="button"
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => downloadTripReport(trip)}
          >
            Download
          </Button>
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
                {trip.allUsers
                  ? "Every database user can view and edit this trip."
                  : "Selected users can edit this trip."}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                {trip.hostUserName ? (
                  <Chip label={`Host: ${trip.hostUserName}`} color="primary" variant="outlined" />
                ) : null}
                {trip.allUsers ? (
                  <Chip label="All users" color="primary" variant="outlined" />
                ) : trip.users.length > 0 ? (
                  trip.users.map((user) => (
                    <Chip
                      key={user}
                      label={user}
                      title="Tap to see last location"
                      onClick={() => openUserLocationDialog(user)}
                      onDelete={canEditCurrentTrip ? () => handleRemoveUser(user) : undefined}
                      deleteIcon={<CloseIcon />}
                    />
                  ))
                ) : (
                  <Chip label="No users yet" variant="outlined" />
                )}
              </Stack>
              {canReviewJoinRequests && !trip.allUsers && (trip.pendingUsers ?? []).length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: "var(--muted)", fontWeight: 800 }}>
                    Join requests
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                    {(trip.pendingUsers ?? []).map((user) => (
                      <Chip
                        key={user}
                        label={user}
                        color="warning"
                        variant="outlined"
                        onDelete={() => addUserToTrip(trip.id, user)}
                        deleteIcon={<CheckIcon />}
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Box>
            <Stack className="trip-user-panel-actions">
              <Button
                type="button"
                variant="outlined"
                className="trip-user-action-button"
                aria-label="Add user"
                onClick={() => setAddUserDialogOpen(true)}
                disabled={usersLoading || !canEditCurrentTrip || trip.allUsers}
              >
                {usersLoading ? <CircularProgress size={18} /> : <PersonAddIcon />}
                <Box component="span" className="trip-user-action-label">
                  Add User
                </Box>
              </Button>
              <Button
                type="button"
                variant="outlined"
                className="trip-user-action-button"
                aria-label="Show user locations map"
                onClick={() => setUsersMapOpen(true)}
                disabled={!trip.allUsers && trip.users.length === 0}
              >
                <MapIcon />
                <Box component="span" className="trip-user-action-label">
                  Map
                </Box>
              </Button>
            </Stack>
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
                {/* Plans are grouped by day for quick scanning. */}
              </Typography>
            </Box>
            <Stack
              className="itinerary-actions"
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}
            >
              <Chip className="itinerary-stop-chip" label={`${trip.plans.length} stops`} size="small" />
              {canEditCurrentTrip ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  className="travel-primary-button itinerary-add-plan-button"
                  onClick={openAddPlanDialog}
                >
                  Add Plan
                </Button>
              ) : null}
            </Stack>
          </Box>

          <Stack spacing={2.5} sx={{ mt: 2 }}>
            {Object.entries(plansByDay).map(([day, dayPlans]) => (
              <Box key={day} className="day-section">
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
                  {day}
                </Typography>
                <Stack spacing={1.5}>
                  {dayPlans.map((plan) => {
                    const googleMapUrl = getGoogleMapUrl(plan);

                    return (
                    <Card key={plan.id} className={`travel-plan-card${plan.completed ? " completed" : ""}`}>
                      <CardContent sx={{ p: 2.25 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.5 }}>
                                <Typography className="plan-content-text" sx={{ fontWeight: 900 }}>{plan.place}</Typography>
                                {plan.completed ? (
                                  <Chip
                                    className="plan-status-chip"
                                    icon={<CheckCircleIcon />}
                                    label="Done"
                                    size="small"
                                  />
                                ) : null}
                              </Stack>
                              <Typography className="plan-content-text" sx={{ color: "var(--muted)" }}>{plan.detail}</Typography>
                              {plan.latitude && plan.longitude ? (
                                <Box className="plan-place-panel" sx={{ mt: 1.5 }}>
                                  <LocationPicker
                                    latitude={plan.latitude}
                                    longitude={plan.longitude}
                                    readOnly
                                  />
                                  <Stack
                                    className="plan-map-actions"
                                    direction="row"
                                    spacing={0}
                                    sx={{ flexWrap: "wrap", mt: 1 }}
                                  >
                                    <Button
                                      component="a"
                                      href={googleMapUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      startIcon={<MapIcon />}
                                      size="small"
                                      sx={{ px: 0 }}
                                    >
                                      Open map
                                    </Button>
                                    {plan.googleMapUrl ? (
                                      <Button
                                        component="a"
                                        href={googleMapUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        startIcon={<ImageIcon />}
                                        size="small"
                                        sx={{ px: 0 }}
                                      >
                                        Photo & Review
                                      </Button>
                                    ) : null}
                                  </Stack>
                                </Box>
                              ) : plan.googleMapUrl ? (
                                <Box className="plan-place-panel" sx={{ mt: 1.5 }}>
                                  <Typography sx={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                                    Google Maps details are linked for this stop.
                                  </Typography>
                                  <Stack
                                    className="plan-map-actions"
                                    direction="row"
                                    spacing={0}
                                    sx={{ flexWrap: "wrap", mt: 1 }}
                                  >
                                    <Button
                                      component="a"
                                      href={googleMapUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      startIcon={<ImageIcon />}
                                      size="small"
                                      sx={{ px: 0 }}
                                    >
                                      Photo & Review
                                    </Button>
                                  </Stack>
                                </Box>
                              ) : null}
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
                              <Chip icon={<AccessTimeIcon />} label={plan.time} size="small" />
                              {canEditCurrentTrip ? (
                                <IconButton
                                  aria-label={`Plan actions for ${plan.place}`}
                                  size="small"
                                  className="kebab-button"
                                  onClick={(event) => setPlanMenu({ anchorEl: event.currentTarget, plan })}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              ) : null}
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                    );
                  })}
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
            togglePlanCompleted(planMenu.plan);
          }
        }}
      >
        <ListItemIcon>
          {planMenu?.plan.completed ? (
            <RadioButtonUncheckedIcon fontSize="small" />
          ) : (
            <CheckCircleIcon fontSize="small" color="success" />
          )}
        </ListItemIcon>
        <ListItemText>{planMenu?.plan.completed ? "Mark as active" : "Mark as done"}</ListItemText>
      </MenuItem>
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
      open={addUserDialogOpen}
      onClose={() => setAddUserDialogOpen(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
        Add User
        <IconButton onClick={() => setAddUserDialogOpen(false)} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleAddUser}>
        <DialogContent>
          <Stack spacing={2}>
            <Typography sx={{ color: "var(--muted)" }}>
              Select a database user to join this trip.
            </Typography>
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
                  label="User"
                  helperText={
                    usersError ||
                    (usersLoading
                      ? "Loading users from database..."
                      : "")
                  }
                  error={Boolean(usersError)}
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
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            className="travel-primary-button"
            startIcon={<PersonAddIcon />}
            disabled={usersLoading || !selectedUser}
          >
            Add to Trip
          </Button>
        </DialogActions>
      </Box>
    </Dialog>

    <Dialog
      open={usersMapOpen}
      onClose={() => setUsersMapOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
        User Locations
        <IconButton onClick={() => setUsersMapOpen(false)} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {tripUserLocations.length > 0 ? (
            <>
              <LocationPicker
                latitude=""
                longitude=""
                markers={tripUserLocations}
                readOnly
              />
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {tripUserLocations.map((marker) => (
                  <Chip
                    key={`${marker.label}-${marker.latitude}-${marker.longitude}`}
                    icon={<LocationOnIcon />}
                    label={marker.label}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </>
          ) : (
            <Box className="travel-empty-state">
              <Typography sx={{ fontWeight: 900 }}>No user locations yet</Typography>
              <Typography sx={{ color: "var(--muted)", mt: 0.75 }}>
                Trip users need to open the trip page and allow location access once before they appear on this map.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>

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
            <TextField
              label="Google Maps URL"
              value={form.googleMapUrl}
              onChange={(event) => handleGoogleMapUrlChange(event.target.value)}
              placeholder="Paste Google Maps link"
              helperText={mapUrlMessage || "Optional. If the URL includes coordinates, the map pin will update automatically."}
              fullWidth
            />
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
            <Box className="plan-form-grid">
              <TextField
                label="Start date"
                type="date"
                value={tripEditForm.startDate}
                onChange={(event) => setTripEditForm({ ...tripEditForm, startDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="End date"
                type="date"
                value={tripEditForm.endDate}
                onChange={(event) => setTripEditForm({ ...tripEditForm, endDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>
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
	      open={Boolean(userLocationDialog)}
	      onClose={() => setUserLocationDialog(null)}
	      fullWidth
	      maxWidth="sm"
	    >
	      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 900 }}>
	        Last Location
	        <IconButton onClick={() => setUserLocationDialog(null)} aria-label="Close dialog">
	          <CloseIcon />
	        </IconButton>
	      </DialogTitle>
	      <DialogContent>
	        <Stack spacing={2}>
	          <Box>
	            <Typography sx={{ fontWeight: 900 }}>
	              {userLocationDialog?.name}
	            </Typography>
	            <Typography sx={{ color: "var(--muted)", fontSize: "0.9rem" }}>
	              {userHasLocation(userLocationDialog?.user)
	                ? `Updated ${formatLocationTime(userLocationDialog?.user?.lastLocationUpdatedAt)}`
	                : "No saved location yet. The user needs to open the trip page and allow location access once."}
	            </Typography>
	          </Box>

	          {userHasLocation(userLocationDialog?.user) ? (
	            <>
	              <LocationPicker
	                latitude={String(userLocationDialog?.user?.lastLatitude ?? "")}
	                longitude={String(userLocationDialog?.user?.lastLongitude ?? "")}
	                readOnly
	              />
	              <Button
	                component="a"
	                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${userLocationDialog?.user?.lastLatitude},${userLocationDialog?.user?.lastLongitude}`)}`}
	                target="_blank"
	                rel="noreferrer"
	                startIcon={<MapIcon />}
	                variant="outlined"
	              >
	                Open map
	              </Button>
	            </>
	          ) : null}
	        </Stack>
	      </DialogContent>
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
