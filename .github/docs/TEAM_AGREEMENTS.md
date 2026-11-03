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
- **Scrum Master**: Minimum **5 PRs** across repository governance and board configuration.
- **Database Administrator**: Minimum **6 PRs** across schema, migration, and seed tasks.
- **Developer**: Minimum **8 PRs** across core scaffolding, API, and feature implementations.
- **Tester / UI/UX**: Delivered through assigned documentation, design spec, and test execution PRs.

### Grading & Assessment Criteria
- Deliverables are evaluated based on **PR quality**, adherence to the **Definition of Done**, accurate issue linking, and overall contribution consistency throughout the sprint.