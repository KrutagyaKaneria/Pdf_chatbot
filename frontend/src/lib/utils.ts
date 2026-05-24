import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSource(source: string) {
  const file = source.split(/[/\\]/).pop() || "Uploaded PDF";
  return file.replace(".pdf", "").replace(/[-_]/g, " ").slice(0, 56);
}

export function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}
