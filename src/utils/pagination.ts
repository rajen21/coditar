import { z } from "../lib/zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}
