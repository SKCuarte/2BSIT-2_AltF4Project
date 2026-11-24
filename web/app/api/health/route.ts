
import { connection, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  await connection();

  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("app_user")
      .select("id", { head: true })
      .limit(1);

    if (error) {
      console.error("Database health check failed:", error.message);

      return NextResponse.json(
        { status: "error", message: "Database health check failed." },
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
