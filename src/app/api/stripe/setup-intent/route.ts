import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const CUSTOMER_ID = process.env.STRIPE_CUSTOMER_ID;

export async function POST(request: NextRequest) {
  try {
    if (!CUSTOMER_ID) {
      return NextResponse.json(
        { error: 'Customer ID not configured' },
        { status: 500 }
      );
    }

    // Criar um SetupIntent para adicionar método de pagamento
    const setupIntent = await stripe.setupIntents.create({
      customer: CUSTOMER_ID,
      payment_method_types: ['card'],
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
