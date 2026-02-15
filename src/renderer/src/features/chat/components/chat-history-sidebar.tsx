import React, { useState } from "react"
import {
  PanelLeft,
  CirclePlus,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/utils"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Mock chat history data
const MOCK_RECENTS = [
  { id: "1", title: "LED Blink Project", active: true },
  { id: "2", title: "Adding a stacked container effect", active: false },
  { id: "3", title: "Arduino code compilation error", active: false },
  { id: "4", title: "Clarification needed", active: false },
]

const MOCK_UNTITLED = [
  { id: "5", title: "explain this properly to me T...", active: false },
  { id: "6", title: "word this properly are the cir...", active: false },
  { id: "7", title: "Circuit components and display fu...", active: false },
  { id: "8", title: "Servo Motor Control", active: false },
  { id: "9", title: "Serial Communication", active: false },
]

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

// const NAV_ITEMS = [
//   { icon: MessageSquare, label: "Chats" },
//   { icon: FolderOpen, label: "Projects" },
//   { icon: Component, label: "Artifacts" },
//   { icon: Code, label: "Code" },
// ]

interface ChatHistorySidebarProps {
  onNavigateToSettings?: () => void
}

export function ChatHistorySidebar({ onNavigateToSettings }: ChatHistorySidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [panelWidth, setPanelWidth] = useState(260)

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
            <Button variant="ghost" size="sm" className="justify-start">
              <CirclePlus className="w-5 h-5" />
              <span>New chat</span>
            </Button>
            {/* <button className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <Search className="w-5 h-5" />
              <span>Search</span>
            </button> */}
          </div>

          {/* Nav links */}
          {/* <div className="px-2 mt-3 flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div> */}

          {/* Chat history */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 px-2">
            {/* Recents */}
            <p className="px-2 pb-1 text-xs text-sidebar-foreground/50 font-medium">Recents</p>
            <div className="flex flex-col gap-0.5">
              {MOCK_RECENTS.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-sm truncate transition-colors",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  {item.title}
                </button>
              ))}
            </div>

            {/* Untitled */}
            <p className="px-2 pt-4 pb-1 text-xs text-sidebar-foreground/50 font-medium">Untitled</p>
            <div className="flex flex-col gap-0.5">
              {MOCK_UNTITLED.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm truncate text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="shrink-0 mt-auto border-t border-sidebar-border px-2 py-2">
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
