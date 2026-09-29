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

Documentation:\
Create a Markdown documentation file inside the `docs` folder describing the MVP.

For example:\
`docs/mvp.md`

The documentation must be written in Hungarian and briefly describe:

- az alkalmazás célját,
- a jelenlegi MVP funkcióit,
- a fő felületi elemeket,
- a használt technológiákat,
- és azt, hogy ez jelenleg csak frontend prototípus.

Also create or update a small `README.md` in the project root.

The README should also be written in Hungarian and only contain a short introduction, the technologies used, how to start the project locally, and a reference to the more detailed documentation inside `docs/mvp.md`.

Keep the README concise.

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

Update the existing documentation in `docs` as well. Add a short Hungarian section describing:

- terhelés felismerése,
- határidőütközések,
- a túlterheltségi figyelmeztetés szabálya,
- és azt, hogy más projekthez tartozó feladat csak megtekinthető, nem módosítható.

Do not add unrelated features, analytics, charts, notifications, AI functionality, or complex scheduling logic. Keep this as a simple frontend MVP extension.
