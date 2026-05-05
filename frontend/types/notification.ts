export type AppNotification = {
  id: string;
  recipientUserName: string;
  actorUserName: string;
  tripId: string;
  tripName: string;
  type: "TRIP_INVITE" | "TRIP_JOIN_REQUEST" | string;
  message: string;
  readFlag: boolean;
  createdDate: string;
};
