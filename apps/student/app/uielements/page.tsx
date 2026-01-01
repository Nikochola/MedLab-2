"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, BookOpen, Stethoscope, ArrowRight } from "lucide-react"
import { Logo } from "@/components/ui/Logo"

export default function LandingPage() {
  const router = useRouter()
  
  return (
    <div className="p-4 space-y-4 flex flex-col max-w-[200px]">
        <Button variant="default">
            Hello
     </Button>
     <Button variant="tritary">
            Hello
     </Button>
     <Button variant="bug">
            Hello
     </Button>
    </div>
  )
}