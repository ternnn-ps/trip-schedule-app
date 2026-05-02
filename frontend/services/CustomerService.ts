import axios from "axios";
import {
  MasterCustomerCriteria,
  Customer,
  PageResponse,
  ResponseModel,
} from "@/types/customer";

const BASE_URL = "http://localhost:8080";
const API_TIMEOUT_MS = 5000;

export const CUSTOMER_API_PATH = {
  search: "/customer/search",
  create: "/customer/create",
  update: "/customer/update",
  delete: "/customer/delete",
};

type SortField = {
  field: string;
  order: 1 | -1;
};

export class CustomerService {
  async search(
    data: MasterCustomerCriteria,
    page: number = 0,
    size: number = 10,
    sort?: SortField[]
  ): Promise<ResponseModel<PageResponse<Customer>> | undefined> {
    const paging = this.generatePagingStr(size, page, sort);

    const keywordParam = data?.keyword
      ? `&keyword=${encodeURIComponent(data.keyword)}`
      : "";

    const url = `${BASE_URL}${CUSTOMER_API_PATH.search}${paging}${keywordParam}`;

    const response = await axios.get(url, { timeout: API_TIMEOUT_MS });
    return response.data;
  }

  async create(data: Customer) {
    return axios
      .post(`${BASE_URL}${CUSTOMER_API_PATH.create}`, data, { timeout: API_TIMEOUT_MS })
      .then((res) => res.data);
  }

  async update(data: Customer) {
    return axios
      .put(`${BASE_URL}${CUSTOMER_API_PATH.update}`, data, { timeout: API_TIMEOUT_MS })
      .then((res) => res.data);
  }

  async delete(customerId: number) {
    return axios
      .post(`${BASE_URL}${CUSTOMER_API_PATH.delete}`, {
        customerId,
      }, { timeout: API_TIMEOUT_MS })
      .then((res) => res.data);
  }

  private generatePagingStr(size?: number, page?: number, sort?: SortField[]): string {
    let paging = "?";

    if (size !== undefined) paging += `size=${size}&`;
    if (page !== undefined) paging += `page=${page}&`;

    if (sort) {
      sort.forEach((s) => {
        paging += `sort=${s.field},${s.order === -1 ? "desc" : "asc"}&`;
      });
    }

    return paging.slice(0, -1);
  }
}
