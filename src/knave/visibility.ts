import type { Profile } from './types'

/**
 * Whether a profile belongs in this viewer's list. A hidden profile is a
 * GM's private fixture — not real access control, since room metadata itself
 * stays readable to every connected client regardless.
 */
export function isVisibleToViewer(profile: Profile, isGM: boolean): boolean {
  return isGM || !profile.hidden
}
