import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      default: "h-10 rounded-md bg-muted p-1 text-muted-foreground",
      concept: "h-12 rounded-[1.2rem] border-2 border-[#ddd7cf] bg-[#ede8e2] p-1.5 text-[#606777] dark:border-[#4f5668] dark:bg-[#333944] dark:text-[#c8d1df]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-sm px-3 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        concept:
          "rounded-[0.95rem] border-2 border-transparent px-4 py-2 text-sm font-extrabold data-[state=active]:border-[#20232a] data-[state=active]:bg-[#111318] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_#2a2f38] dark:data-[state=active]:border-[#e0e6ef] dark:data-[state=active]:bg-[#e5ecf6] dark:data-[state=active]:text-[#1f2228] dark:data-[state=active]:shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const tabsContentVariants = cva("ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", {
  variants: {
    variant: {
      default: "mt-2",
      concept: "mt-3 rounded-[1.1rem] border-2 border-[#d8dce5] bg-[#f8fafd] p-4 dark:border-[#4f5668] dark:bg-[#2f3540]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>,
    VariantProps<typeof tabsContentVariants> {}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(tabsContentVariants({ variant }), className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
