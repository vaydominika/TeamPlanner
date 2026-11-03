import { useEffect, useMemo, useState } from "react"
import { AuthForm } from "@/components/AuthForm"
import { CalendarDialog } from "@/components/CalendarDialog"
import { ProjectDialog, type ProjectDraft } from "@/components/ProjectDialog"
import { ProjectList } from "@/components/ProjectList"
import { TaskDialog, type TaskDialogMode, type TaskDraft } from "@/components/TaskDialog"
import { TaskList } from "@/components/TaskList"
import { TeamMembersDialog } from "@/components/TeamMembersDialog"
import { Button } from "@/components/ui/button"
import {
  ApiError,
  createProject,
  createTask,
  createTeam,
  deleteProject,
  deleteTask,
  getSession,
  login,
  logout,
  register,
  updateProject,
  updateTask,
  updateTeamMembers,
} from "@/lib/api"
import { canCreateProject, canManageProject, canManageTask, canUpdateAssignedTaskStatus } from "@/lib/permissions"
import type { Project, ProjectTask, SessionData } from "@/types"

function formatToday() {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Váratlan hiba történt."
}

export default function App() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskDialogMode, setTaskDialogMode] = useState<TaskDialogMode>("create")
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const [calendarNotice, setCalendarNotice] = useState("")
  useEffect(() => {
    const url = new URL(window.location.href)
    const outcome = url.searchParams.get("calendar")
    if (!outcome) return
    url.searchParams.delete("calendar")
    window.history.replaceState(null, "", url.toString())
    setCalendarNotice(outcome === "connected" ? "A Google Naptár csatlakoztatva." : "A naptárcsatlakozás nem sikerült. Próbáld újra a Naptárkapcsolat ablakban.")
  }, [])

  function applySession(nextSession: SessionData, preferredProjectId?: number | null) {
    setSession(nextSession)
    setSelectedProjectId(nextSession.projects.some((project) => project.id === preferredProjectId)
      ? preferredProjectId!
      : nextSession.projects[0]?.id ?? null)
  }

  async function loadSession(preferredProjectId = selectedProjectId) {
    setErrorMessage("")
    applySession(await getSession(), preferredProjectId)
  }

  useEffect(() => {
    let active = true
    getSession()
      .then((nextSession) => {
        if (active) applySession(nextSession)
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof ApiError && error.status === 401)) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const currentUser = session?.currentUser ?? null
  const selectedProject = session?.projects.find((project) => project.id === selectedProjectId) ?? null
  const selectedTeam = session?.teams.find((team) => team.id === selectedProject?.teamId) ?? null
  const creationTeam = selectedTeam?.leaderId === currentUser?.id
    ? selectedTeam
    : session?.teams.find((team) => team.leaderId === currentUser?.id) ?? null
  const canCreateProjects = currentUser !== null && canCreateProject(currentUser)
  const selectedTasks = session?.tasks.filter((task) => task.projectId === selectedProjectId) ?? []
  const managesSelectedProject = currentUser && selectedProject ? canManageProject(currentUser, selectedProject) : false
  const taskAssignees = useMemo(() => {
    if (!session || !selectedProject) return []
    return session.users.filter((user) => selectedProject.memberIds.includes(user.id))
  }, [selectedProject, session])

  function closeEditors() {
    setCalendarDialogOpen(false)
    setMembersDialogOpen(false)
    setProjectDialogOpen(false)
    setTaskDialogOpen(false)
    setEditingProject(null)
    setEditingTask(null)
  }

  function handleRequestError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      closeEditors()
      setSession(null)
      setSelectedProjectId(null)
    }
    setErrorMessage(getErrorMessage(error))
  }

  async function authenticate(action: () => Promise<unknown>) {
    try {
      setIsAuthSubmitting(true)
      setErrorMessage("")
      await action()
      await loadSession(null)
    } catch (error) {
      handleRequestError(error)
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      closeEditors()
      setSession(null)
      setSelectedProjectId(null)
    }
  }

  async function runMutation(action: () => Promise<unknown>, projectId = selectedProjectId) {
    try {
      setErrorMessage("")
      await action()
      await loadSession(projectId)
    } catch (error) {
      handleRequestError(error)
    }
  }

  function openCreateProject() {
    if (!currentUser || !canCreateProjects) return
    setEditingProject(null)
    setProjectDialogOpen(true)
  }

  function openManageProject() {
    if (!currentUser || !selectedProject || !canManageProject(currentUser, selectedProject)) return
    setEditingProject(selectedProject)
    setProjectDialogOpen(true)
  }

  function openManageMembers() {
    if (!currentUser || !selectedTeam || selectedTeam.leaderId !== currentUser.id) return
    setMembersDialogOpen(true)
  }

  async function saveProject(draft: ProjectDraft) {
    if (!currentUser) return
    if (editingProject) {
      if (!canManageProject(currentUser, editingProject)) return
      await runMutation(() => updateProject(editingProject.id, draft), editingProject.id)
    } else {
      if (!canCreateProjects) return
      try {
        setErrorMessage("")
        // Keep the existing team-backed permissions without a separate team setup step.
        const team = creationTeam ?? await createTeam({ name: "Saját csapat", description: "A saját projektek résztvevői." })
        const project = await createProject(team.id, draft)
        await loadSession(project.id)
      } catch (error) {
        await loadSession().catch(() => undefined)
        handleRequestError(error)
      }
    }
  }

  async function removeProject() {
    if (!currentUser || !selectedProject || !canManageProject(currentUser, selectedProject)) return
    await runMutation(() => deleteProject(selectedProject.id), null)
  }

  function openCreateTask() {
    if (!currentUser || !selectedProject || !canManageProject(currentUser, selectedProject)) return
    setEditingTask(null)
    setTaskDialogMode("create")
    setTaskDialogOpen(true)
  }

  function openEditTask(task: ProjectTask) {
    if (!currentUser || !selectedProject) return
    if (canManageTask(currentUser, selectedProject, task)) setTaskDialogMode("manage")
    else if (canUpdateAssignedTaskStatus(currentUser, selectedProject, task)) setTaskDialogMode("status")
    else return
    setEditingTask(task)
    setTaskDialogOpen(true)
  }

  async function saveTask(draft: TaskDraft) {
    if (!currentUser || !selectedProject) return
    if (!editingTask) {
      if (!canManageProject(currentUser, selectedProject)) return
      await runMutation(() => createTask(selectedProject.id, draft))
    } else if (taskDialogMode === "status") {
      if (!canUpdateAssignedTaskStatus(currentUser, selectedProject, editingTask)) return
      await runMutation(() => updateTask(editingTask.id, { status: draft.status }))
    } else if (canManageTask(currentUser, selectedProject, editingTask)) {
      await runMutation(() => updateTask(editingTask.id, draft))
    }
  }

  async function removeTask() {
    if (!currentUser || !selectedProject || !editingTask || !canManageTask(currentUser, selectedProject, editingTask)) return
    await runMutation(() => deleteTask(editingTask.id))
  }

  async function saveMembers(memberIds: string[]) {
    if (!currentUser || !selectedTeam || selectedTeam.leaderId !== currentUser.id) return
    await runMutation(() => updateTeamMembers(selectedTeam.id, memberIds))
  }

  if (isLoading) return <p className="py-16 text-center text-sm font-semibold text-muted-foreground">Adatok betöltése…</p>

  if (!session || !currentUser) {
    return (
      <AuthForm
        errorMessage={errorMessage}
        isSubmitting={isAuthSubmitting}
        onLogin={(email, password) => authenticate(() => login(email, password))}
        onRegister={(name, email, password) => authenticate(() => register(name, email, password))}
      />
    )
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <nav className="flex flex-col gap-4 rounded-2xl border border-border bg-white/90 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-extrabold tracking-[-0.03em]">TeamPlanner</p>
            <p className="mt-1 text-sm font-medium capitalize text-muted-foreground">{formatToday()}</p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="text-right">
              <p className="text-sm font-bold">{currentUser.name}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {managesSelectedProject ? "Projektvezető" : "Csapattag"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>Kijelentkezés</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setCalendarDialogOpen(true)}>Naptárkapcsolat</Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 sm:pt-9">
        {calendarNotice && <p role="status" className="mb-5 rounded-xl border border-border bg-white/85 px-4 py-3 text-sm">{calendarNotice}</p>}
        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-[#e7b9c6] bg-[#fff4f7] px-4 py-3 text-sm font-semibold text-[#70434f]">{errorMessage}</div>}

        <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ProjectList
            projects={session.projects}
            tasks={session.tasks}
            selectedProjectId={selectedProjectId}
            canCreate={canCreateProjects}
            onSelect={(projectId) => { closeEditors(); setSelectedProjectId(projectId) }}
            onCreate={openCreateProject}
          />
          {selectedProject ? (
            <TaskList
              project={selectedProject}
              tasks={selectedTasks}
              workloadEntries={session.workloadEntries}
              currentUser={currentUser}
              canManageProject={managesSelectedProject}
              onCreate={openCreateTask}
              onEdit={openEditTask}
              onManageProject={openManageProject}
              onManageMembers={selectedTeam?.leaderId === currentUser.id ? openManageMembers : undefined}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-white/85 px-6 py-12 text-center">
              <p className="font-bold">Még nincs megjeleníthető projekted.</p>
              {canCreateProjects && <Button type="button" className="mt-5" onClick={openCreateProject}>Első projekt létrehozása</Button>}
            </div>
          )}
        </div>
      </main>

      <CalendarDialog key={currentUser.id} open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen} />
      <ProjectDialog open={projectDialogOpen} project={editingProject} onOpenChange={setProjectDialogOpen} onSubmit={saveProject} onDelete={editingProject ? removeProject : undefined} />

      {selectedTeam && (
        <TeamMembersDialog open={membersDialogOpen} team={selectedTeam} users={session.users} onOpenChange={setMembersDialogOpen} onSave={saveMembers} />
      )}
      {selectedProject && (
        <TaskDialog
          open={taskDialogOpen}
          project={selectedProject}
          projects={session.projects}
          workloadEntries={session.workloadEntries}
          task={editingTask}
          mode={taskDialogMode}
          assignees={taskAssignees}
          visibleProjectIds={session.projects.map((project) => project.id)}
          onOpenChange={setTaskDialogOpen}
          onSubmit={saveTask}
          onDelete={taskDialogMode === "manage" ? removeTask : undefined}
        />
      )}
    </div>
  )
}
