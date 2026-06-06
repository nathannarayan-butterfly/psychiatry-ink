import { prisma } from '../server/db'

async function main() {
  const count = await prisma.generationLog.count()
  console.log(`SQLite OK — GenerationLog rows: ${count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
