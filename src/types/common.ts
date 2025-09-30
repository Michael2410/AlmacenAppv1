export type ID = string;

export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type Option<T extends string | number = string> = {
  label: string;
  value: T;
};
