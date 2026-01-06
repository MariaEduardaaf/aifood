import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/mesa/[token] - Get table data by QR token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const table = await prisma.table.findUnique({
      where: { qr_token: params.token },
      select: {
        id: true,
        label: true,
        active: true,
      }
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    if (!table.active) {
      return NextResponse.json({ error: 'Table is inactive' }, { status: 400 })
    }

    // Check for open calls for this table
    const openCalls = await prisma.call.findMany({
      where: {
        table_id: table.id,
        status: 'OPEN',
      },
      select: {
        id: true,
        type: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({
      id: table.id,
      label: table.label,
      openCalls,
    })
  } catch (error) {
    console.error('Error fetching table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
