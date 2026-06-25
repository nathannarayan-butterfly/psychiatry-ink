import type { TemplateBlock } from '../../types/clinicalTemplate'

/** Recursively update a block by id (descends into conditional children). */
export function updateBlock(
  blocks: TemplateBlock[],
  id: string,
  patch: Partial<TemplateBlock>,
): TemplateBlock[] {
  return blocks.map((block) => {
    if (block.id === id) {
      return { ...block, ...patch } as TemplateBlock
    }
    if (block.type === 'conditional') {
      return { ...block, children: updateBlock(block.children, id, patch) }
    }
    return block
  })
}

/** Recursively remove a block by id. */
export function removeBlock(blocks: TemplateBlock[], id: string): TemplateBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.type === 'conditional' ? { ...block, children: removeBlock(block.children, id) } : block,
    )
}

/** Find a block anywhere in the tree. */
export function findBlock(blocks: TemplateBlock[], id: string): TemplateBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block
    if (block.type === 'conditional') {
      const nested = findBlock(block.children, id)
      if (nested) return nested
    }
  }
  return null
}

/** Insert a block at a top-level index. */
export function insertBlockAt(
  blocks: TemplateBlock[],
  block: TemplateBlock,
  index: number,
): TemplateBlock[] {
  const next = [...blocks]
  const clamped = Math.max(0, Math.min(index, next.length))
  next.splice(clamped, 0, block)
  return next
}

/** Move a top-level block from one index to another. */
export function moveBlock(blocks: TemplateBlock[], from: number, to: number): TemplateBlock[] {
  if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length || from === to) {
    return blocks
  }
  const next = [...blocks]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  return next
}

/** Append a child to a conditional block. */
export function addChildToConditional(
  blocks: TemplateBlock[],
  conditionalId: string,
  child: TemplateBlock,
): TemplateBlock[] {
  return blocks.map((block) =>
    block.id === conditionalId && block.type === 'conditional'
      ? { ...block, children: [...block.children, child] }
      : block,
  )
}

/** Move a conditional child up (-1) or down (+1). */
export function moveChildInConditional(
  blocks: TemplateBlock[],
  conditionalId: string,
  childId: string,
  direction: -1 | 1,
): TemplateBlock[] {
  return blocks.map((block) => {
    if (block.id !== conditionalId || block.type !== 'conditional') return block
    const idx = block.children.findIndex((c) => c.id === childId)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= block.children.length) return block
    return { ...block, children: moveBlock(block.children, idx, target) }
  })
}
