"use client";

import { User } from "@/types/user";

const AUTH_STORAGE_KEY = "travel-schedule-current-user";
const AUTH_UPDATED_EVENT = "travel-auth-updated";

export type AuthUser = Pick<User, "userId" | "userName" | "userFullName" | "email">;

let userCache: AuthUser | null = null;
let rawCache: string | null = null;

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeUser(user: User): AuthUser {
  return {
    userId: user.userId,
    userName: user.userName ?? "",
    userFullName: user.userFullName ?? "",
    email: user.email ?? "",
  };
}

export function getAuthUserServerSnapshot() {
  return null;
}

export function getAuthUser(): AuthUser | null {
  if (!canUseStorage()) {
    return getAuthUserServerSnapshot();
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (raw === rawCache) {
    return userCache;
  }

  if (!raw) {
    userCache = null;
    rawCache = raw;
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    userCache = parsed;
    rawCache = raw;
    return parsed;
  } catch (error) {
    console.error("Failed to parse auth storage:", error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    userCache = null;
    rawCache = null;
    return null;
  }
}

export function subscribeAuth(onStoreChange: () => void) {
  if (!canUseStorage()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_STORAGE_KEY) {
      userCache = null;
      rawCache = null;
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_UPDATED_EVENT, onStoreChange);
  };
}

export function loginWithUser(user: User) {
  if (!canUseStorage()) {
    return;
  }

  const nextUser = normalizeUser(user);
  const nextRaw = JSON.stringify(nextUser);
  window.localStorage.setItem(AUTH_STORAGE_KEY, nextRaw);
  userCache = nextUser;
  rawCache = nextRaw;
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function logoutUser() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  userCache = null;
  rawCache = null;
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

export function getAuthDisplayName(user: AuthUser | null) {
  if (!user) {
    return "Guest";
  }

  return user.userFullName?.trim() || user.userName?.trim() || user.email?.trim() || "User";
}
