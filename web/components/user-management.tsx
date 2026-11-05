"use client";

import { useEffect, useState } from "react";
import { AdminUserProvisioningForm } from "@/components/admin-user-provisioning-form";

type ManagedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "User" | "Admin";
  status: "Active" | "Blocked" | "Inactive" | "Pending" | "Rejected";
  createdAt: string | null;
};

type UserListResponse = {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
};

type ModalState =
  | { type: "add" }
  | { type: "edit"; user: ManagedUser }
  | null;

function isUserListResponse(value: unknown): value is UserListResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "users" in value &&
    Array.isArray(value.users) &&
    "total" in value &&
    typeof value.total === "number" &&
    "page" in value &&
    typeof value.page === "number" &&
    "pageSize" in value &&
    typeof value.pageSize === "number"
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

export function UserManagement({ actorRole }: { actorRole: "Admin" | "Superadmin" }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErrorMessage("");
      const params = new URLSearchParams({
        search,
        role,
        status,
        page: String(page),
        pageSize: "25",
      });

      try {
        const response = await fetch(`/api/admin/users?${params}`);
        const result: unknown = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setErrorMessage(
            isErrorResponse(result)
              ? result.error
              : "Unable to load users. Please try again."
          );
          setUsers([]);
          setTotal(0);
          return;
        }
        if (!isUserListResponse(result)) {
          setErrorMessage("The user list response was invalid. Please try again.");
          setUsers([]);
          setTotal(0);
          return;
        }
        setUsers(result.users);
        setTotal(result.total);
      } catch {
        if (!cancelled) {
          setErrorMessage("Unable to load users. Please check your connection and try again.");
          setUsers([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, refreshKey, role, search, status]);

  useEffect(() => {
    if (!modal) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modal]);

  function openEdit(user: ManagedUser) {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setErrorMessage("");
    setModal({ type: "edit", user });
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "edit") return;
    setSavingId(modal.user.id);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(modal.user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setErrorMessage(
          isErrorResponse(result)
            ? result.error
            : "Unable to save the user. Please try again."
        );
        return;
      }
      setModal(null);
      setNotice("User details updated.");
      setRefreshKey((value) => value + 1);
    } catch {
      setErrorMessage("Unable to save the user. Please try again.");
    } finally {
      setSavingId("");
    }
  }

  async function toggleBlocked(user: ManagedUser) {
    const shouldBlock = user.status !== "Blocked";
    const action = shouldBlock ? "block" : "unblock";
    if (!window.confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    setSavingId(user.id);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: shouldBlock }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setErrorMessage(
          isErrorResponse(result)
            ? result.error
            : `Unable to ${action} the user. Please try again.`
        );
        return;
      }
      setNotice(`User ${shouldBlock ? "blocked" : "unblocked"}.`);
      setRefreshKey((value) => value + 1);
    } catch {
      setErrorMessage(`Unable to ${action} the user. Please try again.`);
    } finally {
      setSavingId("");
    }
  }

  async function toggleAdminRole(user: ManagedUser) {
    const newRole = user.role === "User" ? "Admin" : "User";
    const action = newRole === "Admin" ? "promote" : "demote";
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.firstName} ${user.lastName} to ${newRole}?`
      )
    ) {
      return;
    }

    setSavingId(user.id);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setErrorMessage(
          isErrorResponse(result)
            ? result.error
            : `Unable to ${action} this account. Please try again.`
        );
        return;
      }

      setNotice(`${user.firstName} ${user.lastName} is now a ${newRole}.`);
      setRefreshKey((value) => value + 1);
    } catch {
      setErrorMessage(`Unable to ${action} this account. Please try again.`);
    } finally {
      setSavingId("");
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <section className="user-management" aria-labelledby="users-title">
      <header className="um-heading">
        <div>
          <p className="um-eyebrow">HOPE, INC. ERP</p>
          <h2 id="users-title">Manage accounts</h2>
          <p className="sub">
            {actorRole === "Admin"
              ? "Manage regular User accounts."
              : "Manage User and Admin accounts."}
          </p>
        </div>
        <button className="pri" onClick={() => setModal({ type: "add" })} type="button">
          Add User
        </button>
      </header>

      {notice && <p className="um-notice" role="status">{notice}</p>}
      {errorMessage && <p className="msg" role="alert">{errorMessage}</p>}

      <div className="um-filters">
        <label>
          <span>Search users</span>
          <input
            autoComplete="off"
            maxLength={100}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Name or email"
            type="search"
            value={search}
          />
        </label>
        {actorRole === "Superadmin" && (
          <label>
            <span>Role</span>
            <select
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              value={role}
            >
              <option value="">All manageable roles</option>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
        )}
        <label>
          <span>Status</span>
          <select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
            <option value="Blocked">Blocked</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="um-state" colSpan={5}>Loading users…</td></tr>
            ) : errorMessage ? (
              <tr><td className="um-state" colSpan={5}>User list unavailable.</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="um-state" colSpan={5}>No users found.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{`${user.firstName} ${user.lastName}`.trim()}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td><span className={`um-status um-status-${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td className="um-actions">
                    <button
                      aria-label={`Edit ${user.firstName} ${user.lastName}`}
                      className="um-action um-action-edit"
                      disabled={savingId === user.id}
                      onClick={() => openEdit(user)}
                      type="button"
                    >
                      Edit
                    </button>
                    {actorRole === "Superadmin" && user.status === "Active" && (
                      <button
                        aria-label={`${user.role === "User" ? "Promote" : "Demote"} ${user.firstName} ${user.lastName} ${user.role === "User" ? "to Admin" : "to User"}`}
                        className="um-action um-action-role"
                        disabled={savingId === user.id}
                        onClick={() => void toggleAdminRole(user)}
                        type="button"
                      >
                        {user.role === "User" ? "Promote to Admin" : "Demote to User"}
                      </button>
                    )}
                    <button
                      aria-label={`${user.status === "Blocked" ? "Unblock" : "Block"} ${user.firstName} ${user.lastName}`}
                      className={`um-action ${user.status === "Blocked" ? "um-action-unblock" : "um-action-block"}`}
                      disabled={savingId === user.id}
                      onClick={() => void toggleBlocked(user)}
                      type="button"
                    >
                      {user.status === "Blocked" ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="um-pagination">
        <span>{total} user{total === 1 ? "" : "s"}</span>
        <div>
          <button
            className="ghost sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
            type="button"
          >
            Previous
          </button>
          <span>Page {page} of {pageCount}</span>
          <button
            className="ghost sm"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </footer>

      <a className="um-back-link" href="/dashboard">Back to dashboard</a>

      {modal && (
        <div
          className="um-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            aria-labelledby="um-modal-title"
            aria-modal="true"
            className="um-modal"
            role="dialog"
          >
            <header className="um-modal-heading">
              <h2 id="um-modal-title">
                {modal.type === "add" ? "Add User" : "Edit User"}
              </h2>
              <button
                aria-label="Close"
                className="ghost sm"
                onClick={() => setModal(null)}
                type="button"
              >
                Close
              </button>
            </header>
            {modal.type === "add" ? (
              <AdminUserProvisioningForm
                onCreated={() => setRefreshKey((value) => value + 1)}
              />
            ) : (
              <form className="um-edit-form" onSubmit={saveUser}>
                <p className="sub">
                  Email and role cannot be changed here. Account status is managed separately.
                </p>
                <label htmlFor="um-first-name">First Name</label>
                <input
                  autoComplete="given-name"
                  id="um-first-name"
                  maxLength={100}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  value={firstName}
                />
                <label htmlFor="um-last-name">Last Name</label>
                <input
                  autoComplete="family-name"
                  id="um-last-name"
                  maxLength={100}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  value={lastName}
                />
                <button className="pri" disabled={savingId === modal.user.id} type="submit">
                  {savingId === modal.user.id ? "Saving…" : "Save changes"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
