import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSource(source: string) {
  const file = source.split(/[/\\]/).pop() || "Uploaded PDF";
  return file.replace(".pdf", "").replace(/[-_]/g, " ").slice(0, 56);
}
