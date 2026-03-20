"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Check, Pencil, RefreshCw, X, Flame, Zap, Trophy } from "lucide-react"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

// ── DiceBear Big Smile options ──────────────────────────────────────────

const HAIR_OPTIONS = [
  "shortHair", "mohawk", "wavyBob", "bowlCutHair", "curlyBob",
  "straightHair", "braids", "curlyShortHair", "buzz", "bun",
]

const EYES_OPTIONS = [
  "cheery", "normal", "confused", "starstruck", "winking", "sleepy", "sad", "angry",
]

const MOUTH_OPTIONS = [
  "openedSmile", "unimpressed", "gapSmile", "teethSmile", "awkwardSmile", "braces", "kawaii",
]

const SKIN_COLORS = [
  "ffe4c0", "f5d7b1", "efcc9f", "d5a87a", "c99c62", "a47539", "8c5a2b", "643d19",
]

const HAIR_COLORS = [
  "220f00", "3a1a00", "71635a", "b58143", "d6b370", "e8e1e1", "cb6820", "b83c08", "605de4", "238d80",
]

const BG_COLORS = [
  "EEF3FF", "E8F5E9", "FFF3E0", "FCE4EC", "F3E5F5", "E0F7FA", "FFF8E1", "EFEBE9",
]

const ACCESSORY_OPTIONS = [
  "none", "glasses", "sunglasses", "mustache", "catEars", "clownNose", "faceMask",
]

type AvatarConfig = {
  seed: string
  hair: string
  eyes: string
  mouth: string
  skinColor: string
  hairColor: string
  bgColor: string
  accessory: string
}

const DEFAULT_CONFIG: AvatarConfig = {
  seed: "default",
  hair: "shortHair",
  eyes: "cheery",
  mouth: "openedSmile",
  skinColor: "efcc9f",
  hairColor: "220f00",
  bgColor: "EEF3FF",
  accessory: "none",
}

function buildAvatarUrl(opts: AvatarConfig) {
  const params = new URLSearchParams({
    seed: opts.seed,
    hair: opts.hair,
    eyes: opts.eyes,
    mouth: opts.mouth,
    skinColor: opts.skinColor,
    hairColor: opts.hairColor,
    backgroundColor: opts.bgColor,
    scale: "90",
    radius: "50",
  })
  if (opts.accessory !== "none") {
    params.set("accessories", opts.accessory)
    params.set("accessoriesProbability", "100")
  } else {
    params.set("accessoriesProbability", "0")
  }
  return `https://api.dicebear.com/9.x/big-smile/svg?${params.toString()}`
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomConfig(): AvatarConfig {
  return {
    seed: Math.random().toString(36).slice(2, 10),
    hair: randomFrom(HAIR_OPTIONS),
    eyes: randomFrom(EYES_OPTIONS),
    mouth: randomFrom(MOUTH_OPTIONS),
    skinColor: randomFrom(SKIN_COLORS),
    hairColor: randomFrom(HAIR_COLORS),
    bgColor: randomFrom(BG_COLORS),
    accessory: randomFrom(ACCESSORY_OPTIONS),
  }
}

// ── Picker components ───────────────────────────────────────────────────

function OptionRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: "#6B6A65" }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = opt === value
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
              style={{
                backgroundColor: selected ? "#EEF3FF" : "#F5F5F3",
                color: selected ? "#0066FF" : "#6B6A65",
                border: selected ? "1.5px solid #C7D9FF" : "1.5px solid transparent",
              }}
            >
              {opt.replace(/([A-Z])/g, " $1").trim()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: "#6B6A65" }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((hex) => {
          const selected = hex === value
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className="relative h-7 w-7 rounded-full transition-all flex items-center justify-center"
              style={{
                backgroundColor: `#${hex}`,
                boxShadow: selected ? "0 0 0 2px white, 0 0 0 3.5px #0066FF" : "0 0 0 1px #E8E6DF",
              }}
            >
              {selected && <Check className="h-3 w-3" style={{ color: parseInt(hex, 16) > 0xaaaaaa ? "#0E0F12" : "white" }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Avatar Editor Modal ─────────────────────────────────────────────────

function AvatarEditorModal({
  config,
  onSave,
  onClose,
}: {
  config: AvatarConfig
  onSave: (config: AvatarConfig) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AvatarConfig>(config)
  const previewUrl = useMemo(() => buildAvatarUrl(draft), [draft])

  const update = useCallback(<K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: val }))
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-[560px] max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: "white", border: "1px solid #E8E6DF" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E8E6DF" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0E0F12" }}>Edit Avatar</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-[#F5F5F3]">
            <X className="h-5 w-5" style={{ color: "#9B9A94" }} />
          </button>
        </div>

        {/* Preview + Randomize */}
        <div className="flex items-center gap-5 px-6 py-5" style={{ borderBottom: "1px solid #E8E6DF" }}>
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: 100, height: 100, backgroundColor: `#${draft.bgColor}` }}
          >
            <img src={previewUrl} alt="Preview" width={100} height={100} style={{ display: "block" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#0E0F12" }}>Preview</p>
            <p className="text-xs mt-0.5" style={{ color: "#9B9A94" }}>Customize your look below, or try a random one.</p>
            <button
              type="button"
              onClick={() => setDraft(randomConfig())}
              className="mt-3 flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-xs font-medium transition-all"
              style={{
                backgroundColor: "white",
                border: "1.5px solid #D8D5CC",
                boxShadow: "0 2px 0 #D8D5CC",
                color: "#0E0F12",
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Randomize
            </button>
          </div>
        </div>

        {/* Options (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <ColorRow label="Skin Tone" options={SKIN_COLORS} value={draft.skinColor} onChange={(v) => update("skinColor", v)} />
          <ColorRow label="Hair Color" options={HAIR_COLORS} value={draft.hairColor} onChange={(v) => update("hairColor", v)} />
          <ColorRow label="Background" options={BG_COLORS} value={draft.bgColor} onChange={(v) => update("bgColor", v)} />
          <OptionRow label="Hairstyle" options={HAIR_OPTIONS} value={draft.hair} onChange={(v) => update("hair", v)} />
          <OptionRow label="Eyes" options={EYES_OPTIONS} value={draft.eyes} onChange={(v) => update("eyes", v)} />
          <OptionRow label="Mouth" options={MOUTH_OPTIONS} value={draft.mouth} onChange={(v) => update("mouth", v)} />
          <OptionRow label="Accessory" options={ACCESSORY_OPTIONS} value={draft.accessory} onChange={(v) => update("accessory", v)} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #E8E6DF" }}>
          <button
            onClick={onClose}
            className="rounded-[9px] px-5 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: "white",
              border: "1.5px solid #D8D5CC",
              boxShadow: "0 3px 0 #D8D5CC",
              color: "#0E0F12",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded-[9px] px-5 py-2.5 text-sm font-semibold text-white transition-all"
            style={{
              backgroundColor: "#0066FF",
              border: "1.5px solid #0047CC",
              boxShadow: "0 3px 0 #0047CC",
            }}
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Profile Page ────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshSession } = useAuth()
  const { stats } = useStudentStats(user?.id)

  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Load saved data from DB
  useEffect(() => {
    if (!user?.id) return
    supabase.from("profiles").select("avatar_config, full_name").eq("id", user.id).single().then(({ data }) => {
      setName(data?.full_name || user.name || "")
      if (data?.avatar_config) {
        const c = data.avatar_config as Record<string, string>
        setAvatarConfig({
          seed: c.seed || user.id,
          hair: c.hair || DEFAULT_CONFIG.hair,
          eyes: c.eyes || DEFAULT_CONFIG.eyes,
          mouth: c.mouth || DEFAULT_CONFIG.mouth,
          skinColor: c.skinColor || DEFAULT_CONFIG.skinColor,
          hairColor: c.hairColor || DEFAULT_CONFIG.hairColor,
          bgColor: c.bgColor || DEFAULT_CONFIG.bgColor,
          accessory: c.accessory || DEFAULT_CONFIG.accessory,
        })
      } else {
        setAvatarConfig({ ...DEFAULT_CONFIG, seed: user.id })
      }
      setProfileLoaded(true)
    })
  }, [user?.id])

  const avatarUrl = useMemo(() => avatarConfig ? buildAvatarUrl(avatarConfig) : null, [avatarConfig])

  const handleSaveName = async () => {
    if (!user?.id || !name.trim()) return
    setSavingName(true)
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id)
    setSavingName(false)
    if (error) {
      toast.error("Failed to save name")
    } else {
      toast.success("Name updated")
      refreshSession()
    }
  }

  const handleSaveAvatar = async (config: AvatarConfig) => {
    if (!user?.id) return
    const url = buildAvatarUrl(config)
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_config: config, avatar_url: url })
      .eq("id", user.id)

    if (error) {
      console.error("Avatar save error:", error)
      toast.error("Failed to save avatar")
    } else {
      setAvatarConfig(config)
      setEditorOpen(false)
      toast.success("Avatar saved")
      refreshSession()
    }
  }

  if (!profileLoaded || !avatarConfig) {
    return <div className="h-full flex items-center justify-center"><div className="text-sm" style={{ color: "#9B9A94" }}>Loading...</div></div>
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Avatar + Identity */}
        <div className="flex items-start gap-6">
          {/* Avatar with edit button */}
          <div className="relative flex-shrink-0">
            <div
              className="rounded-full overflow-hidden"
              style={{ width: 120, height: 120, backgroundColor: `#${avatarConfig.bgColor}` }}
            >
              <img src={avatarUrl ?? undefined} alt="Avatar" width={120} height={120} style={{ display: "block" }} />
            </div>
            <button
              onClick={() => setEditorOpen(true)}
              className="absolute bottom-0 right-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "white",
                border: "1.5px solid #E8E6DF",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              }}
            >
              <Pencil className="h-4 w-4" style={{ color: "#6B6A65" }} />
            </button>
          </div>

          {/* Name + meta */}
          <div className="pt-2 min-w-0">
            <h1 className="text-2xl font-semibold truncate" style={{ color: "#0E0F12" }}>
              {name || "Your Name"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#9B9A94" }}>{user?.email}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9B9A94" }}>
              Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "#F5F5F3" }}>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium" style={{ color: "#6B6A65" }}>Streak</span>
              </div>
              <div className="text-2xl font-semibold mt-1" style={{ color: "#0E0F12" }}>{stats.currentStreak}d</div>
            </div>
            <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "#F5F5F3" }}>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium" style={{ color: "#6B6A65" }}>Total XP</span>
              </div>
              <div className="text-2xl font-semibold mt-1" style={{ color: "#0E0F12" }}>{stats.totalXP.toLocaleString()}</div>
            </div>
            <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "#F5F5F3" }}>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium" style={{ color: "#6B6A65" }}>Level</span>
              </div>
              <div className="text-2xl font-semibold mt-1" style={{ color: "#0E0F12" }}>{stats.currentLevel}</div>
            </div>
          </div>
        )}

        {/* Edit Name Section */}
        <div className="mt-8 pt-8" style={{ borderTop: "1px solid #E8E6DF" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#0E0F12" }}>Settings</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B6A65" }}>Display Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-[9px] text-sm font-medium outline-none transition-colors"
                style={{
                  backgroundColor: "white",
                  border: "1.5px solid #E8E6DF",
                  color: "#0E0F12",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
              />
            </div>
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="rounded-[9px] px-5 h-11 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                backgroundColor: "#0066FF",
                border: "1.5px solid #0047CC",
                boxShadow: "0 3px 0 #0047CC",
              }}
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {editorOpen && (
        <AvatarEditorModal
          config={avatarConfig}
          onSave={handleSaveAvatar}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}
