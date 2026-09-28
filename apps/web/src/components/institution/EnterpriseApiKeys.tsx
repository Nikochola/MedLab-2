"use client"

import { useState } from "react"
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

type ApiKeyRow = { id: string; name: string; prefix: string; scopes: string[]; dailyLimit: number; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }

export function EnterpriseApiKeys({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function createKey(formData: FormData) {
    setBusy(true)
    try {
      const scopes = ["analytics:read", "roster:read"].filter((scope) => formData.get(scope) === "on")
      const response = await fetch("/api/institution/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: formData.get("name"), scopes, dailyLimit: Number(formData.get("dailyLimit")) }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "API key could not be created")
      setRevealedKey(payload.apiKey)
      const refreshed = await fetch("/api/institution/api-keys", { cache: "no-store" }).then((result) => result.json())
      setKeys(refreshed.keys || [])
      toast.success("API key created")
    } catch (error) { toast.error(error instanceof Error ? error.message : "API key could not be created") } finally { setBusy(false) }
  }

  async function revokeKey(keyId: string) {
    if (!window.confirm("Revoke this API key? Applications using it will immediately lose access.")) return
    const response = await fetch("/api/institution/api-keys", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ keyId }) })
    if (!response.ok) return toast.error("API key could not be revoked")
    setKeys((current) => current.map((key) => key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key))
    toast.success("API key revoked")
  }

  async function copyKey() {
    if (!revealedKey) return
    await navigator.clipboard.writeText(revealedKey)
    toast.success("API key copied")
  }

  return <section className="institution-panel overflow-hidden">
    <div className="border-b border-[#e8e6df] p-5"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#0066ff]" /><h2 className="text-base font-semibold text-[#0e0f12]">API access</h2></div><p className="mt-1.5 text-xs leading-5 text-[#77746d]">Create scoped credentials for reporting integrations. Secret keys are shown once and stored only as hashes.</p></div>
    {revealedKey ? <div className="border-b border-[#bbf7d0] bg-[#f0fdf4] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#166534]"><Check className="h-4 w-4" /> Copy this key now—it cannot be displayed again.</div><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-[9px] border border-[#bbf7d0] bg-white px-3 py-2.5 text-xs text-[#252521]">{revealedKey}</code><button type="button" onClick={copyKey} className="institution-button-secondary"><Copy className="h-4 w-4" /> Copy</button></div></div> : null}
    <form action={createKey} className="border-b border-[#e8e6df] p-5"><div className="grid gap-4 md:grid-cols-[1fr_160px]"><label className="text-xs font-semibold text-[#65635d]">Key name<input name="name" className="institution-input mt-1.5" required maxLength={80} placeholder="Reporting warehouse" /></label><label className="text-xs font-semibold text-[#65635d]">Daily request limit<input name="dailyLimit" type="number" min={1} max={1000000} defaultValue={10000} className="institution-input mt-1.5" /></label></div><div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-[#4f4d47]"><label className="flex items-center gap-2"><input type="checkbox" name="analytics:read" defaultChecked /> Analytics read</label><label className="flex items-center gap-2"><input type="checkbox" name="roster:read" /> Roster read</label></div><button disabled={busy} className="institution-button-primary mt-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Create key</button></form>
    {keys.length ? <div className="divide-y divide-[#efede7]">{keys.map((key) => <div key={key.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-[#252521]">{key.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${key.revokedAt ? "bg-[#f0eee8] text-[#77746d]" : "bg-[#eaf8ed] text-[#24713a]"}`}>{key.revokedAt ? "Revoked" : "Active"}</span></div><p className="mt-1 font-mono text-xs text-[#77746d]">{key.prefix}•••••••• · {key.scopes.join(", ")} · {key.dailyLimit.toLocaleString()}/day</p><p className="mt-1 text-[11px] text-[#9a978f]">Created {new Date(key.createdAt).toLocaleDateString()}{key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleString()}` : " · Never used"}</p></div>{!key.revokedAt ? <button type="button" onClick={() => revokeKey(key.id)} className="institution-button-secondary"><Trash2 className="h-4 w-4" /> Revoke</button> : null}</div>)}</div> : <p className="p-6 text-center text-sm text-[#77746d]">No API keys created.</p>}
  </section>
}
