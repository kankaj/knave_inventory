import { describe, expect, it } from 'vitest'
import { compareProfiles, type Orderable } from './ordering'

function sheet(id: string, ownerName: string, createdAt: number): Orderable {
  return { profile: { id, ownerName, createdAt } }
}

function order(...list: Orderable[]): string[] {
  return [...list].sort(compareProfiles).map((item) => item.profile.id)
}

describe('compareProfiles', () => {
  it('groups sheets by their owner', () => {
    expect(
      order(
        sheet('bohus-1', 'Bohuš', 3000),
        sheet('jarmila-1', 'Jarmila', 1000),
        sheet('bohus-2', 'Bohuš', 4000),
      ),
    ).toEqual(['bohus-1', 'bohus-2', 'jarmila-1'])
  })

  it('puts the oldest sheet of one owner on top', () => {
    expect(
      order(
        sheet('new', 'Bohuš', 3000),
        sheet('oldest', 'Bohuš', 1000),
        sheet('middle', 'Bohuš', 2000),
      ),
    ).toEqual(['oldest', 'middle', 'new'])
  })

  it('sinks sheets nobody owns to the bottom', () => {
    expect(order(sheet('loose', '', 1), sheet('held', 'Jarmila', 9000))).toEqual(
      ['held', 'loose'],
    )
  })

  it('ignores case and diacritics in owner names', () => {
    expect(order(sheet('b', 'bohuš', 1), sheet('a', 'Adéla', 2))).toEqual([
      'a',
      'b',
    ])
  })

  it('is stable for sheets with the same owner and timestamp', () => {
    // Sheets written before the timestamp existed all carry createdAt 0.
    expect(order(sheet('b', 'Bohuš', 0), sheet('a', 'Bohuš', 0))).toEqual([
      'a',
      'b',
    ])
  })
})
