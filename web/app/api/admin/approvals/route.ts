import { NextResponse } from "next/server";
import { listPendingUserApprovals } from "@/lib/user-management.mjs";
import { requireSuperadmin } from "@/lib/superadmin-route";

export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const result = await listPendingUserApprovals(authorization.admin);
  if (result.status === "unavailable") {
    console.error("Pending approval list query failed:", { code: result.code });
    return NextResponse.json(
      { error: "Unable to load pending registrations. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}
