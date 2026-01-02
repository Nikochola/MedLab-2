"use client"

import { useMemo, useState } from "react"

interface BulkInviteUploaderProps {
  orgSlug: string
  orgId: string
  action: (formData: FormData) => void | Promise<void>
}

interface ParsedRow {
  email: string
  name: string
  teacher: string
  index: number
  error?: string
}

const csvEscape = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const parseCsvLine = (line: string) => {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

const parseCsv = (raw: string) => {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line, idx) => {
    const cols = parseCsvLine(line)
    const email = cols[0] || ""
    const name = cols[1] || ""
    const teacher = cols[2] || ""
    let error: string | undefined

    if (!email || !email.includes("@")) {
      error = "Invalid email"
    } else if (!name) {
      error = "Missing full name"
    } else if (!teacher) {
      error = "Missing teacher email or name"
    }

    return { email, name, teacher, index: idx + 1, error }
  })
}

export function BulkInviteUploader({ orgSlug, orgId, action }: BulkInviteUploaderProps) {
  const [rawCsv, setRawCsv] = useState("")

  const parsedRows = useMemo(() => parseCsv(rawCsv), [rawCsv])
  const validRows = parsedRows.filter((row) => !row.error)
  const errorRows = parsedRows.filter((row) => row.error)

  const validCsv = useMemo(() => {
    if (!validRows.length) return ""
    return validRows
      .map((row) => [row.email, row.name, row.teacher].map(csvEscape).join(","))
      .join("\n")
  }, [validRows])

  const errorCsv = useMemo(() => {
    if (!errorRows.length) return ""
    const header = "email,full_name,teacher,error"
    const rows = errorRows.map((row) =>
      [row.email, row.name, row.teacher, row.error ?? ""].map(csvEscape).join(",")
    )
    return [header, ...rows].join("\n")
  }, [errorRows])

  const errorCsvHref = useMemo(() => {
    if (!errorCsv) return ""
    return `data:text/csv;charset=utf-8,${encodeURIComponent(errorCsv)}`
  }, [errorCsv])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Upload CSV</label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              setRawCsv(typeof reader.result === "string" ? reader.result : "")
            }
            reader.readAsText(file)
          }}
        />
        <p className="text-xs text-muted-foreground">Format: email, full name, teacher email or name.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Or paste CSV</label>
        <textarea
          rows={5}
          value={rawCsv}
          onChange={(event) => setRawCsv(event.target.value)}
          placeholder="email,full name,teacher email\nstudent1@uni.edu,Jane Doe,dr.smith@uni.edu"
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="rounded-lg border border-dashed border-border bg-slate-50 p-3 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span>Total rows: {parsedRows.length}</span>
          <span className={validRows.length ? "text-emerald-600" : ""}>Valid: {validRows.length}</span>
          <span className={errorRows.length ? "text-red-600" : ""}>Errors: {errorRows.length}</span>
          {errorRows.length > 0 && errorCsvHref && (
            <a
              href={errorCsvHref}
              download="bulk_invite_errors.csv"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Download error CSV
            </a>
          )}
        </div>
      </div>

      <form action={action} className="space-y-2">
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="bulk_csv" value={validCsv} />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
          disabled={!validCsv}
        >
          Send invites
        </button>
        <p className="text-xs text-muted-foreground">
          Only valid rows are sent. Fix errors and re-upload to include them.
        </p>
      </form>

      {parsedRows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Teacher</div>
            <div className="col-span-1">Status</div>
          </div>
          {parsedRows.map((row) => (
            <div
              key={`${row.email}-${row.index}`}
              className="grid grid-cols-12 items-center border-t border-border px-4 py-2 text-xs"
            >
              <div className="col-span-1 text-slate-500">{row.index}</div>
              <div className="col-span-4 truncate text-slate-800">{row.email || "—"}</div>
              <div className="col-span-3 truncate text-slate-800">{row.name || "—"}</div>
              <div className="col-span-3 truncate text-slate-800">{row.teacher || "—"}</div>
              <div className={row.error ? "col-span-1 text-red-600" : "col-span-1 text-emerald-600"}>
                {row.error ? "Fix" : "OK"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
