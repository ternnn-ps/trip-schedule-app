export type ApiUser = {
  userId: number;
  userName: string;
  userFullName: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocationUpdatedAt?: Date | null;
};

export type TripPlanInput = {
  id?: string;
  day?: string;
  time?: string;
  detail?: string;
  place?: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
  completed?: boolean;
};

export type TripInput = {
  id?: string;
  name?: string;
  destination?: string;
  dateRange?: string;
  notes?: string;
  hostUserName?: string;
  allUsers?: boolean;
  users?: string[];
  pendingUsers?: string[];
  plans?: TripPlanInput[];
};
