import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const API_TIMEOUT_MS = 5000;

export class KeepAliveService {
  async ping() {
    const response = await axios.get(`${BASE_URL}/ping`, {
      responseType: "text",
      timeout: API_TIMEOUT_MS,
    });

    return response.status >= 200 && response.status < 300;
  }
}
