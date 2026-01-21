import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white/90 text-slate-900 border border-border/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300",
        bug:
          "bg-white/90 text-amber-600 border border-amber-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-400",
        tritary:
          "bg-gradient-to-r from-sky-500 to-blue-600 text-white border border-transparent shadow-sm hover:shadow-md hover:-translate-y-0.5",
        destructive:
          "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5",
        outline:
          "border border-border bg-white/70 hover:bg-white hover:shadow-sm hover:-translate-y-0.5",
        secondary:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-slate-100/80 hover:text-slate-900",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
        rounded: "rounded-full",
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
