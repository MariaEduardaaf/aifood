import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createCallSchema = z.object({
  tableId: z.string(),
  type: z.enum(['CALL_WAITER', 'REQUEST_BILL']),
})

// Rate limit storage (in-memory for MVP, use Redis in production)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_SECONDS = 30

// POST /api/chamado - Create new call (public, rate limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createCallSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 })
    }

    const { tableId, type } = validation.data

    // Check if table exists and is active
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    if (!table.active) {
      return NextResponse.json({ error: 'Table is inactive' }, { status: 400 })
    }

    // Rate limiting by table
    const rateLimitKey = `${tableId}-${type}`
    const lastCallTime = rateLimitMap.get(rateLimitKey)
    const now = Date.now()

    if (lastCallTime) {
      const secondsSinceLastCall = (now - lastCallTime) / 1000
      if (secondsSinceLastCall < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastCall)
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            waitTime,
            message: `Aguarde ${waitTime} segundos antes de fazer um novo chamado`
          },
          { status: 429 }
        )
      }
    }

    // Check if there's already an open call of the same type for this table
    const existingCall = await prisma.call.findFirst({
      where: {
        table_id: tableId,
        type,
        status: 'OPEN',
      },
    })

    if (existingCall) {
      return NextResponse.json({
        message: 'Já existe um chamado em aberto',
        call: existingCall,
      })
    }

    // Create the call
    const call = await prisma.call.create({
      data: {
        table_id: tableId,
        type,
        status: 'OPEN',
      },
      include: {
        table: {
          select: {
            label: true,
          }
        }
      }
    })

    // Update rate limit
    rateLimitMap.set(rateLimitKey, now)

    // Clean up old rate limit entries (optional, prevents memory leak)
    setTimeout(() => {
      rateLimitMap.delete(rateLimitKey)
    }, RATE_LIMIT_SECONDS * 1000)

    return NextResponse.json(call, { status: 201 })
  } catch (error) {
    console.error('Error creating call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
