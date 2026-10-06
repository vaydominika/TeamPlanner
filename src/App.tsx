import { useEffect, useMemo, useState } from "react"
import { AuthForm } from "@/components/AuthForm"
import { ProjectDialog, type ProjectDraft } from "@/components/ProjectDialog"
import { ProjectList } from "@/components/ProjectList"
import { TaskDialog, type TaskDialogMode, type TaskDraft } from "@/components/TaskDialog"
import { TaskList } from "@/components/TaskList"
import { TeamDialog, type TeamDraft } from "@/components/TeamDialog"
import { TeamMembersDialog } from "@/components/TeamMembersDialog"
import { TeamSwitcher } from "@/components/TeamSwitcher"
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
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskDialogMode, setTaskDialogMode] = useState<TaskDialogMode>("create")
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)

  function applySession(nextSession: SessionData, preferredTeamId?: number | null, preferredProjectId?: number | null) {
    setSession(nextSession)
    const teamId = nextSession.teams.some((team) => team.id === preferredTeamId)
      ? preferredTeamId!
      : nextSession.teams[0]?.id ?? null
    setSelectedTeamId(teamId)
    const teamProjects = nextSession.projects.filter((project) => project.teamId === teamId)
    setSelectedProjectId(teamProjects.some((project) => project.id === preferredProjectId)
      ? preferredProjectId!
      : teamProjects[0]?.id ?? null)
  }

  async function loadSession(preferredTeamId = selectedTeamId, preferredProjectId = selectedProjectId) {
    setErrorMessage("")
    applySession(await getSession(), preferredTeamId, preferredProjectId)
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
  const selectedTeam = session?.teams.find((team) => team.id === selectedTeamId) ?? null
  const teamProjects = session?.projects.filter((project) => project.teamId === selectedTeamId) ?? []
  const selectedProject = teamProjects.find((project) => project.id === selectedProjectId) ?? null
  const selectedTasks = session?.tasks.filter((task) => task.projectId === selectedProjectId) ?? []
  const managesSelectedProject = currentUser && selectedProject ? canManageProject(currentUser, selectedProject) : false
  const taskAssignees = useMemo(() => {
    if (!session || !selectedTeam) return []
    return session.users.filter((user) => selectedTeam.memberIds.includes(user.id))
  }, [selectedTeam, session])

  function closeEditors() {
    setTeamDialogOpen(false)
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
      setSelectedTeamId(null)
      setSelectedProjectId(null)
    }
    setErrorMessage(getErrorMessage(error))
  }

  async function authenticate(action: () => Promise<unknown>) {
    try {
      setIsAuthSubmitting(true)
      setErrorMessage("")
      await action()
      await loadSession(null, null)
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
      setSelectedTeamId(null)
      setSelectedProjectId(null)
    }
  }

  async function runMutation(action: () => Promise<unknown>, teamId = selectedTeamId, projectId = selectedProjectId) {
    try {
      setErrorMessage("")
      await action()
      await loadSession(teamId, projectId)
    } catch (error) {
      handleRequestError(error)
    }
  }

  function selectTeam(teamId: number) {
    setSelectedTeamId(teamId)
    setSelectedProjectId(session?.projects.find((project) => project.teamId === teamId)?.id ?? null)
  }

  async function saveTeam(draft: TeamDraft) {
    try {
      setErrorMessage("")
      const team = await createTeam(draft)
      await loadSession(team.id, null)
    } catch (error) {
      handleRequestError(error)
    }
  }

  function openCreateProject() {
    if (!currentUser || !selectedTeam || !canCreateProject(currentUser, selectedTeam)) return
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
    if (!currentUser || !selectedTeam || !canCreateProject(currentUser, selectedTeam)) return
    if (editingProject) {
      if (!canManageProject(currentUser, editingProject)) return
      await runMutation(() => updateProject(editingProject.id, draft), selectedTeam.id, editingProject.id)
    } else {
      try {
        setErrorMessage("")
        const project = await createProject(selectedTeam.id, draft)
        await loadSession(selectedTeam.id, project.id)
      } catch (error) {
        handleRequestError(error)
      }
    }
  }

  async function removeProject() {
    if (!currentUser || !selectedProject || !canManageProject(currentUser, selectedProject)) return
    await runMutation(() => deleteProject(selectedProject.id), selectedTeamId, null)
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
    await runMutation(() => updateTeamMembers(selectedTeam.id, memberIds), selectedTeam.id, selectedProjectId)
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
                {selectedTeam?.leaderId === currentUser.id ? "Csapatvezető" : "Tag"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>Kijelentkezés</Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 sm:pt-9">
        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-[#e7b9c6] bg-[#fff4f7] px-4 py-3 text-sm font-semibold text-[#70434f]">{errorMessage}</div>}

        {session.teams.length === 0 || !selectedTeam ? (
          <div className="rounded-2xl border border-border bg-white/85 px-6 py-12 text-center">
            <p className="font-bold">Még nincs csapatod.</p>
            <Button type="button" className="mt-5" onClick={() => setTeamDialogOpen(true)}>Első csapat létrehozása</Button>
          </div>
        ) : (
          <>
            <TeamSwitcher
              teams={session.teams}
              value={selectedTeam.id}
              canManage={selectedTeam.leaderId === currentUser.id}
              onValueChange={selectTeam}
              onCreate={() => setTeamDialogOpen(true)}
              onManageMembers={openManageMembers}
            />
            <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
              <ProjectList
                projects={teamProjects}
                tasks={session.tasks}
                selectedProjectId={selectedProjectId}
                canCreate={canCreateProject(currentUser, selectedTeam)}
                onSelect={setSelectedProjectId}
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
                />
              ) : (
                <div className="rounded-2xl border border-border bg-white/85 px-6 py-12 text-center">
                  <p className="font-bold">Ebben a csapatban még nincs projekt.</p>
                  {selectedTeam.leaderId === currentUser.id && <Button type="button" className="mt-5" onClick={openCreateProject}>Első projekt létrehozása</Button>}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <TeamDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} onSubmit={saveTeam} />
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
