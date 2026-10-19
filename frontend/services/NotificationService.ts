import { AppNotification } from "@/types/notification";
import { ResponseModel } from "@/types/user";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/services/apiConfig";
import axios from "axios";

const BASE_URL = API_BASE_URL;

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
