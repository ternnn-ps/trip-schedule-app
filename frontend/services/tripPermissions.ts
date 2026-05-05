import { getAuthDisplayName, type AuthUser } from "@/services/authStore";
import { Trip } from "@/types/trip";

function normalizeAccessName(value?: string) {
  return value?.trim().toLowerCase() || "";
}

export function getAuthAccessNames(user: AuthUser | null) {
  if (!user) {
    return new Set<string>();
  }

  return new Set(
    [
      getAuthDisplayName(user),
      user.userFullName,
      user.userName,
      user.email,
    ]
      .map(normalizeAccessName)
      .filter(Boolean),
  );
}

export function canEditTrip(trip: Trip, user: AuthUser | null) {
  if (trip.allUsers) {
    return true;
  }

  const accessNames = getAuthAccessNames(user);

  return trip.users.some((tripUser) => accessNames.has(normalizeAccessName(tripUser)));
}

export function isTripHost(trip: Trip, user: AuthUser | null) {
  const accessNames = getAuthAccessNames(user);
  const hostName = trip.hostUserName || trip.users[0];

  return accessNames.has(normalizeAccessName(hostName));
}

export function canViewTrip(trip: Trip, user: AuthUser | null) {
  return trip.allUsers || canEditTrip(trip, user) || isTripHost(trip, user);
}

export function hasRequestedTripAccess(trip: Trip, user: AuthUser | null) {
  const accessNames = getAuthAccessNames(user);

  return (trip.pendingUsers ?? []).some((tripUser) => accessNames.has(normalizeAccessName(tripUser)));
}
