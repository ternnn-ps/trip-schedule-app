export interface Customer {
  customerId?: number;
  customerCode: string;
  customerName: string;
  telNo: string;
  address: string;
}


export interface MasterCustomerCriteria {
  keyword?: string;
}

 export interface ResponseModel<T> {
  msgHeader: string;
  msgDetail?: string;
  body: T;
  result: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
