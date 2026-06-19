import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[3px] active:shadow-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#0066FF] text-white border-[1.5px] border-[#0047CC] shadow-[0_3px_0_#0047CC] rounded-[9px]",
        outline:
          "bg-[#F8F7F2] text-[#0E0F12] border-[1.5px] border-[#D8D5CC] shadow-[0_3px_0_#D8D5CC] rounded-[9px]",
        muted:
          "bg-[#C5C3BB] text-white border-[1.5px] border-[#A8A69F] shadow-[0_3px_0_#A8A69F] rounded-[9px]",
        success:
          "bg-[#58CC02] text-white border-[1.5px] border-[#58A700] shadow-[0_3px_0_#58A700] rounded-[9px]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:translate-y-0 active:shadow-none",
        link:
          "text-primary underline-offset-4 hover:underline active:translate-y-0 active:shadow-none",
      },
      size: {
        default: "px-[30px] py-[13px] text-base",
        sm: "px-5 py-2 text-sm rounded-[9px]",
        lg: "px-9 py-[15px] text-base rounded-[9px]",
        icon: "h-10 w-10",
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
