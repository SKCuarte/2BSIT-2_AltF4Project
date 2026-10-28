
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("app_user")
      .select("user_id")
      .limit(1);

    if (error) {
      console.error("Supabase query error:", error);

      return NextResponse.json(
        {
          status: "error",
          message: "Supabase connection check failed.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Supabase connection successful.",
    });
  } catch (error) {
    console.error("Health check error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Supabase is not configured or unavailable.",
      },
      { status: 503 },
    );
  }
}
