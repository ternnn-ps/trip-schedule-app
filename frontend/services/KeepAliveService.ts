import { API_BASE_URL, API_TIMEOUT_MS } from "@/services/apiConfig";
import axios from "axios";

const BASE_URL = API_BASE_URL;

export class KeepAliveService {
  async ping() {
    const response = await axios.get(`${BASE_URL}/ping`, {
      responseType: "text",
      timeout: API_TIMEOUT_MS,
    });

    return response.status >= 200 && response.status < 300;
  }
}
