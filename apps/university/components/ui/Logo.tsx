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
  let logoSrc = "/images/logo-black.png" // default for light theme
  
  if (variant === "white") {
    logoSrc = "/images/logo-white.png"
  } else if (variant === "black") {
    logoSrc = "/images/logo-black.png"
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

