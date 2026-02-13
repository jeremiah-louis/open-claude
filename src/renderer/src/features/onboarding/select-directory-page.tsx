"use client"

import { useState } from "react"

import { toast } from "sonner"
import { IconSpinner } from "../../components/ui/icons"
import { Logo } from "../../components/ui/logo"
import { useNative } from "../../hooks/useNative"

export type SelectedDirectory = {
  name: string
  path: string
}

interface SelectDirectoryPageProps {
  onComplete?: (directory: SelectedDirectory) => void
}

export function SelectDirectoryPage({ onComplete }: SelectDirectoryPageProps) {
  const { dialog } = useNative()
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectFolder = async () => {
    setIsSelecting(true)

    try {
      const result = await dialog.openDirectory()

      if (!result.canceled && result.filePaths[0]) {
        const dirPath = result.filePaths[0]

        // Extract folder name from path
        const pathParts = dirPath.split(/[\\/]/) // Split by both / and \
        const folderName = pathParts[pathParts.length - 1] || "Unknown"

        const directory: SelectedDirectory = {
          name: folderName,
          path: dirPath
        }

        toast.success(`Selected: ${folderName}`)
        onComplete?.(directory)
      }
    } catch (error) {
      console.error("Failed to open directory:", error)
      toast.error("Failed to open directory selector")
    } finally {
      setIsSelecting(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none">
      {/* Draggable title bar area */}
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <div className="w-full max-w-[440px] space-y-8 px-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mx-auto w-max">
            <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center">
              <Logo className="w-6 h-6" fill="white" animate={false} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight">
              Select your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a folder to start working with
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 flex flex-col items-center">
          <button
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="w-full h-8 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] dark:shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:cursor-pointer"
          >
            {isSelecting ? (
              <IconSpinner className="h-4 w-4" />
            ) : (
              <>
                {/* <Folder className="h-4 w-4" /> */}
                <span>Select folder</span>
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            You'll be able to switch folders anytime
          </p>
        </div>
      </div>
    </div>
  )
}
