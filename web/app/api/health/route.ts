import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("health_check");

    if (error) {
      console.error("Database health check failed:", error.message);

      return NextResponse.json(
        { status: "error", message: "Database health check failed." },
        { status: 503 }
      );
    }

    if (data !== true) {
      return NextResponse.json(
        { status: "error", message: "Database health check returned an unexpected result." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "ok", database: "connected" },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Health check configuration error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { status: "error", message: "Health check is not configured." },
      { status: 503 }
    );
  }
}
