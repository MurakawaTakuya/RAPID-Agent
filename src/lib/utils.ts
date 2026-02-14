import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function parseErrorResponse(
  response: Response,
  defaultMessage: string
): Promise<string> {
  const contentType = response.headers.get("content-type");
  try {
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
      ) {
        return data.error || defaultMessage;
      }
    }
    const text = await response.text();
    return text.slice(0, 200) || defaultMessage;
  } catch {
    return `${defaultMessage}: ${response.status} ${response.statusText}`;
  }
}
