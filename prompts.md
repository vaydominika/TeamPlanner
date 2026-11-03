# Prompt

Create a simple React MVP interface for a small team project and task management application.

The application itself must be in Hungarian, including all visible UI text, labels, buttons, form fields, placeholder texts, project names, task examples, statuses, and descriptions. However, keep file names, folder names, component names, variable names, and code identifiers in English.

For now, this is only a frontend/display prototype. Do not implement a backend, database, authentication, API integration, persistence, or complex business logic.

Use the existing React project and use shadcn/ui components wherever appropriate.

Do not use icons. Keep the interface simple, clean, cozy, cute, and friendly, but still suitable for a productivity application. Use soft colors, rounded cards, comfortable spacing, subtle borders, and a pleasant visual hierarchy.

Avoid the typical overly polished or obviously AI-generated dashboard style. Do not add unnecessary gradients, huge hero sections, marketing text, statistics, charts, AI assistants, AI suggestions, decorative badges everywhere, or artificial section titles such as "Boost your productivity", "Your productivity hub", "Smart workspace", etc.

The UI should feel like a small, realistic application someone could actually continue developing.

The MVP should focus only on these features and their visual representation:

- Project creation
- Task creation
- Project list
- Task list
- Task assignments
- Task deadlines

Create a simple main page where the user can see their projects and tasks.

Include at least:

- A section displaying existing projects
- A simple form or dialog for creating a new project
- A task list connected visually to a selected project
- A simple form or dialog for creating a new task
- Task name
- Short task description
- Assigned team member
- Deadline
- Simple task status, for example: "Teendő", "Folyamatban", "Kész"

Use realistic Hungarian example data instead of generic English placeholder content.

Keep the amount of content small. This is an MVP, so do not add additional features such as comments, notifications, chat, analytics, calendar views, settings, authentication, permissions, file uploads, or AI features.

Keep the component structure reasonably clean and reusable, but do not overengineer the application.

Before implementing, inspect the existing project structure and dependencies so the solution fits naturally into the current codebase instead of replacing or restructuring unnecessary parts.

## Workload and deadline conflict detection

Extend the existing MVP with **workload and deadline conflict detection**.

Keep the current visual style and existing structure. Do not redesign the application or introduce unrelated features. Stay consistent with the existing cozy, simple UI and continue using shadcn/ui components. Do not add icons.

Add visual support for detecting when a team member is overloaded or when assigned tasks create a deadline conflict.

Critical rules:

- If a team member is already overloaded before the deadline of a newly assigned task, the user must see a clear warning before the task is created or assigned.
- Tasks that belong to another project must not be editable from the current project.

For the MVP, the overload detection can use simple mocked frontend logic and existing/mock task data. No backend or database is needed.

Add the following behavior:

- When creating or editing a task, check the selected assignee's workload around the selected deadline.
- If the assignee already has too many overlapping tasks or deadlines in that period, display a visible warning.
- The warning should explain in Hungarian that the selected team member may be overloaded before the chosen deadline.
- The warning should not unnecessarily block the entire UI; it should appear close to the assignment/deadline fields.
- Existing task lists should make workload or deadline conflicts easy to notice without adding excessive visual noise.
- If a task displayed in the current view belongs to another project, it may be shown for workload/conflict context, but it must be read-only.
- Do not allow editing, reassignment, status changes, or deletion of tasks from another project.
- Make the read-only state visually understandable with subtle styling or explanatory text, but do not use icons.

Keep all visible application text in Hungarian. Keep file names, component names, variable names, interfaces, and other code identifiers in English.

Do not add unrelated features, analytics, charts, notifications, AI functionality, or complex scheduling logic. Keep this as a simple frontend MVP extension.

## User roles and role-based permissions

Extend the existing MVP by adding **user roles and role-based permissions**.

The application should support two roles:

- **Csapattag (Team Member)**
- **Projektvezető (Project Manager)**

Keep the current implementation, structure, and cozy visual style. Continue using shadcn/ui components. Do not redesign existing pages, add unnecessary UI elements, or introduce icons.

### Roles and permissions

**Team Member (Csapattag):**

- Can view projects they belong to.
- Can view tasks within their projects.
- Can see task assignments, deadlines, statuses, and workload warnings.
- Can update the status of tasks assigned to them.
- Cannot create or delete projects.
- Cannot create, delete, or reassign tasks.
- Cannot modify tasks belonging to other projects.

**Project Manager (Projektvezető):**

- Can create and manage their own projects.
- Can create, edit, assign, and delete tasks within projects they manage.
- Can assign tasks to team members.
- Can view team members' workloads and deadline conflicts.
- Can manage project members.
- Cannot modify projects or tasks managed by another project manager.

### Implementation

- Use simple mocked users and roles for now. No authentication or backend is needed.
- Add a simple way to switch between the two roles to demonstrate their permissions.
- Keep permissions **project-specific**, rather than assuming a project manager can manage every project.
- Show or disable actions depending on the current user's role and project membership.
- Ensure permission checks are also applied in the frontend logic, not just through hidden buttons.
- Keep the existing workload and deadline conflict detection working.
- Preserve the existing rule: tasks from other projects must not be modified without the required permissions.
- Use realistic Hungarian mock data.

### UI requirements

- Keep everything minimal and consistent with the existing design.
- Clearly distinguish between available and restricted actions.
- Avoid unnecessary badges, explanations, dashboards, or additional sections.
- Do not introduce icons.
- All visible UI text must remain in Hungarian.
- Keep code identifiers, component names, file names, and folder names in English.

**Important:** This is still a frontend-only MVP. Do not implement authentication, a database, API endpoints, or complex authorization infrastructure. Keep the changes minimal, reuse existing components and logic wherever possible, and avoid unrelated refactoring.

## External calendar integration and LLM-based task summarization

Extend the existing full-stack application with two new capabilities:

1. **External calendar integration**
2. **LLM-based task summarization**

The application already has a backend and a database, so implement these features properly across the frontend, backend, and persistence layers where needed. Reuse the existing architecture, patterns, components, services, DTOs, validation, error handling, and styling conventions. Do not introduce unnecessary restructuring or unrelated refactors.

Keep the current cozy, simple visual style and continue using the existing UI component library. Avoid overly “AI-looking” UI, unnecessary gradients, chatbot-style interfaces, excessive badges, or decorative AI branding.

All visible UI text must remain in Hungarian. Keep file names, component names, variable names, API names, DTO names, database fields, and other code identifiers in English.

### External calendar integration

Add support for synchronizing relevant task deadlines with an external calendar provider.

The goal is to let users connect a calendar and export or synchronize tasks that have deadlines.

Requirements:

- Add a calendar integration layer in the backend instead of coupling the application directly to one provider throughout the codebase.
- Start with one supported external calendar provider, but structure the integration so another provider could be added later.
- Store only the integration data that is actually necessary.
- Keep access tokens, refresh tokens, client secrets, and similar credentials secure and never expose them to the frontend.
- Use environment variables or the project's existing secret/configuration mechanism for provider credentials.
- Allow the user to connect and disconnect their calendar account.
- Show the current connection state in the UI.
- Tasks with deadlines should be synchronizable as calendar events.
- At minimum, synchronize:
  - task title,
  - task description,
  - deadline,
  - project name.
- Avoid creating duplicate calendar events for the same task.
- Store the external event identifier so an already synchronized event can be updated instead of recreated.
- When a synchronized task deadline or relevant task data changes, update the corresponding calendar event.
- If a synchronized task is deleted, handle its calendar event appropriately.
- External calendar failures must not corrupt or block normal task management.
- Display clear Hungarian error or success feedback when synchronization fails or succeeds.

Do not sync tasks from projects the current user is not allowed to access.

Respect the existing role and project permission rules.

### LLM-based task summarization

Add an LLM-powered feature that creates a short summary of task information.

The purpose is not to add a chatbot. It should be a small, focused productivity feature integrated into the existing task UI.

Add an action such as:

**„Összefoglaló készítése”**

The LLM may use relevant task information such as:

- task title,
- description,
- deadline,
- status,
- assigned team member,
- project context.

The generated result should be concise and useful, for example:

- what needs to be done,
- the most important context,
- the deadline or urgency if relevant.

Do not generate unnecessarily long text.

The request to the LLM must go through the backend. Never expose the LLM API key or call the provider directly from the frontend.

Create a dedicated backend service for the LLM integration so the rest of the application is not tightly coupled to a specific provider.

Use environment variables or the existing configuration system for the API key and model configuration.

Handle:
- API failures,
- missing configuration,
- timeouts,
- empty or invalid responses,
- tasks with very little information.

The feature must degrade gracefully. If the LLM service is unavailable, users must still be able to use the task normally.

Do not automatically send data to the LLM in the background. Generate a summary only after an explicit user action.

Do not send unrelated project or user information. Only include the minimum task context necessary for the summary.

### Persistence

Decide based on the existing architecture whether generated summaries should be:
- generated on demand only, or
- optionally stored in the database.

Prefer the simplest solution that fits the current application.

If summaries are persisted, store metadata needed to determine when a summary may be outdated after the task changes.

For calendar synchronization, persist the mapping between the internal task and its external calendar event where necessary.

Create database migrations using the project's existing migration approach.

### API and backend

Add clear endpoints for the new functionality, following the existing API conventions.

Examples of responsibilities may include:

- connect calendar,
- disconnect calendar,
- check calendar integration status,
- synchronize a task,
- generate a task summary.

Do not blindly use these exact route names if the project already follows a different naming convention.

Validate authorization server-side. Do not rely only on disabled or hidden frontend controls.

### Frontend

Integrate the new functionality into the existing UI without creating a completely new dashboard.

For calendar functionality, use a small settings/integration area or another existing suitable location.

For task summaries, place the action and generated result close to the task details.

Keep the UI lightweight.

Do not add icons unless the existing design now consistently uses them.

Do not turn the summary feature into a chat interface.

Before implementing anything, inspect the existing frontend, backend, database schema, authentication/authorization logic, and documentation. Follow the current project's architecture instead of introducing a separate parallel structure.

## Simplify navigation, refine permissions, and complete task planning

Refine the existing full-stack TeamPlanner application. Team members must be able to create their own projects, and task editing must use an icon as specified below.

Inspect the current implementation before making changes. Preserve the existing React and TypeScript frontend, Express backend, Prisma ORM, SQLite database, reusable UI components, and cozy visual style. Keep the scope focused and avoid unrelated restructuring. All visible application text must remain in Hungarian; keep code identifiers and file names in English.

### Registration and user identity

Allow multiple users to register with the same display name. The registration field labeled „Név” must not be unique; email addresses must remain unique. Update the database schema, registration validation, and error messages accordingly.

Use stable user identifiers for assignments, permissions, and workload calculations so users with identical names remain separate. Preserve existing assignments when migrating the database, and make duplicate names distinguishable in member and assignee selection lists.

Remove the „Bemutató fiók kitöltése” section and its demo-account autofill buttons from the sign-in form.

### Project navigation and project-specific permissions

Remove the separate „Aktív csapat” dropdown and the extra team-selection step. The existing sidebar project list must display every project the current user is allowed to access, including projects associated with different teams. Users should switch projects directly from that list.

Keep task lists, assignment options, role labels, and available actions consistent with the selected project. Preserve member management in a suitable location near the selected project's controls. Existing team records may remain as an internal implementation detail; users should not need to create or select a separate team before creating a project.

Every authenticated user must be able to create a project of their own, even if they are only a team member in another project. The creator becomes the project manager of the new project. This must not grant them additional permissions in projects owned by somebody else.

Project managers may create, edit, assign, and delete tasks in projects they manage. Team members may view accessible projects and update the status of tasks assigned to them. Enforce these restrictions in frontend logic and server-side authorization.

Tasks from another project may appear as read-only workload context, but they must not be edited, reassigned, deleted, or have their status changed from the current project's context. A user who also manages that other project may switch to it and manage its tasks there. Do not reveal inaccessible project names or task titles.

### Deadlines, estimated working hours, and workload warnings

Support the complete planning workflow: create a project, add tasks, assign team members, specify deadlines and estimated working hours, and check workload before saving an assignment.

Add an editable „Becsült munkaóra” field to task creation and editing, display the estimate in the task list, validate it on the backend, and persist it in SQLite using the existing migration approach. Preserve existing tasks and give them a default estimate that managers can revise.

Continue warning when a selected member already has overlapping unfinished tasks around the new task's deadline. Keep the warning close to the assignment and deadline inputs and show it before the task is saved. Include the estimated-hour total for the relevant tasks without double-counting the task being edited. Keep the existing simple workload rule clear; do not present the calculation as AI-based scheduling or claim an hourly capacity threshold unless one is actually implemented.

### Task actions and interface cleanup

Replace the task's text-based editing button with a small pencil icon placed next to the task name, where the editing action is easier to discover. Preserve the existing edit or status-update behavior and permission checks. Provide Hungarian hover text and an accessible label. This is a specific exception to the earlier instruction to avoid icons; do not add unrelated decorative icons.

Remove this sentence from the task interface:

> Az összefoglalás elküldi ennek a feladatnak az adatait a szöveges szolgáltatásnak.

### Google Calendar and Gemini summaries

Preserve the Google Calendar connection and task synchronization, including secure backend authentication, connection state, event updates, duplicate prevention, deletion handling, and project-access checks.

Use a Gemini model with an available free API tier for concise, on-demand Hungarian task summaries. The latest requested model configuration is:

```env
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-3.5-flash-lite
```

Read `GEMINI_API_KEY` only on the backend and never expose real credentials in source control or output. Allow changing supported Gemini models through environment configuration. Do not automatically enable paid billing or switch to another provider.

Generate a summary only after the user selects „Összefoglaló készítése”. Send only the necessary task title, description, deadline, status, assignee display name, and project name. Request a short Hungarian summary of the required work, relevant context, and deadline. Do not introduce a chatbot, background AI requests, or direct database access for the model.

Handle missing configuration, unavailable models, intermittent provider failures such as HTTP 503, quota errors, timeouts, and invalid responses with useful Hungarian feedback. Task management must remain usable when summarization or calendar synchronization is unavailable.

### Verification

Run checks appropriate to the changes. Verify that same-name users retain separate permissions and workloads, members can create their own projects without gaining access to others' projects, project switching uses the correct task and assignee context, estimated hours persist correctly, and external-service failures do not break normal task management.
