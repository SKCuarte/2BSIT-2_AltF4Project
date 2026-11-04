"use client";

import { useState } from "react";

type CreatedAccount = {
  approvalStatus: string;
  temporaryPassword: string;
};

export function AdminUserProvisioningForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setCreatedAccount(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const result: unknown = await response.json();

      if (
        typeof result !== "object" ||
        result === null ||
        Array.isArray(result)
      ) {
        setErrorMessage("Unable to create the account. Please try again.");
        return;
      }

      if (!response.ok) {
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Unable to create the account. Please try again.";
        setErrorMessage(message);
        return;
      }

      if (
        !("temporaryPassword" in result) ||
        typeof result.temporaryPassword !== "string" ||
        !("approvalStatus" in result) ||
        typeof result.approvalStatus !== "string"
      ) {
        setErrorMessage("The account was created, but its details could not be displayed. Contact the administrator.");
        return;
      }

      setCreatedAccount({
        approvalStatus: result.approvalStatus,
        temporaryPassword: result.temporaryPassword,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      onCreated?.();
    } catch {
      setErrorMessage("Account creation is unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="create-user-title">
      <h2 id="create-user-title">Create a user account</h2>
      <p className="sub">
        New accounts are regular Users and remain pending approval until an
        administrator approves them.
      </p>
      {createdAccount ? (
        <div className="admin-created-account" role="status">
          <p>
            Account created. Approval status: <strong>{createdAccount.approvalStatus}</strong>.
            The user must be approved before they can sign in.
          </p>
          <p>Share this temporary password securely. It is shown only once:</p>
          <code>{createdAccount.temporaryPassword}</code>
          <p>After approval, the user will be required to set a new password.</p>
          <button
            className="pri full"
            onClick={() => setCreatedAccount(null)}
            type="button"
          >
            Create another account
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="new-user-first-name">First name</label>
          <input
            autoComplete="given-name"
            id="new-user-first-name"
            maxLength={100}
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
          <label htmlFor="new-user-last-name">Last name</label>
          <input
            autoComplete="family-name"
            id="new-user-last-name"
            maxLength={100}
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
          <label htmlFor="new-user-email">Email address</label>
          <input
            autoComplete="email"
            id="new-user-email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <button className="pri full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
          <p className="msg" role="alert" aria-live="polite">
            {errorMessage}
          </p>
        </form>
      )}
    </section>
  );
}
