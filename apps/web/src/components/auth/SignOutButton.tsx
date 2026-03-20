"use client"

import { useRouter } from "next/navigation"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const { logout } = useAuth()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await logout()
      }}
    >
      Sign out
    </Button>
  )
}
