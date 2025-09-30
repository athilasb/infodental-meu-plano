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

    // Get customer to check default payment method
    const customer = await stripe.customers.retrieve(CUSTOMER_ID);
    const defaultPaymentMethodId = (customer as any).invoice_settings?.default_payment_method;

    console.log('💳 Default payment method ID:', defaultPaymentMethodId);

    // List all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: CUSTOMER_ID,
      type: 'card',
    });

    console.log('💳 Found', paymentMethods.data.length, 'payment method(s)');

    // Map payment methods and mark the default one
    const formattedPaymentMethods = paymentMethods.data.map(pm => {
      const isDefault = pm.id === defaultPaymentMethodId;
      console.log(`💳 Payment method ${pm.id}: isDefault = ${isDefault}`);
      return {
        id: pm.id,
        type: pm.type,
        card: pm.card,
        billing_details: pm.billing_details,
        created: pm.created,
        isDefault,
      };
    });

    return NextResponse.json({ paymentMethods: formattedPaymentMethods });
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

    console.log('🔧 Attaching payment method:', paymentMethodId, 'to customer:', CUSTOMER_ID);

    // Attach payment method to customer
    const attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: CUSTOMER_ID,
    });
    console.log('✅ Payment method attached:', attachedPaymentMethod.id);

    // Set as default payment method for customer
    console.log('🔧 Setting as default payment method for customer...');
    const updatedCustomer = await stripe.customers.update(CUSTOMER_ID, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    console.log('✅ Customer updated. Default payment method:', updatedCustomer.invoice_settings?.default_payment_method);

    // Se houver subscription ativa, atualizar o default_payment_method nela também
    console.log('🔧 Checking for active subscriptions...');
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: CUSTOMER_ID,
        status: 'active',
        limit: 10,
      });

      console.log('📋 Found', subscriptions.data.length, 'active subscription(s)');

      if (subscriptions.data.length > 0) {
        for (const sub of subscriptions.data) {
          console.log('🔧 Updating subscription:', sub.id);
          await stripe.subscriptions.update(sub.id, {
            default_payment_method: paymentMethodId,
          });
          console.log('✅ Subscription', sub.id, 'updated with default payment method');
        }
      }
    } catch (subError) {
      console.log('⚠️ Subscription update error:', subError);
    }

    console.log('✅ Payment method successfully set as default');
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

    console.log('🔄 PUT: Setting default payment method:', paymentMethodId);

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Set as default payment method for customer
    const updatedCustomer = await stripe.customers.update(CUSTOMER_ID, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    console.log('✅ Customer default payment method updated:', updatedCustomer.invoice_settings?.default_payment_method);

    // Se houver subscription ativa, atualizar também
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: CUSTOMER_ID,
        status: 'active',
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.update(sub.id, {
            default_payment_method: paymentMethodId,
          });
          console.log('✅ Subscription', sub.id, 'updated with default payment method');
        }
      }
    } catch (subError) {
      console.log('⚠️ Subscription update error:', subError);
    }

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