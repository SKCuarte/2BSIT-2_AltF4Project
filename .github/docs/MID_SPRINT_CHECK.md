# Hope, Inc. ERP — Mid-Sprint Check Notes & Impediment Log

**Sprint**: Sprint 1 (Week 1)
**Facilitator**: Shanelle Kyan Cuarte (Scrum Master)
**Date**: Sprint Day 5

---

## 📑 1. Mid-Sprint Status Notes by Role

| Role | Lead / Member | Current Status & Completed Work | Blockers / Risks |
| :--- | :--- | :--- | :--- |
| **Scrum Master** | Shanelle Kyan Cuarte (`SKCuarte`) | Completed board setup (`S1-SM-02`), repo guidelines (`S1-SM-01`), and working agreements (`S1-SM-03`). | None. Monitoring PR reviews. |
| **DB Admin** | John Elijah Pangilinan (`elijahpangilinan200...`) | Supabase environment configured; initial schema definitions in progress. | Clarifying `audit_log` structure requirements. |
| **Developer** | Shan Michael De Leon (`shandeleon09-dot`) | Project scaffolding started; researching backend integration options. | Finalizing choice of backend runtime environment. |
| **Tester** | Joshua Morning Lazaro (`morninglazaro644-art`) | Drafted core test scenarios and permission matrix test plan. | Waiting for base auth screens for test execution. |
| **UI/UX Designer** | Marl Gem Barozo (`usr-Chr0nos`) | Wireframing user registration, login, and main sidebar views. | Awaiting feedback on layout mockups. |

---

## 🚨 2. Active Impediment Log

| ID | Impediment Description | Blocked Owner(s) | Impact Level | Action Plan / Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IMP-01** | Selection of primary backend runtime stack (Node.js vs alternatives). | Developer / DB Admin | Medium | Team discussion scheduled to finalize tech stack alignment. | `In Progress` |
| **IMP-02** | Turnaround time on peer PR reviews exceeding 24 hours. | All Roles | High | Enforce 24h PR turnaround rule specified in `TEAM_AGREEMENTS.md`. | `Resolved` |

---

## 🚀 3. PR Velocity & Target Minimum Progress

### Counting Basis & Objective Status Thresholds
* **Counting Basis**: This checkpoint counts only **merged, role-related PRs** authored by the member. Draft or unmerged PRs, review comments, and unrelated PRs do not count. The UI/UX count includes PRs **#49, #56, #57, and #64**, which contain interface, wireframe, or design-system work.
* **Target Basis**: The target numbers match the role minimums in the working agreement published in PR **#65** (Scrum Master 5, DB Admin 6, Developer 8, Tester 6, UI/UX 5). The agreement describes broader PR/task contributions; this table uses those numbers as a **PR-delivery benchmark only**. It does not measure non-PR tasks, such as a Tester’s inline reviews or sign-offs.
* **On Track (🟢)**: Member has completed **≥ 40%** of their target PR benchmark by mid-sprint and has no active blockers.
* **Needs Push (🟡)**: Member has completed **< 40%** of their target PR benchmark **or has an active blocker**, regardless of progress percentage.

| Role | Team Member | Current Completed PRs | Target Minimum PRs | Progress % | Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Scrum Master** | Shanelle Kyan Cuarte | 3 | 5 | 60% | On Track 🟢 |
| **DB Admin** | John Elijah Pangilinan | 3 | 6 | 50% | Needs Push 🟡 (active blocker) |
| **Developer** | Shan Michael De Leon | 1 | 8 | 12.5% | Needs Push 🟡 |
| **Tester** | Joshua Morning Lazaro | 1 | 6 | 16.7% | Needs Push 🟡 |
| **UI/UX Designer** | Marl Gem Barozo | 4 | 5 | 80% | Needs Push 🟡 (active blocker) |