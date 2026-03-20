import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "h-10 rounded-md border border-input bg-white px-3 py-2 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        concept:
          "h-11 rounded-[1rem] border-2 border-[#d8dde7] bg-[#f7f9fc] px-3.5 py-2.5 text-[#2f3a4a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus-visible:ring-[#3f4a5b] dark:border-[#505868] dark:bg-[#2f3540] dark:text-[#e0e8f3] dark:placeholder:text-[#9da8b8]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return <input type={type} className={cn(inputVariants({ variant }), className)} ref={ref} {...props} />
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
