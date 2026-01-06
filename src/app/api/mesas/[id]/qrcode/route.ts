import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import QRCode from 'qrcode'

// GET /api/mesas/[id]/qrcode - Generate QR Code for table
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const table = await prisma.table.findUnique({
      where: { id: params.id },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const tableUrl = `${baseUrl}/mesa/${table.qr_token}`

    // Generate QR Code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(tableUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      url: tableUrl,
      label: table.label,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
