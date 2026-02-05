import { NextRequest, NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.PYTHON_CLOUD_RUN_URL || "";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CLOUD_RUN_URL) {
    console.error("PYTHON_CLOUD_RUN_URL is not set");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const response = await fetch(CLOUD_RUN_URL, {
      headers: { Authorization: authHeader },
    });

    // Python API returns text for success, JSON for error (usually)
    // We treat the body as text to be safe, then wrap it or parse it
    const text = await response.text();

    if (!response.ok) {
      // Try to parse as JSON if possible for better error message
      try {
        const jsonErr = JSON.parse(text);
        return NextResponse.json(jsonErr, { status: response.status });
      } catch {
        return NextResponse.json({ error: text }, { status: response.status });
      }
    }

    // Success: return as JSON data
    return NextResponse.json({ data: text });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
