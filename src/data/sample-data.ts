import type { Project, ProjectTask } from "@/types"

export const initialProjects: Project[] = [
  {
    id: 1,
    name: "Őszi műhelynap",
    description: "A csapat októberi közös napjának előkészítése.",
  },
  {
    id: 2,
    name: "Honlap frissítés",
    description: "Szövegek és képek rendezése az új bemutatkozó oldalhoz.",
  },
  {
    id: 3,
    name: "Ügyfélkézikönyv",
    description: "Rövid, érthető útmutató az új ügyfeleknek.",
  },
]

export const initialTasks: ProjectTask[] = [
  {
    id: 1,
    projectId: 1,
    name: "Helyszín véglegesítése",
    description: "Visszajelzés kérése a tárgyaló foglalásáról.",
    assignee: "Nóra",
    deadline: "2026-09-18",
    status: "Folyamatban",
  },
  {
    id: 2,
    projectId: 1,
    name: "Ebédigények összegyűjtése",
    description: "Kérdezzük meg a csapatot az ételérzékenységekről.",
    assignee: "Márk",
    deadline: "2026-09-21",
    status: "Teendő",
  },
  {
    id: 3,
    projectId: 1,
    name: "Napirend első változata",
    description: "A közös témák és a szünetek időrendjének összeállítása.",
    assignee: "Eszter",
    deadline: "2026-09-16",
    status: "Kész",
  },
  {
    id: 4,
    projectId: 2,
    name: "Bemutatkozó szöveg átnézése",
    description: "Rövidítsük és tegyük közvetlenebbé a nyitó szöveget.",
    assignee: "Eszter",
    deadline: "2026-09-24",
    status: "Folyamatban",
  },
  {
    id: 5,
    projectId: 2,
    name: "Csapatfotók kiválasztása",
    description: "Három egységes hangulatú kép kiválasztása.",
    assignee: "Nóra",
    deadline: "2026-09-25",
    status: "Teendő",
  },
  {
    id: 6,
    projectId: 3,
    name: "Tartalomjegyzék összeállítása",
    description: "A kézikönyv rövid fejezeteinek sorrendbe rendezése.",
    assignee: "Márk",
    deadline: "2026-09-29",
    status: "Teendő",
  },
  {
    id: 7,
    projectId: 3,
    name: "Borítóvázlat véleményezése",
    description: "A két borítóváltozat rövid átnézése és visszajelzése.",
    assignee: "Nóra",
    deadline: "2026-09-23",
    status: "Folyamatban",
  },
]
