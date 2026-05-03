export type TripPlanItem = {
  id: string;
  day: string;
  time: string;
  detail: string;
  place: string;
  latitude?: string;
  longitude?: string;
  googleMapUrl?: string;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  dateRange: string;
  notes: string;
  allUsers?: boolean;
  users: string[];
  plans: TripPlanItem[];
};
