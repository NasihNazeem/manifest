import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const isNotNil = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null;

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
