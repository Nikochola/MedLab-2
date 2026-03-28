"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Check, Pencil, RefreshCw, X } from "lucide-react"
import { StreamlineFlame, StreamlineDiamond, StreamlineStarCircle } from "@/components/icons/streamline"
import {
  MagnifyingGlass,
  UserPlus,
  UserCheck,
  UserMinus,
  Users,
  X as PhosphorX,
  Check as PhosphorCheck,
} from "@phosphor-icons/react"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

// ── DiceBear Big Smile options ──────────────────────────────────────────

const HAIR_OPTIONS = [
  "shortHair", "mohawk", "wavyBob", "bowlCutHair", "curlyBob",
  "straightHair", "braids", "curlyShortHair", "buzz", "bun",
]
const EYES_OPTIONS = ["cheery", "normal", "confused", "starstruck", "winking", "sleepy", "sad", "angry"]
const MOUTH_OPTIONS = ["openedSmile", "unimpressed", "gapSmile", "teethSmile", "awkwardSmile", "braces", "kawaii"]
const SKIN_COLORS = ["ffe4c0", "f5d7b1", "efcc9f", "d5a87a", "c99c62", "a47539", "8c5a2b", "643d19"]
const HAIR_COLORS = ["220f00", "3a1a00", "71635a", "b58143", "d6b370", "e8e1e1", "cb6820", "b83c08", "605de4", "238d80"]
const BG_COLORS = ["EEF3FF", "E8F5E9", "FFF3E0", "FCE4EC", "F3E5F5", "E0F7FA", "FFF8E1", "EFEBE9"]
const ACCESSORY_OPTIONS = ["none", "glasses", "sunglasses", "mustache", "catEars", "clownNose", "faceMask"]

type AvatarConfig = {
  seed: string; hair: string; eyes: string; mouth: string
  skinColor: string; hairColor: string; bgColor: string; accessory: string
}

const DEFAULT_CONFIG: AvatarConfig = {
  seed: "default", hair: "shortHair", eyes: "cheery", mouth: "openedSmile",
  skinColor: "efcc9f", hairColor: "220f00", bgColor: "EEF3FF", accessory: "none",
}

function buildAvatarUrl(opts: AvatarConfig) {
  const params = new URLSearchParams({
    seed: opts.seed, hair: opts.hair, eyes: opts.eyes, mouth: opts.mouth,
    skinColor: opts.skinColor, hairColor: opts.hairColor, backgroundColor: opts.bgColor,
    scale: "90", radius: "50",
  })
  if (opts.accessory !== "none") {
    params.set("accessories", opts.accessory)
    params.set("accessoriesProbability", "100")
  } else {
    params.set("accessoriesProbability", "0")
  }
  return `https://api.dicebear.com/9.x/big-smile/svg?${params.toString()}`
}

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function randomConfig(): AvatarConfig {
  return {
    seed: Math.random().toString(36).slice(2, 10),
    hair: randomFrom(HAIR_OPTIONS), eyes: randomFrom(EYES_OPTIONS),
    mouth: randomFrom(MOUTH_OPTIONS), skinColor: randomFrom(SKIN_COLORS),
    hairColor: randomFrom(HAIR_COLORS), bgColor: randomFrom(BG_COLORS),
    accessory: randomFrom(ACCESSORY_OPTIONS),
  }
}

// ── Pickers ─────────────────────────────────────────────────────────────

function OptionRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: "#6B6A65" }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)} className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
            style={{ backgroundColor: opt === value ? "#EEF3FF" : "#F5F5F3", color: opt === value ? "#0066FF" : "#6B6A65", border: opt === value ? "1.5px solid #C7D9FF" : "1.5px solid transparent" }}>
            {opt.replace(/([A-Z])/g, " $1").trim()}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: "#6B6A65" }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((hex) => (
          <button key={hex} type="button" onClick={() => onChange(hex)} className="relative h-7 w-7 rounded-full transition-all flex items-center justify-center"
            style={{ backgroundColor: `#${hex}`, boxShadow: hex === value ? "0 0 0 2px white, 0 0 0 3.5px #0066FF" : "0 0 0 1px #E8E6DF" }}>
            {hex === value && <Check className="h-3 w-3" style={{ color: parseInt(hex, 16) > 0xaaaaaa ? "#0E0F12" : "white" }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Avatar Editor Modal ──────────────────────────────────────────────────

function AvatarEditorModal({ config, onSave, onClose }: { config: AvatarConfig; onSave: (c: AvatarConfig) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AvatarConfig>(config)
  const previewUrl = useMemo(() => buildAvatarUrl(draft), [draft])
  const update = useCallback(<K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: val }))
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[560px] max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl" style={{ backgroundColor: "white", border: "1px solid #E8E6DF" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E8E6DF" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0E0F12" }}>Edit Avatar</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-[#F5F5F3]">
            <X className="h-5 w-5" style={{ color: "#9B9A94" }} />
          </button>
        </div>
        <div className="flex items-center gap-5 px-6 py-5" style={{ borderBottom: "1px solid #E8E6DF" }}>
          <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 100, height: 100, backgroundColor: `#${draft.bgColor}` }}>
            <img src={previewUrl} alt="Preview" width={100} height={100} style={{ display: "block" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#0E0F12" }}>Preview</p>
            <p className="text-xs mt-0.5" style={{ color: "#9B9A94" }}>Customize your look below, or try a random one.</p>
            <button type="button" onClick={() => setDraft(randomConfig())} className="mt-3 flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-xs font-medium transition-all"
              style={{ backgroundColor: "white", border: "1.5px solid #D8D5CC", boxShadow: "0 2px 0 #D8D5CC", color: "#0E0F12" }}>
              <RefreshCw className="h-3.5 w-3.5" />
              Randomize
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <ColorRow label="Skin Tone" options={SKIN_COLORS} value={draft.skinColor} onChange={(v) => update("skinColor", v)} />
          <ColorRow label="Hair Color" options={HAIR_COLORS} value={draft.hairColor} onChange={(v) => update("hairColor", v)} />
          <ColorRow label="Background" options={BG_COLORS} value={draft.bgColor} onChange={(v) => update("bgColor", v)} />
          <OptionRow label="Hairstyle" options={HAIR_OPTIONS} value={draft.hair} onChange={(v) => update("hair", v)} />
          <OptionRow label="Eyes" options={EYES_OPTIONS} value={draft.eyes} onChange={(v) => update("eyes", v)} />
          <OptionRow label="Mouth" options={MOUTH_OPTIONS} value={draft.mouth} onChange={(v) => update("mouth", v)} />
          <OptionRow label="Accessory" options={ACCESSORY_OPTIONS} value={draft.accessory} onChange={(v) => update("accessory", v)} />
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #E8E6DF" }}>
          <button onClick={onClose} className="rounded-[9px] px-5 py-2.5 text-sm font-medium transition-all"
            style={{ backgroundColor: "white", border: "1.5px solid #D8D5CC", boxShadow: "0 3px 0 #D8D5CC", color: "#0E0F12" }}>
            Cancel
          </button>
          <button onClick={() => onSave(draft)} className="rounded-[9px] px-5 py-2.5 text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}>
            Save Avatar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Friends ──────────────────────────────────────────────────────────────

type FriendProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  avatar_config: Record<string, string> | null
}

type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: "pending" | "accepted" | "declined"
  profile: FriendProfile
}

function friendAvatarUrl(profile: FriendProfile) {
  if (profile.avatar_url) return profile.avatar_url
  const c = profile.avatar_config
  if (c) {
    const config: AvatarConfig = {
      seed: c.seed || profile.id,
      hair: c.hair || DEFAULT_CONFIG.hair,
      eyes: c.eyes || DEFAULT_CONFIG.eyes,
      mouth: c.mouth || DEFAULT_CONFIG.mouth,
      skinColor: c.skinColor || DEFAULT_CONFIG.skinColor,
      hairColor: c.hairColor || DEFAULT_CONFIG.hairColor,
      bgColor: c.bgColor || DEFAULT_CONFIG.bgColor,
      accessory: c.accessory || DEFAULT_CONFIG.accessory,
    }
    return buildAvatarUrl(config)
  }
  return `https://api.dicebear.com/9.x/big-smile/svg?seed=${profile.id}&backgroundColor=EEF3FF&scale=90&radius=50`
}

function FriendAvatar({ profile, size = 40 }: { profile: FriendProfile; size?: number }) {
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size, backgroundColor: "#EEF3FF" }}>
      <img src={friendAvatarUrl(profile)} alt={profile.full_name || "Friend"} width={size} height={size} style={{ display: "block" }} />
    </div>
  )
}

function FriendsSection({ userId }: { userId: string }) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [pendingIn, setPendingIn] = useState<Friendship[]>([])
  const [pendingOut, setPendingOut] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)

  const loadFriendships = useCallback(async () => {
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (!data) { setLoading(false); return }

    // Collect all other user IDs
    const otherIds = data.map((f) => f.requester_id === userId ? f.addressee_id : f.requester_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, avatar_config")
      .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"])

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const enriched: Friendship[] = data.map((f) => ({
      ...f,
      profile: profileMap.get(f.requester_id === userId ? f.addressee_id : f.requester_id) ?? {
        id: "", full_name: "Unknown", avatar_url: null, avatar_config: null,
      },
    }))

    setFriends(enriched.filter((f) => f.status === "accepted"))
    setPendingIn(enriched.filter((f) => f.status === "pending" && f.addressee_id === userId))
    setPendingOut(enriched.filter((f) => f.status === "pending" && f.requester_id === userId))
    setLoading(false)
  }, [userId])

  useEffect(() => { loadFriendships() }, [loadFriendships])

  const allKnownIds = useMemo(() => {
    const ids = new Set<string>([userId])
    ;[...friends, ...pendingIn, ...pendingOut].forEach((f) => ids.add(f.profile.id))
    return ids
  }, [friends, pendingIn, pendingOut, userId])

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, avatar_config")
      .ilike("full_name", `%${query.trim()}%`)
      .limit(8)
    setSearchResults((data ?? []).filter((p) => !allKnownIds.has(p.id)))
    setSearching(false)
  }

  const sendRequest = async (addresseeId: string) => {
    const { error } = await supabase.from("friendships").insert({ requester_id: userId, addressee_id: addresseeId })
    if (error) { toast.error("Could not send request"); return }
    toast.success("Friend request sent!")
    setSearchResults((r) => r.filter((p) => p.id !== addresseeId))
    loadFriendships()
  }

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId)
    loadFriendships()
  }

  const declineRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "declined" }).eq("id", friendshipId)
    loadFriendships()
  }

  const removeFriend = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId)
    loadFriendships()
  }

  if (loading) return null

  return (
    <div className="mt-8 pt-8" style={{ borderTop: "1px solid #E8E6DF" }}>
      <div className="flex items-center gap-2 mb-5">
        <Users size={16} style={{ color: "#0E0F12" }} />
        <h3 className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Friends</h3>
        {friends.length > 0 && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#EEF3FF", color: "#0066FF" }}>
            {friends.length}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9B9A94" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name..."
            className="w-full h-10 pl-9 pr-4 rounded-[9px] text-sm outline-none"
            style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#0E0F12" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-4 h-10 rounded-[9px] text-sm font-semibold text-white disabled:opacity-40 transition-all"
          style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1.5px solid #E8E6DF" }}>
          {searchResults.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? "1px solid #E8E6DF" : undefined }}>
              <FriendAvatar profile={p} size={36} />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: "#0E0F12" }}>
                {p.full_name || "Unknown"}
              </span>
              <button onClick={() => sendRequest(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: "#EEF3FF", color: "#0066FF", border: "1.5px solid #C7D9FF" }}>
                <UserPlus size={13} />
                Add
              </button>
            </div>
          ))}
        </div>
      )}
      {searchResults.length === 0 && query && !searching && (
        <p className="text-xs mb-4" style={{ color: "#9B9A94" }}>No users found for "{query}".</p>
      )}

      {/* Incoming requests */}
      {pendingIn.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#9B9A94" }}>
            Friend Requests
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid #E8E6DF" }}>
            {pendingIn.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? "1px solid #E8E6DF" : undefined }}>
                <FriendAvatar profile={f.profile} size={36} />
                <span className="flex-1 text-sm font-medium truncate" style={{ color: "#0E0F12" }}>
                  {f.profile.full_name || "Unknown"}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => acceptRequest(f.id)}
                    className="flex items-center justify-center rounded-lg transition-all"
                    style={{ width: 32, height: 32, backgroundColor: "#ECFDF5", border: "1.5px solid #A7F3D0" }}>
                    <PhosphorCheck size={14} weight="bold" style={{ color: "#059669" }} />
                  </button>
                  <button onClick={() => declineRequest(f.id)}
                    className="flex items-center justify-center rounded-lg transition-all"
                    style={{ width: 32, height: 32, backgroundColor: "#FFF5F5", border: "1.5px solid #FFC5C5" }}>
                    <PhosphorX size={14} weight="bold" style={{ color: "#DC2626" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      {friends.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "#FAFAF8", border: "1.5px solid #E8E6DF" }}>
              <FriendAvatar profile={f.profile} size={36} />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: "#0E0F12" }}>
                {f.profile.full_name || "Unknown"}
              </span>
              <button onClick={() => removeFriend(f.id)} title="Remove friend"
                className="flex items-center justify-center rounded-lg transition-all opacity-40 hover:opacity-100"
                style={{ width: 28, height: 28 }}>
                <UserMinus size={14} style={{ color: "#6B6A65" }} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        pendingIn.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ border: "1.5px dashed #E8E6DF" }}>
            <UserCheck size={28} style={{ color: "#C8C5BC" }} className="mb-2" />
            <p className="text-sm" style={{ color: "#9B9A94" }}>No friends yet.</p>
            <p className="text-xs mt-0.5" style={{ color: "#C8C5BC" }}>Search by name to add friends.</p>
          </div>
        )
      )}
    </div>
  )
}

// ── Profile Page ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshSession } = useAuth()
  const { stats } = useStudentStats(user?.id)

  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const isIndependent = user?.primary_role !== "institution"

  useEffect(() => {
    if (!user?.id) return
    supabase.from("profiles").select("avatar_config, full_name").eq("id", user.id).single().then(({ data }) => {
      setName(data?.full_name || user.name || "")
      if (data?.avatar_config) {
        const c = data.avatar_config as Record<string, string>
        setAvatarConfig({
          seed: c.seed || user.id, hair: c.hair || DEFAULT_CONFIG.hair,
          eyes: c.eyes || DEFAULT_CONFIG.eyes, mouth: c.mouth || DEFAULT_CONFIG.mouth,
          skinColor: c.skinColor || DEFAULT_CONFIG.skinColor, hairColor: c.hairColor || DEFAULT_CONFIG.hairColor,
          bgColor: c.bgColor || DEFAULT_CONFIG.bgColor, accessory: c.accessory || DEFAULT_CONFIG.accessory,
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
    if (error) { toast.error("Failed to save name") } else { toast.success("Name updated"); refreshSession() }
  }

  const handleSaveAvatar = async (config: AvatarConfig) => {
    if (!user?.id) return
    const url = buildAvatarUrl(config)
    const { error } = await supabase.from("profiles").update({ avatar_config: config, avatar_url: url }).eq("id", user.id)
    if (error) { toast.error("Failed to save avatar") } else {
      setAvatarConfig(config); setEditorOpen(false); toast.success("Avatar saved"); refreshSession()
    }
  }

  if (!profileLoaded || !avatarConfig) {
    return <div className="h-full flex items-center justify-center"><div className="text-sm" style={{ color: "#9B9A94" }}>Loading...</div></div>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Avatar + Identity */}
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="rounded-full overflow-hidden" style={{ width: 120, height: 120, backgroundColor: `#${avatarConfig.bgColor}` }}>
              <img src={avatarUrl ?? undefined} alt="Avatar" width={120} height={120} style={{ display: "block" }} />
            </div>
            <button onClick={() => setEditorOpen(true)} className="absolute bottom-0 right-0 h-9 w-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" }}>
              <Pencil className="h-4 w-4" style={{ color: "#6B6A65" }} />
            </button>
          </div>
          <div className="pt-2 min-w-0">
            <h1 className="text-2xl font-semibold truncate" style={{ color: "#0E0F12" }}>{name || "Your Name"}</h1>
            <p className="text-sm mt-1" style={{ color: "#9B9A94" }}>{user?.email}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9B9A94" }}>
              Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: <StreamlineFlame size={16} color="#EA580C" />, label: "Streak", value: `${stats.currentStreak}d` },
              { icon: <StreamlineDiamond size={16} color="#0066FF" />, label: "Total XP", value: stats.totalXP.toLocaleString() },
              { icon: <StreamlineStarCircle size={16} color="#CA8A04" />, label: "Level", value: `${stats.currentLevel}` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded-xl px-4 py-4" style={{ backgroundColor: "#F5F5F3" }}>
                <div className="flex items-center gap-2">{icon}<span className="text-xs font-medium" style={{ color: "#6B6A65" }}>{label}</span></div>
                <div className="text-2xl font-semibold mt-1" style={{ color: "#0E0F12" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Friends — independent students only */}
        {isIndependent && user?.id && <FriendsSection userId={user.id} />}

        {/* Settings */}
        <div className="mt-8 pt-8" style={{ borderTop: "1px solid #E8E6DF" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#0E0F12" }}>Settings</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B6A65" }}>Display Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 px-4 rounded-[9px] text-sm font-medium outline-none transition-colors"
                style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#0E0F12" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
            </div>
            <button onClick={handleSaveName} disabled={savingName} className="rounded-[9px] px-5 h-11 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: "#0066FF", border: "1.5px solid #0047CC", boxShadow: "0 3px 0 #0047CC" }}>
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

      </div>

      {editorOpen && (
        <AvatarEditorModal config={avatarConfig} onSave={handleSaveAvatar} onClose={() => setEditorOpen(false)} />
      )}
    </div>
  )
}
