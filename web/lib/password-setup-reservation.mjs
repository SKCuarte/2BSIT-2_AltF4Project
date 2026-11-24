import { randomUUID } from "node:crypto";

export async function withPasswordSetupReservation(admin, authUserId, updatePassword) {
  const reservationId = randomUUID();
  const args = { p_auth_user_id: authUserId, p_reservation_id: reservationId };
  let reservation;
  try {
    reservation = await admin.rpc("reserve_password_setup", args);
  } catch (error) {
    console.error("Password setup reservation failed:", {
      code: error instanceof Error ? error.name : "reservation_failed",
    });
    return "unavailable";
  }
  if (reservation.error) {
    console.error("Password setup reservation failed:", { code: reservation.error.code });
    return "unavailable";
  }
  if (reservation.data !== true) return "ineligible";

  try {
    const result = await updatePassword();
    if (result.error || result.data?.user?.id !== authUserId) {
      console.error("Password setup Auth update failed; reservation retained:", {
        code: result.error?.code ?? result.error?.status ?? "unexpected_auth_response",
      });
      return "uncertain";
    }
  } catch (error) {
    console.error("Password setup Auth update failed; reservation retained:", {
      code: error instanceof Error ? error.name : "auth_update_failed",
    });
    return "uncertain";
  }

  try {
    const released = await admin.rpc("release_password_setup", args);
    if (released.error || released.data !== true) {
      console.error("Password setup reservation release failed:", {
        code: released.error?.code ?? "reservation_not_found",
      });
      return "release_failed";
    }
  } catch (error) {
    console.error("Password setup reservation release failed:", {
      code: error instanceof Error ? error.name : "release_failed",
    });
    return "release_failed";
  }
  return "ok";
}
