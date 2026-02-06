import { NextRequest, NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.PYTHON_CLOUD_RUN_URL || "";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CLOUD_RUN_URL) {
    console.error("PYTHON_CLOUD_RUN_URL is not set");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const response = await fetch(CLOUD_RUN_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
