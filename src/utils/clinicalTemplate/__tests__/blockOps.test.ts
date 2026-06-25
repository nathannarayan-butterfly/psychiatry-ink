import { describe, expect, it } from 'vitest'
import { createBlock } from '../blockFactory'
import {
  addChildToConditional,
  findBlock,
  insertBlockAt,
  moveBlock,
  moveChildInConditional,
  removeBlock,
  updateBlock,
} from '../blockOps'
import type { ConditionalBlock, HeadingBlock, TemplateBlock } from '../../../types/clinicalTemplate'

function heading(text: string): HeadingBlock {
  return { id: text, type: 'heading', text, level: 2 }
}

describe('blockOps', () => {
  it('inserts at a clamped index', () => {
    const blocks = [heading('a'), heading('b')]
    const next = insertBlockAt(blocks, heading('x'), 1)
    expect(next.map((b) => b.id)).toEqual(['a', 'x', 'b'])
    const end = insertBlockAt(blocks, heading('y'), 99)
    expect(end[end.length - 1]!.id).toBe('y')
  })

  it('moves a top-level block', () => {
    const blocks = [heading('a'), heading('b'), heading('c')]
    expect(moveBlock(blocks, 0, 2).map((b) => b.id)).toEqual(['b', 'c', 'a'])
    expect(moveBlock(blocks, 0, 0)).toBe(blocks)
  })

  it('updates a block recursively inside a conditional', () => {
    const child = heading('child')
    const cond: ConditionalBlock = {
      id: 'cond',
      type: 'conditional',
      condition: { source: 'manual', operator: 'exists' },
      children: [child],
    }
    const blocks: TemplateBlock[] = [heading('top'), cond]
    const updated = updateBlock(blocks, 'child', { text: 'changed' } as Partial<TemplateBlock>)
    const found = findBlock(updated, 'child') as HeadingBlock
    expect(found.text).toBe('changed')
  })

  it('removes a nested block', () => {
    const cond: ConditionalBlock = {
      id: 'cond',
      type: 'conditional',
      condition: { source: 'manual', operator: 'exists' },
      children: [heading('keep'), heading('drop')],
    }
    const result = removeBlock([cond], 'drop')
    const updatedCond = result[0] as ConditionalBlock
    expect(updatedCond.children.map((c) => c.id)).toEqual(['keep'])
  })

  it('adds and reorders conditional children', () => {
    const cond = createBlock('conditional', 'de') as ConditionalBlock
    let blocks: TemplateBlock[] = [cond]
    blocks = addChildToConditional(blocks, cond.id, heading('first'))
    blocks = addChildToConditional(blocks, cond.id, heading('second'))
    let updated = blocks[0] as ConditionalBlock
    expect(updated.children.map((c) => c.id)).toEqual(['first', 'second'])
    blocks = moveChildInConditional(blocks, cond.id, 'second', -1)
    updated = blocks[0] as ConditionalBlock
    expect(updated.children.map((c) => c.id)).toEqual(['second', 'first'])
  })
})
