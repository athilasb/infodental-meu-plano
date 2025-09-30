import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const CUSTOMER_ID = process.env.STRIPE_CUSTOMER_ID;

export async function GET(request: NextRequest) {
  try {
    if (!CUSTOMER_ID) {
      return NextResponse.json(
        { error: 'Customer ID not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific payment method
      const paymentMethod = await stripe.paymentMethods.retrieve(id);
      return NextResponse.json({ paymentMethod });
    }

    // List all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: CUSTOMER_ID,
      type: 'card',
    });

    return NextResponse.json({ paymentMethods: paymentMethods.data });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!CUSTOMER_ID) {
      return NextResponse.json(
        { error: 'Customer ID not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: CUSTOMER_ID,
    });

    // Set as default payment method
    await stripe.customers.update(CUSTOMER_ID, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!CUSTOMER_ID) {
      return NextResponse.json(
        { error: 'Customer ID not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Set as default payment method
    await stripe.customers.update(CUSTOMER_ID, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set default payment method' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Detach payment method
    await stripe.paymentMethods.detach(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}