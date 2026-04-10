import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[3px] active:shadow-none cursor-pointer",
    {
        variants: {
            variant: {
                // Blue button — use on light backgrounds
                default:
                    "bg-[#0066FF] text-white border-[1.5px] border-[#0047CC] shadow-[0_3px_0_#0047CC] rounded-[9px] hover:brightness-110",
                secondary:
                    "bg-secondary text-secondary-foreground border border-border rounded-[9px] hover:bg-secondary/80 shadow-none active:translate-y-0",
                // Light button — use on light backgrounds
                outline:
                    "bg-[#F8F7F2] text-[#0E0F12] border-[1.5px] border-[#D8D5CC] shadow-[0_3px_0_#D8D5CC] rounded-[9px] hover:bg-[#F0EDE6]",
                // Translucent white — use on dark (#0E0F12) backgrounds
                "ghost-dark":
                    "bg-white/[0.06] text-white/75 border-[1.5px] border-white/[0.12] rounded-[9px] hover:bg-white/10 shadow-none active:shadow-none active:translate-y-0",
                // White button — use on blue (#0066FF) backgrounds
                white:
                    "bg-white text-[#0047CC] border-[1.5px] border-white/30 shadow-[0_3px_0_rgba(0,0,0,0.15)] rounded-[9px] hover:brightness-95 font-bold",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
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
