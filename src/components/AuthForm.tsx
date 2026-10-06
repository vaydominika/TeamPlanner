import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "register"

type AuthFormProps = {
  errorMessage: string
  isSubmitting: boolean
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (name: string, email: string, password: string) => Promise<void>
}

export function AuthForm({ errorMessage, isSubmitting, onLogin, onRegister }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword("")
  }

  function fillDemoAccount(account: "nora" | "eszter") {
    setMode("login")
    setEmail(`${account}@teamplanner.hu`)
    setPassword("demo1234")
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === "login") {
      await onLogin(email.trim(), password)
    } else {
      await onRegister(name.trim(), email.trim(), password)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md items-center px-4 py-10 sm:px-6">
      <div className="w-full">
        <p className="mb-5 text-center text-2xl font-extrabold tracking-[-0.03em]">TeamPlanner</p>
        <Card className="bg-white/90">
          <CardContent className="p-5 sm:p-7">
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                className={cn("rounded-lg px-3 py-2 text-sm font-bold", mode === "login" && "bg-white")}
                onClick={() => selectMode("login")}
              >
                Bejelentkezés
              </button>
              <button
                type="button"
                className={cn("rounded-lg px-3 py-2 text-sm font-bold", mode === "register" && "bg-white")}
                onClick={() => selectMode("register")}
              >
                Regisztráció
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Név</Label>
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Például: Kiss Anna"
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="auth-email">E-mail-cím</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="anna@pelda.hu"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Jelszó</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Legalább 8 karakter"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-xl border border-[#e7b9c6] bg-[#fff4f7] px-4 py-3 text-sm font-semibold text-[#70434f]">
                  {errorMessage}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Folyamatban…" : mode === "login" ? "Bejelentkezés" : "Fiók létrehozása"}
              </Button>
            </form>

            {mode === "login" && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">Bemutató fiók kitöltése</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fillDemoAccount("nora")}>
                    Nóra · Csapattag
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fillDemoAccount("eszter")}>
                    Eszter · Vezető
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
