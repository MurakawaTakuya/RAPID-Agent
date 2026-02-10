import { getUserIdFromRequest } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conferences, keyword } = body;

    // Log the received data
    console.log("Received request:", { conferences, keyword });

    // Validate input
    if (
      !conferences ||
      !Array.isArray(conferences) ||
      conferences.length === 0
    ) {
      return NextResponse.json(
        { error: "学会を選択してください" },
        { status: 400 }
      );
    }

    const cloudRunUrl = process.env.PYTHON_CLOUD_RUN_URL;
    if (!cloudRunUrl) {
      console.error("PYTHON_CLOUD_RUN_URL is not set");
      return NextResponse.json(
        { error: "Configuration Error" },
        { status: 500 }
      );
    }

    console.log(`Forwarding request to Cloud Run: ${cloudRunUrl}`);

    // Forward request to Python Cloud Run service
    const response = await fetch(cloudRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({ conferences, keyword }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cloud Run error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Cloud Run Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`Received response from Cloud Run:`, data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
