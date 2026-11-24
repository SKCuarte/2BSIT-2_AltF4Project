
"use client";

import { useEffect, useState } from "react";
import {
  getModuleSelectionState,
  getUserSelection,
  updateRightSelection,
} from "@/lib/rights-selection.mjs";

type Right = { id: string; code: string; label: string; assigned: boolean };
type Module = { id: string; code: string; name: string; rights: Right[] };
type LoadState =
  | { userId: string; status: "loading" }
  | { userId: string; status: "error"; message: string }
  | { userId: string; status: "ready"; modules: Module[] };
type SelectionState = { userId: string; ids: Set<string> };

function isRightsResponse(value: unknown): value is { modules: Module[] } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("modules" in value) ||
    !Array.isArray(value.modules)
  ) return false;

  return value.modules.every((module: unknown) => {
    if (
      typeof module !== "object" ||
      module === null ||
      !("id" in module) ||
      typeof module.id !== "string" ||
      !("code" in module) ||
      typeof module.code !== "string" ||
      !("name" in module) ||
      typeof module.name !== "string" ||
      !("rights" in module) ||
      !Array.isArray(module.rights)
    ) return false;

    return module.rights.every((right: unknown) =>
      typeof right === "object" &&
      right !== null &&
      "id" in right &&
      typeof right.id === "string" &&
      "code" in right &&
      typeof right.code === "string" &&
      "label" in right &&
      typeof right.label === "string" &&
      "assigned" in right &&
      typeof right.assigned === "boolean"
    );
  });
}

function isSaveResponse(
  value: unknown
): value is { ok: true; changedCount: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "changedCount" in value &&
    typeof value.changedCount === "number" &&
    Number.isSafeInteger(value.changedCount) &&
    value.changedCount >= 0
  );
}

function getErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Unable to save permissions. Please try again.";
}

type RightsManagementProps = { userId: string; name: string };

export function RightsManagement(props: RightsManagementProps) {
  return <RightsManagementForUser key={props.userId} {...props} />;
}

function RightsManagementForUser({
  userId,
  name,
}: RightsManagementProps) {
  const [loadState, setLoadState] = useState<LoadState>({
    userId: "",
    status: "loading",
  });

  const [selectionState, setSelectionState] =
    useState<SelectionState | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/admin/users/${encodeURIComponent(userId)}/rights`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!active || controller.signal.aborted) return;

        const result: unknown = await response.json();

        if (!active || controller.signal.aborted) return;

        if (!response.ok) {
          setLoadState({
            userId,
            status: "error",
            message: getErrorMessage(result),
          });
          return;
        }

        if (!isRightsResponse(result)) {
          setLoadState({
            userId,
            status: "error",
            message: "The permissions response was invalid. Please try again.",
          });
          return;
        }

        setLoadState({
          userId,
          status: "ready",
          modules: result.modules,
        });

        setSelectionState({
          userId,
          ids: new Set(
            result.modules.flatMap((module) =>
              module.rights
                .filter((right) => right.assigned)
                .map((right) => right.id)
            )
          ),
        });
      } catch {
        if (active && !controller.signal.aborted) {
          setLoadState({
            userId,
            status: "error",
            message: "Unable to load permissions. Please check your connection.",
          });
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId]);

  const currentLoad =
    loadState.userId === userId ? loadState : null;

  const modules =
    currentLoad?.status === "ready"
      ? currentLoad.modules
      : null;

  const assigned = new Set(
    modules?.flatMap((module) =>
      module.rights
        .filter((right) => right.assigned)
        .map((right) => right.id)
    ) ?? []
  );

  const selected = getUserSelection(
    selectionState,
    userId,
    assigned
  );

  const allRightIds =
    modules?.flatMap((module) =>
      module.rights.map((right) => right.id)
    ) ?? [];

  const assignedCount = assigned.size;
  const selectedCount = selected.size;

  const hasDraftChanges =
    selected.size !== assigned.size ||
    [...selected].some((rightId) => !assigned.has(rightId));

  function setSelectedRights(
    rightIds: string[],
    checked: boolean
  ) {
    setSaveMessage("");

    setSelectionState((current) => ({
      userId,
      ids: updateRightSelection(
        getUserSelection(current, userId, assigned),
        rightIds,
        checked
      ),
    }));
  }

  async function saveRights() {
    if (!hasDraftChanges || saving) return;

    setSaving(true);
    setSaveMessage("");

    const rightIds = [...selected];

    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/rights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rightIds }),
        }
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        setSaveMessage(getErrorMessage(result));
        return;
      }

      if (!isSaveResponse(result)) {
        setSaveMessage(
          "The server returned an invalid response. Please reload the permissions."
        );
        return;
      }

      const savedIds = new Set(rightIds);

      setLoadState((current) => {
        if (current.userId !== userId || current.status !== "ready") {
          return current;
        }

        return {
          ...current,
          modules: current.modules.map((module) => ({
            ...module,
            rights: module.rights.map((right) => ({
              ...right,
              assigned: savedIds.has(right.id),
            })),
          })),
        };
      });

      setSelectionState(null);

      setSaveMessage(
        `Rights saved successfully. ${result.changedCount} assignment(s) updated.`
      );
    } catch {
      setSaveMessage(
        "Unable to save permissions. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="um-rights-content">
      <p>
        Permissions for <strong>{name}</strong>.
      </p>

      <p className="sub">
        Select the rights you want to assign to this user, then save your changes.
      </p>

      {currentLoad?.status === "error" ? (
        <p className="msg" role="alert">
          {currentLoad.message}
        </p>
      ) : !modules ? (
        <p role="status">Loading permissions...</p>
      ) : modules.length === 0 || allRightIds.length === 0 ? (
        <p className="sub">
          No active modules or rights are available.
        </p>
      ) : (
        modules.map((module) => {
          const moduleSelection = getModuleSelectionState(
            module.rights.map((right) => right.id),
            selected
          );

          return (
            <fieldset
              className="um-rights-module"
              key={module.id}
              disabled={saving}
            >
              <legend>{module.name}</legend>

              <div className="um-rights-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={moduleSelection.checked}
                    disabled={module.rights.length === 0}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate =
                          moduleSelection.indeterminate;
                      }
                    }}
                    onChange={(event) =>
                      setSelectedRights(
                        module.rights.map((right) => right.id),
                        event.target.checked
                      )
                    }
                  />
                  Select {module.name}
                </label>

                <button
                  className="ghost sm"
                  disabled={module.rights.length === 0}
                  onClick={() =>
                    setSelectedRights(
                      module.rights.map((right) => right.id),
                      true
                    )
                  }
                  type="button"
                >
                  All
                </button>

                <button
                  className="ghost sm"
                  disabled={module.rights.length === 0}
                  onClick={() =>
                    setSelectedRights(
                      module.rights.map((right) => right.id),
                      false
                    )
                  }
                  type="button"
                >
                  None
                </button>
              </div>

              <div className="um-rights-list">
                {module.rights.map((right) => (
                  <label key={right.id}>
                    <input
                      type="checkbox"
                      checked={selected.has(right.id)}
                      onChange={(event) =>
                        setSelectedRights(
                          [right.id],
                          event.target.checked
                        )
                      }
                    />
                    {right.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })
      )}

      {modules && allRightIds.length > 0 && (
        <>
          <div className="um-rights-controls">
            <span role="status">
              {selectedCount} of {allRightIds.length} selected |{" "}
              {assignedCount} currently assigned
            </span>

            <button
              className="ghost sm"
              disabled={saving}
              onClick={() =>
                setSelectedRights(allRightIds, true)
              }
              type="button"
            >
              All rights
            </button>

            <button
              className="ghost sm"
              disabled={saving}
              onClick={() =>
                setSelectedRights(allRightIds, false)
              }
              type="button"
            >
              No rights
            </button>
          </div>

          <p className="sub" role="status">
            {hasDraftChanges
              ? "Draft selection changed. It has not been saved."
              : "Showing the user's currently assigned rights."}
          </p>

          {saveMessage && (
            <p
              className="msg"
              role="status"
              aria-live="polite"
            >
              {saveMessage}
            </p>
          )}

          <button
            className="pri"
            disabled={!hasDraftChanges || saving}
            onClick={saveRights}
            type="button"
          >
            {saving ? "Saving..." : "Save rights"}
          </button>
        </>
      )}
    </div>
  );
}
