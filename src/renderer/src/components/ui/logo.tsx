import { motion } from "motion/react"
import { cn } from "@/utils"

interface LogoProps {
  className?: string
  fill?: string
  animate?: boolean
}

const leaf =
  "M100,100 C62,72 48,28 75,10 C88,0 98,12 100,26 C102,12 112,0 125,10 C152,28 138,72 100,100Z"

export function Logo({
  fill = "currentColor",
  className,
  animate = true,
}: LogoProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      aria-label="Clover logo"
      animate={animate ? { rotate: 360 } : undefined}
      transition={
        animate
          ? { repeat: Infinity, duration: 6, ease: "linear" }
          : undefined
      }
    >
      <g transform="rotate(-45, 100, 100)">
        <path d={leaf} fill={fill} />
        <path d={leaf} fill={fill} transform="rotate(90, 100, 100)" />
        <path d={leaf} fill={fill} transform="rotate(180, 100, 100)" />
        <path d={leaf} fill={fill} transform="rotate(270, 100, 100)" />
      </g>
    </motion.svg>
  )
}
