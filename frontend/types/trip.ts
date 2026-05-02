export type TripPlanItem = {
  id: string;
  day: string;
  time: string;
  detail: string;
  place: string;
  latitude?: string;
  longitude?: string;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  dateRange: string;
  notes: string;
  users: string[];
  plans: TripPlanItem[];
};
