"use client"

import Image from "next/image"

interface LogoProps {
  variant?: "white" | "black" | "auto"
  className?: string
  width?: number
  height?: number
}

export function Logo({ variant = "auto", className = "", width = 120, height = 40 }: LogoProps) {
  // Determine which logo to show
  let logoSrc = "/images/logo_black.svg" // default for light theme
  
  if (variant === "white") {
    // Assuming a white version exists or falling back if not. 
    // Given the specific request "Use the logo in public/images/logo_black.svg", 
    // I will set the default and black variant to this.
    // If white is requested, I'll keep the old one or look for logo_white.svg? 
    // I'll stick to the requested file for default/black.
    logoSrc = "/images/logo-white.png" 
  } else if (variant === "black") {
    logoSrc = "/images/logo_black.svg"
  }
  // For auto, default to black (light theme)

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="MedLab Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  )
}

