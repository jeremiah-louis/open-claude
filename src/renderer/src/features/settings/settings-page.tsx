import { useState } from "react"
import { ArrowLeft, Key, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils"
import { toast } from "sonner"
import { IconSpinner } from "@/components/ui/icons"

type SettingsTab = "api-key" | "profile"

interface UserProfile {
  name: string
  avatarUrl: string
}

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem("user-profile")
    if (raw) return JSON.parse(raw)
  } catch {}
  return { name: "", avatarUrl: "" }
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem("user-profile", JSON.stringify(profile))
}

function maskApiKey(key: string): string {
  if (key.length <= 10) return key
  return key.slice(0, 7) + "..." + key.slice(-4)
}

// --- API Key Tab ---

function ApiKeyTab() {
  const [newKey, setNewKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [currentKeyMasked, setCurrentKeyMasked] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  // Check if a key exists on first render
  if (!checked) {
    setChecked(true)
    window.claude.hasStoredApiKey().then((res) => {
      if (res.success && res.data) {
        setCurrentKeyMasked("sk-ant-•••••••")
      }
    })
  }

  const handleSave = async () => {
    const trimmed = newKey.trim()
    if (!trimmed) return

    setIsValidating(true)
    try {
      const result = await window.claude.validateApiKey(trimmed)
      if (result.success && result.data) {
        await window.claude.setApiKey(trimmed)
        setCurrentKeyMasked(maskApiKey(trimmed))
        setNewKey("")
        toast.success("API key updated successfully")
      } else {
        toast.error(result.error?.message || "Invalid API key")
      }
    } catch {
      toast.error("Could not validate API key. Check your connection.")
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API Key</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Anthropic API key for Claude access.
        </p>
      </div>

      {currentKeyMasked && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Current key</label>
          <div className="flex items-center h-9 px-3 rounded-lg border border-input bg-muted/50 text-sm font-mono text-muted-foreground">
            {currentKeyMasked}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {currentKeyMasked ? "New key" : "API key"}
        </label>
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
          placeholder="sk-ant-..."
          className="font-mono"
          disabled={isValidating}
        />
        <p className="text-xs text-muted-foreground">
          Get your key from{" "}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            console.anthropic.com
          </a>
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={!newKey.trim() || isValidating}
        size="sm"
      >
        {isValidating && <IconSpinner className="w-4 h-4 mr-2" />}
        Save
      </Button>
    </div>
  )
}

// --- Profile Tab ---

function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [isSaving, setIsSaving] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((p) => ({ ...p, avatarUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    setIsSaving(true)
    saveProfile(profile)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("Profile saved")
    }, 200)
  }

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your display name and avatar.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border border-border">
              {initials || <User className="w-6 h-6" />}
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            Edit
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <div className="text-sm text-muted-foreground">
          Click to upload a profile picture
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={profile.name}
          onChange={(e) =>
            setProfile((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Your name"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        size="sm"
      >
        {isSaving && <IconSpinner className="w-4 h-4 mr-2" />}
        Save
      </Button>
    </div>
  )
}

// --- Settings Page ---

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "api-key", label: "API Key", icon: Key },
  { id: "profile", label: "Profile", icon: User },
]

interface SettingsPageProps {
  onNavigateToChat: () => void
}

export function SettingsPage({ onNavigateToChat }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api-key")

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground">
      {/* Title bar drag region */}
      <div
        className="shrink-0 h-10 border-b border-border"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Content area: left nav + right form */}
      <div className="flex-1 flex min-h-0">
        {/* Left navigation sidebar */}
        <div className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col p-4">
          {/* Back button */}
          <button
            onClick={onNavigateToChat}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-lg font-semibold mb-4">Settings</h1>

          {/* Tab list */}
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-xl">
          {activeTab === "api-key" && <ApiKeyTab />}
          {activeTab === "profile" && <ProfileTab />}
        </div>
      </div>
    </div>
  )
}
