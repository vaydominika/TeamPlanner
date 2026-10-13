import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserLabel(user: User, users: User[]) {
  const matches = users.filter((item) => item.name === user.name)
  return matches.length > 1 ? `${user.name} (${matches.findIndex((item) => item.id === user.id) + 1}.)` : user.name
}
