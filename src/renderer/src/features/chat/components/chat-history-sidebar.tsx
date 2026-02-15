import React, { useState, useEffect, useCallback } from "react"
import {
  PanelLeft,
  CirclePlus,
  Settings,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Conversation } from "../types"

interface IconRailButtonProps {
  icon: React.ElementType
  label: string
  onClick?: () => void
}

function IconRailButton({ icon: Icon, label, onClick }: IconRailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className="rounded-md w-9 h-9"
        >
          <Icon className="w-[18px] h-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

interface ChatHistorySidebarProps {
  onNavigateToSettings?: () => void
  onSelectConversation?: (id: number) => void
  onNewChat?: () => void
  currentConversationId?: number | null
  refreshKey?: number
}

export function ChatHistorySidebar({
  onNavigateToSettings,
  onSelectConversation,
  onNewChat,
  currentConversationId,
  refreshKey,
}: ChatHistorySidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [panelWidth, setPanelWidth] = useState(260)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const list = await window.db.listConversations()
      setConversations(list)
    } catch (err) {
      console.error("Failed to load conversations:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations, refreshKey])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await window.db.deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (currentConversationId === id) {
      onNewChat?.()
    }
  }

  if (isExpanded) {
    return (
      <ResizableSidebar
        isOpen
        onClose={() => setIsExpanded(false)}
        width={panelWidth}
        onWidthChange={setPanelWidth}
        side="left"
        minWidth={200}
        maxWidth={400}
        showResizeTooltip
        disableClickToClose
        className="border-r border-sidebar-border"
      >
        <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7 shrink-0" animate={false} />
              <span className="text-xl font-semibold tracking-tight font-serif">Clover</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="rounded-md w-8 h-8"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Nav actions */}
          <div className="px-2 flex flex-col gap-0.5">
            <Button variant="ghost" size="sm" className="justify-start" onClick={onNewChat}>
              <CirclePlus className="w-5 h-5" />
              <span>New chat</span>
            </Button>
          </div>

          {/* Chat history */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 px-2">
            {isLoading ? (
              <div className="flex flex-col gap-2 px-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2 text-sm text-sidebar-foreground/50">No conversations yet</p>
            ) : (
              <>
                <p className="px-2 pb-1 text-xs text-sidebar-foreground/50 font-medium">Recents</p>
                <div className="flex flex-col gap-0.5">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation?.(conv.id)}
                      className={cn(
                        "group w-full text-left px-2 py-1.5 rounded-lg text-sm truncate transition-colors flex items-center gap-1",
                        conv.id === currentConversationId
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <span className="flex-1 truncate">{conv.title || "Untitled"}</span>
                      <span
                        role="button"
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-sidebar-foreground/50" />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="shrink-0 mt-auto px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onNavigateToSettings}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </ResizableSidebar>
    )
  }

  // Collapsed: icon rail only
  return (
    <div className="w-[52px] shrink-0 flex flex-col items-center bg-sidebar border-r border-sidebar-border pt-2 pb-3">
      <div className="flex flex-col items-center gap-3">
        <IconRailButton
          icon={PanelLeft}
          label="Open sidebar"
          onClick={() => setIsExpanded(true)}
        />
        <IconRailButton
          icon={CirclePlus}
          label="New chat"
          onClick={onNewChat}
        />
      </div>

      <div className="mt-auto">
        <IconRailButton
          icon={Settings}
          label="Settings"
          onClick={onNavigateToSettings}
        />
      </div>
    </div>
  )
}
