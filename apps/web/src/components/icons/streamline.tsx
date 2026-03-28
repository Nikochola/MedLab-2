/**
 * Streamline free icons used for stat display.
 *
 * Flame  — Block Free family  (no Plump Solid flame exists in the free tier)
 * Diamond — Plump Solid, money-shopping/diamond-1
 * StarCircle — Plump Solid, interface-essential/star-circle
 *
 * All accept `size` (px) and `color` props and render as inline SVG.
 */

interface IconProps {
  size?: number
  color?: string
  className?: string
}

/** Streamline Block Free — fire / flame */
export function StreamlineFlame({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0S1 3.5 1 9c0 3.866 3.13401 7 7 7 3.866 0 7-3.134 7-7 0-3.31489-2.5428-5.90327-4.5633-7.43673L8.00001 4 8 0ZM5.74951 11.8125C5.74951 10.0938 7.99974 9 7.99974 9S10.25 10.0938 10.25 11.8125C10.25 13.0206 9.24251 14 7.99974 14s-2.25023-.9794-2.25023-2.1875Z"
      />
    </svg>
  )
}

/** Streamline Plump Solid — diamond-1 */
export function StreamlineDiamond({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <path fill={color} d="M11.0861 5.5h6.0714l-2.8633 13H1.34277c.09468-.4201.25102-.8316.47083-1.2213l5.35314-9.48964C7.96453 6.37478 9.46237 5.5 11.0861 5.5Z" />
      <path fill={color} d="M1.7066 21.5c.21221.4252.4945.8217.84442 1.1716L20.7549 40.8755 14.4125 21.5H1.7066Z" />
      <path fill={color} d="m17.5691 21.5 6.4307 19.6452L30.4304 21.5H17.5691Z" />
      <path fill={color} d="m33.5871 21.5-6.3433 19.3782 18.2066-18.2066c.3499-.3499.6322-.7464.8444-1.1716H33.5871Z" />
      <path fill={color} d="M46.6586 18.5H33.7053l-2.8633-13h6.0733c1.6238 0 3.1216.87478 3.9194 2.28905l5.3531 9.48965c.2198.3897.3762.8012.4708 1.2213Z" />
      <path fill={color} d="M30.6334 18.5H17.3661l2.8633-13h7.5407l2.8633 13Z" />
    </svg>
  )
}

/** Streamline Plump Solid — star-circle */
export function StreamlineStarCircle({ size = 16, color = "currentColor", className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 1.5C11.574 1.5 1.5 11.574 1.5 24S11.574 46.5 24 46.5 46.5 36.426 46.5 24 36.426 1.5 24 1.5Zm4.586 16.341-2.81-5.418c-.747-1.439-2.805-1.439-3.551 0l-2.81 5.418-5.96 1.174c-1.522.3-2.138 2.145-1.1 3.3l4.225 4.698-.776 6.288c-.195 1.584 1.45 2.747 2.878 2.035L24 32.68l5.318 2.655c1.427.712 3.073-.451 2.878-2.035l-.776-6.288 4.225-4.699c1.038-1.154.422-3-1.1-3.3l-5.96-1.173Z"
      />
    </svg>
  )
}
