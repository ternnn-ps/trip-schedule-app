"use client";

import { Trip, TripPlanItem } from "@/types/trip";
import { TripService } from "@/services/TripService";

const STORAGE_KEY = "travel-schedule-app-trips";
const TRIPS_UPDATED_EVENT = "travel-trips-updated";
export const OPEN_CREATE_TRIP_EVENT = "open-create-trip-dialog";
const tripService = new TripService();

const starterTrips: Trip[] = [
  {
    id: "kyoto-spring",
    name: "Kyoto Spring Escape",
    destination: "Kyoto, Japan",
    dateRange: "14 Apr - 18 Apr 2026",
    notes: "Mix quiet mornings with food stops and easy transit between neighborhoods.",
    users: ["Mina", "Alex"],
    plans: [
      {
        id: "kyoto-plan-1",
        day: "Day 1",
        time: "09:00",
        detail: "Arrive, drop bags, and walk through Nishiki Market for breakfast.",
        place: "Nishiki Market",
        latitude: "35.0050",
        longitude: "135.7647",
      },
      {
        id: "kyoto-plan-2",
        day: "Day 1",
        time: "14:00",
        detail: "Visit Kiyomizu-dera and keep the evening open for nearby streets.",
        place: "Kiyomizu-dera",
      },
      {
        id: "kyoto-plan-3",
        day: "Day 2",
        time: "07:30",
        detail: "Early shrine walk before crowds, then coffee and journaling.",
        place: "Fushimi Inari Taisha",
      },
    ],
  },
  {
    id: "bangkok-weekend",
    name: "Bangkok Weekend Reset",
    destination: "Bangkok, Thailand",
    dateRange: "02 May - 04 May 2026",
    notes: "Keep this one flexible with river travel, one market night, and a slow final morning.",
    users: ["Pacha"],
    plans: [
      {
        id: "bangkok-plan-1",
        day: "Day 1",
        time: "16:30",
        detail: "Check in and take the boat toward the old town before sunset.",
        place: "Tha Tien Pier",
        latitude: "13.7444",
        longitude: "100.4890",
      },
      {
        id: "bangkok-plan-2",
        day: "Day 2",
        time: "19:00",
        detail: "Street food crawl with a short list so the night stays easy.",
        place: "Yaowarat Road",
      },
    ],
  },
];

let tripsCache: Trip[] | null = null;
let rawCache: string | null = null;
let pendingBackendActions = 0;

function canUseStorage() {
  return typeof window !== "undefined";
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setCache(trips: Trip[], raw: string) {
  tripsCache = trips;
  rawCache = raw;
}

function normalizeTrip(trip: Trip): Trip {
  return {
    ...trip,
    users: Array.isArray(trip.users) ? trip.users : [],
    plans: Array.isArray(trip.plans)
      ? trip.plans.map((plan) => ({
          ...plan,
          latitude: plan.latitude ?? "",
          longitude: plan.longitude ?? "",
        }))
      : [],
  };
}

export function getTripsServerSnapshot(): Trip[] {
  return starterTrips;
}

export function getTrips(): Trip[] {
  if (!canUseStorage()) {
    return getTripsServerSnapshot();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (tripsCache && raw === rawCache) {
    return tripsCache;
  }

  if (!raw) {
    const starterRaw = JSON.stringify(starterTrips);
    window.localStorage.setItem(STORAGE_KEY, starterRaw);
    setCache(starterTrips, starterRaw);
    return starterTrips;
  }

  try {
    const parsed = JSON.parse(raw) as Trip[];

    if (Array.isArray(parsed)) {
      const normalized = parsed.map(normalizeTrip);
      const normalizedRaw = JSON.stringify(normalized);

      if (normalizedRaw !== raw) {
        window.localStorage.setItem(STORAGE_KEY, normalizedRaw);
      }

      setCache(normalized, normalizedRaw);
      return normalized;
    }
  } catch (error) {
    console.error("Failed to parse trip storage:", error);
  }

  const fallbackRaw = JSON.stringify(starterTrips);
  window.localStorage.setItem(STORAGE_KEY, fallbackRaw);
  setCache(starterTrips, fallbackRaw);
  return starterTrips;
}

function saveTrips(nextTrips: Trip[]) {
  if (!canUseStorage()) {
    return;
  }

  const nextRaw = JSON.stringify(nextTrips);
  window.localStorage.setItem(STORAGE_KEY, nextRaw);
  setCache(nextTrips, nextRaw);
  window.dispatchEvent(new Event(TRIPS_UPDATED_EVENT));
}

function syncTripChange(
  actionName: string,
  action: () => Promise<{ result: boolean; msgDetail?: string } | undefined>,
) {
  pendingBackendActions += 1;

  void action()
    .then((response) => {
      if (response && !response.result) {
        console.error(`Trip backend ${actionName} failed:`, response.msgDetail);
      }
    })
    .catch((error) => {
      console.error(`Trip backend ${actionName} failed:`, error);
    })
    .finally(() => {
      pendingBackendActions = Math.max(0, pendingBackendActions - 1);
    });
}

export async function syncTripsFromBackend() {
  if (pendingBackendActions > 0) {
    return;
  }

  try {
    const response = await tripService.search("", 0, 100, [{ field: "name", order: 1 }]);

    if (!response?.result) {
      console.error("Trip backend search failed:", response?.msgDetail);
      return;
    }

    saveTrips((response.body?.content ?? []).map(normalizeTrip));
  } catch (error) {
    console.error("Trip backend search failed:", error);
  }
}

export function subscribeTrips(onStoreChange: () => void) {
  if (!canUseStorage()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      tripsCache = null;
      rawCache = null;
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TRIPS_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TRIPS_UPDATED_EVENT, onStoreChange);
  };
}

export function createTrip(data: Omit<Trip, "id" | "plans">) {
  const newTrip: Trip = {
    ...data,
    id: makeId("trip"),
    plans: [],
  };

  saveTrips([newTrip, ...getTrips()]);
  syncTripChange("create", () => tripService.create(newTrip));
  return newTrip;
}

export function updateTrip(
  tripId: string,
  updates: Partial<Omit<Trip, "id" | "plans">>,
) {
  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    return {
      ...trip,
      ...updates,
      users: updates.users ?? trip.users,
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("update", () => tripService.update(updatedTrip));
  }

  return updatedTrip;
}

export function deleteTrip(tripId: string) {
  saveTrips(getTrips().filter((trip) => trip.id !== tripId));
  syncTripChange("delete", () => tripService.delete(tripId));
}

export function addUserToTrip(tripId: string, userName: string) {
  const normalizedName = userName.trim();

  if (!normalizedName) {
    return getTrips().find((trip) => trip.id === tripId) ?? null;
  }

  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId || trip.users.includes(normalizedName)) {
      return trip;
    }

    return {
      ...trip,
      users: [...trip.users, normalizedName],
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("add user", () => tripService.addUser(tripId, normalizedName));
  }

  return updatedTrip;
}

export function removeUserFromTrip(tripId: string, userName: string) {
  const normalizedName = userName.trim();

  if (!normalizedName) {
    return getTrips().find((trip) => trip.id === tripId) ?? null;
  }

  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    return {
      ...trip,
      users: trip.users.filter((user) => user !== normalizedName),
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("remove user", () => tripService.update(updatedTrip));
  }

  return updatedTrip;
}

export function addPlanToTrip(
  tripId: string,
  plan: Omit<TripPlanItem, "id">,
) {
  const newPlan: TripPlanItem = {
    id: makeId("plan"),
    ...plan,
  };
  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    return {
      ...trip,
      plans: [
        ...trip.plans,
        newPlan,
      ],
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("add plan", () => tripService.addPlan(tripId, newPlan));
  }

  return updatedTrip;
}

export function updatePlanInTrip(
  tripId: string,
  planId: string,
  updates: Omit<TripPlanItem, "id">,
) {
  const updatedPlan: TripPlanItem = {
    id: planId,
    ...updates,
  };
  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    return {
      ...trip,
      plans: trip.plans.map((plan) => {
        if (plan.id !== planId) {
          return plan;
        }

        return {
          ...plan,
          ...updatedPlan,
        };
      }),
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("update plan", () => tripService.updatePlan(tripId, planId, updatedPlan));
  }

  return updatedTrip;
}

export function deletePlanFromTrip(tripId: string, planId: string) {
  const updatedTrips = getTrips().map((trip) => {
    if (trip.id !== tripId) {
      return trip;
    }

    return {
      ...trip,
      plans: trip.plans.filter((plan) => plan.id !== planId),
    };
  });

  saveTrips(updatedTrips);
  const updatedTrip = updatedTrips.find((trip) => trip.id === tripId) ?? null;

  if (updatedTrip) {
    syncTripChange("delete plan", () => tripService.deletePlan(tripId, planId));
  }

  return updatedTrip;
}
