import { AppNotification } from "@/types/notification";
import { ResponseModel } from "@/types/user";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const API_TIMEOUT_MS = 5000;

export class NotificationService {
  async list(userName: string): Promise<ResponseModel<AppNotification[]> | undefined> {
    const response = await axios.get(
      `${BASE_URL}/notifications?userName=${encodeURIComponent(userName)}`,
      { timeout: API_TIMEOUT_MS },
    );
    return response.data;
  }

  async markRead(id: string): Promise<ResponseModel<AppNotification> | undefined> {
    const response = await axios.post(`${BASE_URL}/notifications/${id}/read`, undefined, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async markAllRead(userName: string): Promise<ResponseModel<AppNotification[]> | undefined> {
    const response = await axios.post(
      `${BASE_URL}/notifications/read-all?userName=${encodeURIComponent(userName)}`,
      undefined,
      { timeout: API_TIMEOUT_MS },
    );
    return response.data;
  }
}
