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
