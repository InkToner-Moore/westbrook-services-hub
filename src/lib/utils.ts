import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanTrackingNumber(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/,/g, "").replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
}
