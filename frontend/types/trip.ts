export type TripPlanItem = {
  id: string;
  day: string;
  time: string;
  detail: string;
  place: string;
  locationName?: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
  completed?: boolean;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  dateRange: string;
  notes: string;
  hostUserName?: string;
  allUsers?: boolean;
  users: string[];
  pendingUsers?: string[];
  plans: TripPlanItem[];
};
