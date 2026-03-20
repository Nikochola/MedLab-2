import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva("rounded-[1.6rem] border-2 text-card-foreground", {
  variants: {
    variant: {
      default:
        "border-[#d9e8bf] bg-white shadow-[0_6px_0_#dce8c7] dark:border-[#4f5668] dark:bg-[#2f343d] dark:shadow-none",
      journeyPanel:
        "border-[#d9e8bf] bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(244,253,234,0.96))] p-5 shadow-[0_10px_0_#dce8c7] md:p-7 dark:border-[#4e5668] dark:bg-[linear-gradient(160deg,rgba(55,60,70,0.95),rgba(47,52,61,0.95))] dark:shadow-none",
      journeyControl:
        "border-[#d9e8bf] bg-white/90 p-4 shadow-[0_6px_0_#dce8c7] backdrop-blur dark:border-[#4e5566] dark:bg-[#343942]/90 dark:shadow-none",
      journeyNode:
        "border-[#d8e7bf] bg-white/95 px-3 py-2 shadow-[0_4px_0_#dce8c7] dark:border-[#4f5668] dark:bg-[#2f343d]/95 dark:shadow-none",
      journeyStat:
        "border-[#d8e7bf] bg-[#f8ffe9] px-4 py-2 shadow-[0_4px_0_#dce8c7] dark:border-[#4f5668] dark:bg-[#2f343d] dark:shadow-none",
      conceptShell:
        "border-[#ddd7cf] bg-[linear-gradient(155deg,rgba(250,248,245,0.98),rgba(239,233,226,0.92))] p-6 shadow-[0_10px_0_#d8d2ca] dark:border-[#4c5262] dark:bg-[linear-gradient(155deg,rgba(51,55,64,0.97),rgba(43,47,55,0.93))] dark:shadow-none",
      conceptPanel:
        "border-[#e0d9d0] bg-white/95 p-5 shadow-[0_8px_0_#ddd5cc] backdrop-blur dark:border-[#505867] dark:bg-[#303642]/95 dark:shadow-none",
      conceptWidget:
        "border-[#d8dce5] bg-[#f8fafd] p-4 shadow-[0_5px_0_#dce1ea] dark:border-[#4f5668] dark:bg-[#2f3540] dark:shadow-none",
      conceptInset:
        "border-[#e2dcd4] bg-[#efe8e2] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-[#4d5362] dark:bg-[#2b3038]",
      conceptFloating:
        "border-[#e2dde0] bg-white/95 p-5 shadow-[0_16px_40px_-20px_rgba(22,25,33,0.2)] backdrop-blur dark:border-[#555e6f] dark:bg-[#2f3540]/95 dark:shadow-none",
      navDropdown: "rounded-xl border-slate-200 bg-white p-0 shadow-none"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
