import { Trip, TripPlanItem } from "@/types/trip";
import { PageResponse, ResponseModel } from "@/types/user";
import axios from "axios";

const BASE_URL = "http://localhost:8080";
const API_TIMEOUT_MS = 5000;

export const TRIP_API_PATH = {
  search: "/trip/search",
  getById: (tripId: string) => `/trip/${tripId}`,
  create: "/trip/create",
  update: "/trip/update",
  delete: "/trip/delete",
  addUser: (tripId: string) => `/trip/${tripId}/users`,
  addPlan: (tripId: string) => `/trip/${tripId}/plans`,
  updatePlan: (tripId: string, planId: string) => `/trip/${tripId}/plans/${planId}`,
  deletePlan: (tripId: string, planId: string) => `/trip/${tripId}/plans/${planId}/delete`,
};

type SortField = {
  field: string;
  order: 1 | -1;
};

export class TripService {
  async search(
    keyword: string = "",
    page: number = 0,
    size: number = 100,
    sort?: SortField[],
  ): Promise<ResponseModel<PageResponse<Trip>> | undefined> {
    const paging = this.generatePagingStr(size, page, sort);
    const keywordParam = keyword.trim() ? `&keyword=${encodeURIComponent(keyword.trim())}` : "";
    const url = `${BASE_URL}${TRIP_API_PATH.search}${paging}${keywordParam}`;

    const response = await axios.get(url, { timeout: API_TIMEOUT_MS });
    return response.data;
  }

  async getById(tripId: string): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.get(`${BASE_URL}${TRIP_API_PATH.getById(tripId)}`, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async create(data: Trip): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.post(`${BASE_URL}${TRIP_API_PATH.create}`, data, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async update(data: Trip): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.put(`${BASE_URL}${TRIP_API_PATH.update}`, data, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async delete(tripId: string): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.post(
      `${BASE_URL}${TRIP_API_PATH.delete}`,
      { id: tripId },
      { timeout: API_TIMEOUT_MS },
    );
    return response.data;
  }

  async addUser(tripId: string, userName: string): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.post(
      `${BASE_URL}${TRIP_API_PATH.addUser(tripId)}`,
      { userName },
      { timeout: API_TIMEOUT_MS },
    );
    return response.data;
  }

  async addPlan(
    tripId: string,
    plan: TripPlanItem,
  ): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.post(`${BASE_URL}${TRIP_API_PATH.addPlan(tripId)}`, plan, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async updatePlan(
    tripId: string,
    planId: string,
    plan: TripPlanItem,
  ): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.put(`${BASE_URL}${TRIP_API_PATH.updatePlan(tripId, planId)}`, plan, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  async deletePlan(tripId: string, planId: string): Promise<ResponseModel<Trip> | undefined> {
    const response = await axios.post(`${BASE_URL}${TRIP_API_PATH.deletePlan(tripId, planId)}`, undefined, {
      timeout: API_TIMEOUT_MS,
    });
    return response.data;
  }

  private generatePagingStr(size?: number, page?: number, sort?: SortField[]): string {
    let paging = "?";

    if (size !== undefined) paging += `size=${size}&`;
    if (page !== undefined) paging += `page=${page}&`;

    if (sort) {
      sort.forEach((item) => {
        paging += `sort=${item.field},${item.order === -1 ? "desc" : "asc"}&`;
      });
    }

    return paging.slice(0, -1);
  }
}
