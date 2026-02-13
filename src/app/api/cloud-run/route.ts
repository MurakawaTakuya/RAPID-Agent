import { getUserIdFromRequest } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conferences, keyword, threshold } = body;

    // Validate input
    // TODO: conferenceの絞り込みを追加
    if (!keyword || typeof keyword !== "string" || keyword.trim() === "") {
      return NextResponse.json(
        { error: "キーワードを入力してください" },
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

    // Forward request to Python Cloud Run service
    const response = await fetch(cloudRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({ conferences, keyword, threshold }),
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
