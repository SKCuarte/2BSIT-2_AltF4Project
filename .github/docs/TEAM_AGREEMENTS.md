# Hope, Inc. ERP — Team Governance & Working Agreements

This document outlines the operational framework, team agreements, Definition of Done (DoD), and role execution guidelines for the Hope, Inc. ERP project.

---

## 🤝 1. Team Working Agreement

### Communication Channels
- **Primary Asynchronous**: GitHub Issues, Pull Request comments, and code reviews.
- **Synchronous & Quick Queries**: Discord / MS Teams team channel.
- **Urgent Blockers**: Direct tag in Discord/Teams with an issue link.

### Collaboration & Meeting Norms
- **Daily Standups**: Brief updates shared asynchronously in Discord by 10:00 AM.
- **Sprint Ceremonies**: Active participation in Sprint Planning, Backlog Refinement, and Sprint Retrospective meetings.
- **Review Turnaround**: Team members must review assigned Pull Requests within **24 hours**.

### Core Operational Rules
- **No Direct Commits**: Direct commits to the `main` branch are strictly prohibited. All work must be submitted via feature branches and PRs.
- **Board Up-to-Date**: Task statuses on the Project Board must be updated in real time as work progresses.
- **Early Escalation**: If blocked on a task for more than **4 hours**, notify the Scrum Master or relevant technical lead immediately.

---

## ✅ 2. Definition of Done (DoD)

A deliverable, feature, or task is formally considered **Done** only when all of the following criteria are met:

- [ ] **Standards Compliance**: Code, documentation, or SQL scripts adhere strictly to project style guides and conventions.
- [ ] **Self-Review**: Author has completed a full self-review before requesting feedback.
- [ ] **Peer Review**: At least **1 mandatory approving review** from a designated team member.
- [ ] **Issue Traceability**: The PR description includes `Closes #<issue_number>` to automatically link and close the associated issue upon merge.
- [ ] **Project Board Updated**: The issue card is placed in the `In Review` column during review and automatically moves to `Done` upon merge.
- [ ] **Testing & Quality**: Unit tests, schema validations, or manual verification steps pass without errors (where applicable).

---

## 🎯 3. Role Execution Guide & PR Expectations

### Role Breakdown & Responsibilities
- **Scrum Master (SM)**: Board configuration, workflows, governance documentation, repository guidelines, and branch protection setup.
- **Database Administrator (DBA)**: Database migrations, schema designs, seed data scripts, and audit log setups.
- **Developer (DEV)**: Application scaffolding, authentication APIs, session management, and UI component integration.
- **Tester (TST)**: Test plan creation, permission matrix testing, edge-case validation, and test report documentation.
- **UI/UX Designer**: Layout designs, sidebar components, user flow mockups, and design system alignment.

### PR Delivery Minimums & Evaluation Rules
* **Developer**: Minimum **8 PRs/tasks** across core scaffolding, API, and feature implementations.
* **Database Administrator (DBA)**: Minimum **6 PRs/tasks** across schema, migration, and seed tasks.
* **Tester**: Minimum **6 PRs/tasks** across test plan creation, test execution reports, and permission/edge-case matrices.
* **UI/UX Designer**: Minimum **5 PRs/tasks** across wireframes, layout specs, component designs, and design system alignment.
* **Scrum Master**: Minimum **5 PRs/tasks** across board configuration, repository guidelines, workflows, and governance documentation.

### Grading & Assessment Criteria
- Deliverables are evaluated based on **PR quality**, adherence to the **Definition of Done**, accurate issue linking, and overall contribution consistency throughout the sprint.

## Definition of Done (DoD) & Testing Threshold

To mark any user story or feature complete, the following testing threshold must be met:
* **Test Coverage & Execution**: 100% of defined critical-path acceptance criteria must have passing test cases (manual or automated).
* **Defect Policy**: Zero unresolved high or critical (blocking) severity bugs.
* **Verification**: Quality Assurance must execute and verify feature functionality against acceptance criteria prior to merging into `main`.

---

### Role-Based Contribution & PR Guidelines

To ensure fair evaluation across all project roles, members are assessed based on their planned Sprint 1 deliverables:

* **Developer**: Evaluated against **8 planned PRs/tasks** covering scaffolding, API routes, and UI components.
* **DB Admin**: Evaluated against **6 planned PRs/tasks** covering database schema, migrations, seed data, and audit logs.
* **Tester (QA)**: Evaluated against **6 planned PRs/tasks** covering test plan creation, permission matrix testing, edge-case validation, and test reports. Must submit documented test matrices or contribute inline reviews and sign-offs on functional PRs.
* **UI/UX Designer**: Evaluated against **5 planned PRs/tasks** covering wireframes, design specifications, layout templates, and styling assets.
* **Scrum Master**: Evaluated against **5 planned PRs/tasks** covering repository governance, board setups, and working agreements.
