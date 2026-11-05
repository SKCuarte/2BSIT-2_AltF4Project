"use client";

import { useEffect, useState } from "react";

type PendingApproval = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isBlocked: boolean;
  role: "User";
};

function isApprovalList(value: unknown): value is { approvals: PendingApproval[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "approvals" in value &&
    Array.isArray(value.approvals) &&
    value.approvals.every(
      (approval) =>
        typeof approval === "object" &&
        approval !== null &&
        "id" in approval &&
        typeof approval.id === "string" &&
        "firstName" in approval &&
        typeof approval.firstName === "string" &&
        "lastName" in approval &&
        typeof approval.lastName === "string" &&
        "email" in approval &&
        typeof approval.email === "string" &&
        "isBlocked" in approval &&
        typeof approval.isBlocked === "boolean" &&
        "role" in approval &&
        approval.role === "User"
    )
  );
}

function isErrorResponse(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

export function SuperadminApprovalPanel() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApprovals() {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch("/api/admin/approvals");
        const result: unknown = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setErrorMessage(
            isErrorResponse(result)
              ? result.error
              : "Unable to load pending registrations."
          );
          setApprovals([]);
        } else if (!isApprovalList(result)) {
          setErrorMessage("The pending registrations response was invalid.");
          setApprovals([]);
        } else {
          setApprovals(result.approvals);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Unable to load pending registrations. Check your connection and try again."
          );
          setApprovals([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadApprovals();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function decide(approval: PendingApproval, action: "approve" | "reject") {
    const name = `${approval.firstName} ${approval.lastName}`.trim();
    const verb = action === "approve" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} ${name}?`)) return;

    setSavingId(approval.id);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/approvals/${encodeURIComponent(approval.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        setErrorMessage(
          isErrorResponse(result)
            ? result.error
            : `Unable to ${verb} this registration. Please try again.`
        );
        return;
      }

      setNotice(
        action === "approve"
          ? approval.isBlocked
            ? `${name} approved, but the account remains blocked. Unblock it to allow sign-in.`
            : `${name} approved. The account can proceed as an active User.`
          : `${name} rejected. The account cannot access the system.`
      );
      setRefreshKey((value) => value + 1);
    } catch {
      setErrorMessage(`Unable to ${verb} this registration. Please try again.`);
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="um-approvals" aria-labelledby="um-approvals-title">
      <header className="um-approval-heading">
        <div>
          <p className="um-eyebrow">SUPERADMIN</p>
          <h2 id="um-approvals-title">Registration approvals</h2>
          <p className="sub">
            Review pending registrations before they can use the system.
          </p>
        </div>
        <span className="um-approval-count">
          {approvals.length} pending
        </span>
      </header>

      {notice && <p className="um-notice" role="status">{notice}</p>}
      {errorMessage && <p className="msg" role="alert">{errorMessage}</p>}

      {loading ? (
        <p className="um-approval-state" role="status">Loading pending registrations…</p>
      ) : errorMessage ? (
        <p className="um-approval-state">Pending registrations are unavailable.</p>
      ) : approvals.length === 0 ? (
        <p className="um-approval-state">There are no pending registrations.</p>
      ) : (
        <ol className="um-approval-list">
          {approvals.map((approval) => {
            const name = `${approval.firstName} ${approval.lastName}`.trim();
            return (
              <li className="um-approval-card" key={approval.id}>
                <div className="um-approval-card-status">
                  <strong>Approval Status</strong>
                  <span className="um-status um-status-pending">Pending</span>
                </div>
                <div className="um-approval-card-main">
                  <div>
                    <h3>{name || "Unnamed account"}</h3>
                    <p>{approval.email}</p>
                  </div>
                  <span className="um-approval-role">
                    Role: {approval.role}
                    {approval.isBlocked ? " · Blocked" : ""}
                  </span>
                </div>
                <div className="um-approval-actions">
                  <button
                    className="um-approval-button um-approve"
                    disabled={savingId === approval.id}
                    onClick={() => void decide(approval, "approve")}
                    type="button"
                  >
                    {savingId === approval.id ? "Updating…" : "Approve"}
                  </button>
                  <button
                    className="um-approval-button um-reject"
                    disabled={savingId === approval.id}
                    onClick={() => void decide(approval, "reject")}
                    type="button"
                  >
                    Reject / Decline
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
