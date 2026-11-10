import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full font-extrabold transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-violet text-white shadow-card hover:bg-violet-dark",
        destructive:
          "bg-rose text-st-no hover:bg-rose-dark",
        outline:
          "border-2 border-ink bg-white text-ink hover:bg-cream",
        secondary:
          "bg-cream text-ink hover:bg-lilac",
        ghost: "text-ink hover:bg-lilac",
        link: "text-violet underline-offset-4 hover:underline",
        // Filter chips (pair with aria-pressed)
        chipOn: "bg-ink text-white",
        chipOff: "bg-cream text-ink hover:bg-lilac",
      },
      size: {
        default: "h-12 px-5 text-[15px]",
        sm: "h-10 px-4 text-[13px]",
        lg: "h-14 px-6 text-[15px]",
        icon: "size-10 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
