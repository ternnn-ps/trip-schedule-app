export interface User {
  userId?: number;
  userName: string;
  userFullName: string;
  email: string;
  phone: string;
  website: string;
}

export interface UserCriteria {
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