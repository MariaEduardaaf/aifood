import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aifood.com' },
    update: {},
    create: {
      email: 'admin@aifood.com',
      password_hash: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('Created admin user:', admin.email)

  // Create waiter user
  const waiterPassword = await hash('garcom123', 12)
  const waiter = await prisma.user.upsert({
    where: { email: 'garcom@aifood.com' },
    update: {},
    create: {
      email: 'garcom@aifood.com',
      password_hash: waiterPassword,
      name: 'Garçom Demo',
      role: 'WAITER',
      active: true,
    },
  })
  console.log('Created waiter user:', waiter.email)

  // Create sample tables
  const tables = []
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.table.upsert({
      where: { id: `table-${i}` },
      update: {},
      create: {
        id: `table-${i}`,
        label: `Mesa ${i}`,
        active: true,
      },
    })
    tables.push(table)
  }
  console.log(`Created ${tables.length} tables`)

  console.log('Seeding completed!')
  console.log('\n--- Login Credentials ---')
  console.log('Admin: admin@aifood.com / admin123')
  console.log('Garçom: garcom@aifood.com / garcom123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
