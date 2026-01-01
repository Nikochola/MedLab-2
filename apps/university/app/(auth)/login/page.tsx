"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Activity, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/ui/Logo"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    // Simulate login (since it's free, just validate username exists)
    setTimeout(() => {
      login(username.trim(), "")
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="mb-6 flex justify-center">
            <Logo variant="black" width={150} height={50} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mt-4">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter your name to continue learning
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Free access - no payment required. Just enter your name to begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Your Name</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !username.trim()}
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to use this educational tool responsibly.
        </p>
      </div>
    </div>
  )
}

