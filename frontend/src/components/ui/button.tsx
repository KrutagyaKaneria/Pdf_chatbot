import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "glass" | "gradient" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    
    const variants = {
        default: "bg-surface-container-high text-on-surface hover:bg-surface-bright border border-white/5",
        ghost: "hover:bg-white/5 text-slate-400 hover:text-slate-200",
        glass: "bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-on-surface",
        gradient: "bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:shadow-[0_0_15px_rgba(172,199,255,0.3)] border-none font-bold",
        outline: "border border-outline-variant text-on-surface hover:bg-white/5"
    }

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-full px-3 text-xs",
        lg: "h-11 rounded-full px-8 text-sm",
        icon: "h-10 w-10 flex items-center justify-center rounded-full"
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
