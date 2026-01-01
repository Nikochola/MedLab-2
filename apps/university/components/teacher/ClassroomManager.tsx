"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Classroom } from "@/lib/types"
import { saveClassroom, generateClassroomCode } from "@/lib/storage"
import { Copy, Check, Trash2, Users } from "lucide-react"

interface ClassroomManagerProps {
  teacherId: string
  teacherName?: string
  classrooms: Classroom[]
  onClassroomUpdate: () => Promise<void> | void
}

export function ClassroomManager({ teacherId, teacherName, classrooms, onClassroomUpdate }: ClassroomManagerProps) {
  const [newClassName, setNewClassName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCreateClassroom = async () => {
    if (!newClassName.trim()) return

    const code = await generateClassroomCode()

    try {
      await saveClassroom({
        name: newClassName.trim(),
        teacherId,
        code,
      })
      setNewClassName("")
      setIsCreating(false)
      await onClassroomUpdate()
    } catch (error) {
      console.error("Classroom create error", error)
      alert("Unable to create classroom right now. Please try again.")
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDeleteClassroom = async (classroomId: string) => {
    const classroom = classrooms.find((c) => c.id === classroomId)
    if (classroom) {
      classroom.isActive = false
      await saveClassroom(classroom)
      await onClassroomUpdate()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classrooms</h2>
          <p className="text-muted-foreground">Create and manage your classrooms</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : "+ Create Classroom"}
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Classroom</CardTitle>
            <CardDescription>Enter a name for your new classroom</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="className">Classroom Name</Label>
                <Input
                  id="className"
                  placeholder="e.g., ECG 101 - Fall 2024"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleCreateClassroom()
                    }
                  }}
                />
              </div>
              <Button onClick={handleCreateClassroom} disabled={!newClassName.trim()}>
                Create Classroom
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleDeleteClassroom(classroom.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Classroom
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {classrooms.filter((c) => c.isActive).length === 0 && !isCreating && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No classrooms yet. Create your first classroom to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
