"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-violet data-[state=unchecked]:bg-ink/20",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none grid size-6 translate-x-1 place-items-center rounded-full bg-white shadow transition data-[state=checked]:translate-x-7 data-[state=checked]:bg-lime [&>svg]:opacity-0 data-[state=checked]:[&>svg]:opacity-100"
      )}
    >
      <Check className="size-3.5 text-ink" strokeWidth={3.2} />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
