import { NextResponse } from "next/server";

export function success<T>(body: T) {
  return NextResponse.json({ msgHeader: "Success", body, result: true });
}

export function failed(message: string) {
  return NextResponse.json({ msgHeader: "Failed", msgDetail: message, body: null, result: false });
}

export function apiError(error: unknown) {
  console.error("Node API request failed:", error);
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ msgHeader: "Error", msgDetail: message, body: null, result: false }, { status: 500 });
}

export function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
