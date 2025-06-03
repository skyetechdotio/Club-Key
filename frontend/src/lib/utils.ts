import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to readable string
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", options || defaultOptions).format(dateObj);
}

// Format time to readable string
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);
}

// Format price to readable string
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(price);
}

// Calculate time difference between two dates
export function getTimeDifference(date1: Date | string, date2: Date | string): string {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  
  const diffInMs = Math.abs(d2.getTime() - d1.getTime());
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays > 30) {
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""}`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
  } else {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
    }
  }
}

// Get initials from a name
export function getInitials(name: string): string {
  if (!name) return "?";
  
  const nameParts = name.split(" ");
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  
  return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
}

// Parse URL query parameters
export function parseQueryParams<T>(searchParams: URLSearchParams): Partial<T> {
  const params: Record<string, any> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (value) {
      // Try to parse as a number
      const numValue = Number(value);
      if (!isNaN(numValue) && value.trim() !== "") {
        params[key] = numValue;
      } else if (value.toLowerCase() === "true") {
        params[key] = true;
      } else if (value.toLowerCase() === "false") {
        params[key] = false;
      } else {
        params[key] = value;
      }
    }
  }
  
  return params as Partial<T>;
}
