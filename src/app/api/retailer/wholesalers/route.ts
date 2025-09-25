import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id

    // Get all wholesalers associated with this retailer
    const retailers = await db.retailer.findMany({
      where: {
        userId: retailerId
      },
      include: {
        wholesalers: {
          include: {
            wholesaler: true
          }
        }
      }
    })

    if (!retailers || retailers.length === 0) {
      return NextResponse.json({ 
        wholesalers: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Extract unique wholesalers from all retailer profiles
    const uniqueWholesalers = new Map()
    
    retailers.forEach(retailer => {
      retailer.wholesalers.forEach(wholesalerAssociation => {
        if (!uniqueWholesalers.has(wholesalerAssociation.wholesalerId)) {
          uniqueWholesalers.set(wholesalerAssociation.wholesalerId, {
            id: wholesalerAssociation.wholesaler.id,
            name: wholesalerAssociation.wholesaler.name,
            email: wholesalerAssociation.wholesaler.email,
            phone: wholesalerAssociation.wholesaler.phone
          })
        }
      })
    })

    const wholesalersList = Array.from(uniqueWholesalers.values())

    return NextResponse.json({
      wholesalers: wholesalersList,
      count: wholesalersList.length
    })

  } catch (error) {
    console.error('Error fetching wholesalers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers' },
      { status: 500 }
    )
  }
}