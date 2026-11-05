import { NextResponse } from "next/server";
import { decideUserApproval } from "@/lib/user-management.mjs";
import { requireSuperadmin } from "@/lib/superadmin-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorization = await requireSuperadmin();
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("action" in body) ||
    (body.action !== "approve" && body.action !== "reject")
  ) {
    return NextResponse.json(
      { error: "Choose approve or reject for this registration." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const result = await decideUserApproval(authorization.admin, id, body.action);
  if (result.status === "invalid") {
    return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 });
  }
  if (result.status === "not_found") {
    return NextResponse.json(
      { error: "The active User role could not be found." },
      { status: 503 }
    );
  }
  if (result.status === "conflict") {
    return NextResponse.json(
      { error: "This registration is no longer pending. Refresh the list." },
      { status: 409 }
    );
  }
  if (result.status === "unavailable") {
    console.error("Registration decision failed:", { code: result.code });
    return NextResponse.json(
      { error: "Unable to update this registration. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    approvalStatus: result.approvalStatus,
    wasBlocked: result.wasBlocked,
  });
}
