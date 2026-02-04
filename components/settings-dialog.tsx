"use client"

import { useId } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useStrippedMode } from "@/lib/stripped-mode-context"
import { Settings as SettingsIcon } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const id = useId()
  const { strippedMode, setStrippedMode } = useStrippedMode()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Toggle behavior for testing. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor={id} className="text-base font-medium">
              Admin / everything unlocked
            </Label>
            <p className="text-sm text-muted-foreground">
              When on: no login gate, admin only, all downloads and code visible. When off: normal roles, export gating, code blur.
            </p>
          </div>
          <Switch
            id={id}
            checked={strippedMode}
            onCheckedChange={setStrippedMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
