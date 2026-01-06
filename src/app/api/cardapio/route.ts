import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/cardapio - Cardápio público (apenas itens ativos)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: {
        items: {
          where: { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name_pt: true,
            name_es: true,
            name_en: true,
            description_pt: true,
            description_es: true,
            description_en: true,
            price: true,
            image_url: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Filter out empty categories
    const nonEmptyCategories = categories.filter(cat => cat.items.length > 0)

    return NextResponse.json(nonEmptyCategories)
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
