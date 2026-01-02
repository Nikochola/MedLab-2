"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Classroom } from "@/lib/types"
import { Copy, Check, Users } from "lucide-react"

interface ClassroomManagerProps {
  teacherName?: string
  classrooms: Classroom[]
}

export function ClassroomManager({ teacherName, classrooms }: ClassroomManagerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classrooms</h2>
          <p className="text-muted-foreground">
            Classrooms are provisioned by your admin. Share codes with students to join.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.filter((c) => c.isActive).map((classroom) => (
          <Card key={classroom.id}>
            <CardHeader>
              <CardTitle className="text-lg">{classroom.name}</CardTitle>
              <CardDescription>Created {new Date(classroom.createdAt).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Classroom Code</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={classroom.code}
                    readOnly
                    className="font-mono font-bold text-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyCode(classroom.code)}
                  >
                    {copiedCode === classroom.code ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this code with your students
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Students: —</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classrooms.filter((c) => c.isActive).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No classrooms yet. Your admin will provision classrooms for you.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
