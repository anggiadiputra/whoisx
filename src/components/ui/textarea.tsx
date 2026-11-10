import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-2xl border-2 border-transparent bg-cream px-4 text-base font-semibold md:text-[15px] text-ink outline-none transition placeholder:font-medium placeholder:text-muted focus:border-violet focus:bg-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 py-3 leading-snug",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
