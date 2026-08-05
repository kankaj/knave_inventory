import type { ReactNode } from 'react'

/**
 * The sheet's marks are drawn, never typed: emoji render as somebody else's
 * artwork — a different one per platform — which breaks a printed page, and a
 * screen reader announces "see-no-evil monkey" where a label belongs. Every
 * glyph here is a stroked path in the current ink colour, sized in `em` so it
 * follows the type size of the button carrying it.
 *
 * All of them are decorative: the button around them supplies the name.
 */

type IconProps = {
  /** Multiplier on the button's own font size. */
  size?: number
}

function Svg({ size = 1, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={`${size}em`}
      height={`${size}em`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="k-icon"
    >
      {children}
    </svg>
  )
}

/** Three rules stacked: the way back to the list of journals. */
export function IconList(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

/** An open eye: the sheet lies on the table for everyone. */
export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Svg>
  )
}

/** The same eye struck through: the sheet is back in the GM's folder. */
export function IconEyeOff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.4 8.2A17 17 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconMinus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

/** An arrow leaving the page: the room written out to a file. */
export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Svg>
  )
}

/** The same arrow turned around: a file read back into the room. */
export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Svg>
  )
}

/** A chest with its lid: the GM's pile of loot. */
export function IconChest(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5A3.5 3.5 0 0 1 6.5 7h11A3.5 3.5 0 0 1 21 10.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M3 12h18" />
      <path d="M10.5 12v3h3v-3" />
    </Svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7" />
    </Svg>
  )
}

/** A hand closing on the sheet: taking it over. */
export function IconClaim(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21a7 7 0 0 0 7-7v-3.5a1.3 1.3 0 0 0-2.6 0" />
      <path d="M16.4 10.5V8a1.3 1.3 0 0 0-2.6 0v2.5" />
      <path d="M13.8 10.5V6.3a1.3 1.3 0 0 0-2.6 0v4.2" />
      <path d="M11.2 10.5V8.2a1.3 1.3 0 0 0-2.6 0v6.1l-1.5-1.7a1.3 1.3 0 0 0-2 1.6L7.8 19" />
    </Svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </Svg>
  )
}
