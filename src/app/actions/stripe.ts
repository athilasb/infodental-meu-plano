'use server';

import { stripe } from '@/lib/stripe';

export async function getCustomerData() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar dados do customer
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer foi deletado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0] || null;

    // Buscar métodos de pagamento
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Buscar o método de pagamento padrão
    const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        metadata: customer.metadata,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as any).current_period_end,
        current_period_start: (subscription as any).current_period_start,
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        discount: (subscription as any).discount,
        items: (subscription as any).items.data.map((item: any) => ({
          id: item.id,
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring,
          },
          quantity: item.quantity,
        })),
      } : null,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        isDefault: pm.id === defaultPaymentMethodId,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : null,
      })),
    };
  } catch (error) {
    console.error('Erro ao buscar dados do customer:', error);
    throw error;
  }
}

export async function updateCustomerData(data: {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: any;
}) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    await stripe.customers.update(customerId, data);

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar dados do customer:', error);
    throw error;
  }
}

export async function getInvoices() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar todas as faturas do customer
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    return {
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        amount_remaining: invoice.amount_remaining,
        status: invoice.status,
        created: invoice.created,
        due_date: invoice.due_date,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        currency: invoice.currency,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        lines: invoice.lines.data.map((line: any) => ({
          id: line.id,
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
          price: line.price ? {
            id: line.price.id,
            unit_amount: line.price.unit_amount,
            recurring: line.price.recurring,
          } : null,
        })),
        payment_intent: (invoice as any).payment_intent,
      })),
    };
  } catch (error) {
    console.error('Erro ao buscar faturas:', error);
    throw error;
  }
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao definir método de pagamento padrão:', error);
    throw error;
  }
}

export async function removePaymentMethod(paymentMethodId: string) {
  try {
    await stripe.paymentMethods.detach(paymentMethodId);

    return { success: true };
  } catch (error) {
    console.error('Erro ao remover método de pagamento:', error);
    throw error;
  }
}

export async function addPaymentMethod(paymentMethodId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Anexar método de pagamento ao customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao adicionar método de pagamento:', error);
    throw error;
  }
}

// Buscar addons disponíveis para um plano
export async function getAvailableAddons(planProductId: string = 'prod_T9AmlVw7Z608Rm') {
  try {
    // Buscar todos os preços ativos
    const allPrices = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    // Filtrar preços que são addons compatíveis com o plano
    const addonPrices = allPrices.data.filter(price => {
      const metadata = price.metadata || {};
      return metadata.type === 'addon' && metadata.compatible_with === planProductId;
    });

    // Agrupar por produto
    const addonsByProduct: { [key: string]: any[] } = {};
    for (const price of addonPrices) {
      const productId = price.product as string;
      if (!addonsByProduct[productId]) {
        addonsByProduct[productId] = [];
      }
      addonsByProduct[productId].push(price);
    }

    // Buscar informações dos produtos
    const addons = [];
    for (const [productId, prices] of Object.entries(addonsByProduct)) {
      const product = await stripe.products.retrieve(productId);
      addons.push({
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
        },
        prices: prices.map(price => ({
          id: price.id,
          nickname: price.nickname,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          metadata: price.metadata,
        })),
      });
    }

    return addons;
  } catch (error) {
    console.error('Erro ao buscar addons disponíveis:', error);
    throw error;
  }
}

export async function getStorageProduct() {
  try {
    const productId = 'prod_T9AfZhzca9pgNW';
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    // Buscar o produto
    const product = await stripe.products.retrieve(productId);

    // Buscar a subscription ativa para determinar o intervalo
    let currentInterval: { interval: string; interval_count: number } | null = null;
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,//Subscription objeto complet
        status: 'active',
        limit: 1,
      });

      const subscription = subscriptions.data[0];
      if (subscription) {
        // Pegar o intervalo do plano principal
        const mainItem = subscription.items.data.find(item =>
          item.price.product === 'prod_T9AmlVw7Z608Rm'
        );

        if (mainItem?.price.recurring) {
          currentInterval = {
            interval: mainItem.price.recurring.interval,
            interval_count: mainItem.price.recurring.interval_count,
          };
          console.log('📊 Intervalo do plano principal:', currentInterval);
        }
      }
    }

    // Buscar todos os preços deste produto que são addons
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    // Filtrar apenas os preços que são addons compatíveis e com o mesmo intervalo
    const addonPrices = prices.data.filter(price => {
      const metadata = price.metadata || {};
      const isAddon = metadata.type === 'addon' && metadata.compatible_with === 'prod_T9AmlVw7Z608Rm';

      // Se temos um intervalo atual, filtrar apenas preços com o mesmo intervalo
      if (isAddon && currentInterval && price.recurring) {
        return price.recurring.interval === currentInterval.interval &&
               price.recurring.interval_count === currentInterval.interval_count;
      }

      return isAddon;
    });

    console.log(`📦 Preços de storage filtrados: ${addonPrices.length}`);

    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
      },
      prices: addonPrices.map(price => ({
        id: price.id,
        nickname: price.nickname,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        metadata: price.metadata,
      })),
    };
  } catch (error) {
    console.error('Erro ao buscar produto de armazenamento:', error);
    throw error;
  }
}

export async function getCurrentPlan() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const productId = 'prod_T9AmlVw7Z608Rm';

    // Buscar o produto do plano
    const product = await stripe.products.retrieve(productId);

    // Buscar todos os preços deste produto
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    // Get ALL subscriptions without deep expansion
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    // Filter to get only relevant statuses
    let subscription: any = null;

    for (const sub of subscriptions.data) {
      // Only include active, trialing, past_due, or unpaid subscriptions
      if (!['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
        continue;
      }

      // Get subscription with expanded details
      subscription = await stripe.subscriptions.retrieve(sub.id, {
        expand: ['items.data.price', 'default_payment_method', 'discounts'],
      });

      // Now get product details for each item
      for (const item of subscription.items.data) {
        if (item.price.product && typeof item.price.product === 'string') {
          item.price.product = await stripe.products.retrieve(item.price.product);
        }
      }

      // Get the first valid subscription and break
      break;
    }

    // A próxima cobrança está em subscription.items.data[0].current_period_end
    // Esse campo já contém o timestamp Unix em segundos da próxima cobrança
    const nextBillingDate = subscription?.items?.data?.[0]?.current_period_end || null;

    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        metadata: product.metadata,
      },
      prices: prices.data.map(price => ({
        id: price.id,
        nickname: price.nickname,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
        metadata: price.metadata,
      })),
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_end: nextBillingDate, // Timestamp Unix em segundos
        current_period_start: subscription.items?.data?.[0]?.current_period_start || null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        discount: (() => {
          const discounts = (subscription as any).discounts;
          if (!discounts || discounts.length === 0) return null;

          const discount = discounts[0]; // Pegar o primeiro desconto
          if (!discount.coupon) return null;

          return {
            coupon: {
              id: discount.coupon.id,
              name: discount.coupon.name,
              percent_off: discount.coupon.percent_off,
              amount_off: discount.coupon.amount_off,
              currency: discount.coupon.currency,
              duration: discount.coupon.duration,
              duration_in_months: discount.coupon.duration_in_months,
            },
            // Calcular valores com desconto
            originalAmount: subscription.items.data.reduce((sum: number, item: any) => {
              return sum + (item.price.unit_amount || 0) * (item.quantity || 1);
            }, 0),
            discountAmount: (() => {
              const total = subscription.items.data.reduce((sum: number, item: any) => {
                return sum + (item.price.unit_amount || 0) * (item.quantity || 1);
              }, 0);
              const coupon = discount.coupon;
              if (coupon.percent_off) {
                return Math.round((total * coupon.percent_off) / 100);
              } else if (coupon.amount_off) {
                return coupon.amount_off;
              }
              return 0;
            })(),
            finalAmount: (() => {
              const total = subscription.items.data.reduce((sum: number, item: any) => {
                return sum + (item.price.unit_amount || 0) * (item.quantity || 1);
              }, 0);
              const coupon = discount.coupon;
              if (coupon.percent_off) {
                return total - Math.round((total * coupon.percent_off) / 100);
              } else if (coupon.amount_off) {
                return Math.max(0, total - coupon.amount_off);
              }
              return total;
            })(),
          };
        })(),
        items: subscription.items.data.map((item: any) => ({
          id: item.id,
          price: {
            id: item.price.id,
            product: typeof item.price.product === 'string' ? item.price.product : {
              id: item.price.product.id,
              name: item.price.product.name,
              description: item.price.product.description,
              metadata: item.price.product.metadata,
            },
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring ? {
              interval: item.price.recurring.interval,
              interval_count: item.price.recurring.interval_count,
            } : null,
            nickname: item.price.nickname,
            metadata: item.price.metadata || {},
          },
          quantity: item.quantity,
        })),
      } : null,
    };
  } catch (error) {
    console.error('Erro ao buscar plano atual:', error);
    throw error;
  }
}

export async function addStorageAddon(priceId: string) {
  try {
    console.log('🔧 addStorageAddon iniciado');
    console.log('📋 Price ID:', priceId);

    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    console.log('👤 Customer ID:', customerId);

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    console.log('📋 Subscriptions encontradas:', subscriptions.data.length);

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    console.log('✅ Subscription ativa:', subscription.id);
    console.log('📦 Items atuais:', subscription.items.data.map(i => ({
      id: i.id,
      product: i.price.product,
      price: i.price.id,
      nickname: i.price.nickname
    })));

    // Verificar se já existe um addon de armazenamento (produto prod_T9AfZhzca9pgNW)
    const storageProductId = 'prod_T9AfZhzca9pgNW';
    const existingStorageItem = subscription.items.data.find(item => {
      return item.price.product === storageProductId;
    });

    // Se já existe, remover o item antigo
    if (existingStorageItem) {
      console.log('🗑️  Removendo item existente:', existingStorageItem.id);
      await stripe.subscriptionItems.del(existingStorageItem.id);
      console.log('✅ Item removido');
    } else {
      console.log('ℹ️  Nenhum item de storage existente');
    }

    // Verificar o intervalo do preço do addon
    const addonPrice = await stripe.prices.retrieve(priceId);
    console.log('📊 Preço do addon:', {
      id: addonPrice.id,
      recurring: addonPrice.recurring
    });

    // Verificar o intervalo do plano principal
    const mainItem = subscription.items.data.find(item => item.price.product !== storageProductId);
    if (mainItem) {
      console.log('📊 Preço do plano principal:', {
        id: mainItem.price.id,
        recurring: mainItem.price.recurring
      });
    }

    // Adicionar o novo addon de armazenamento à subscription
    console.log('➕ Adicionando novo item de storage...');
    const newItem = await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: priceId,
      quantity: 1,
      proration_behavior: 'create_prorations',
    });

    console.log('✅ Item adicionado:', newItem.id);
    console.log('✅ addStorageAddon concluído com sucesso');

    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao adicionar addon de armazenamento:', error);
    console.error('❌ Código:', error.code);
    console.error('❌ Mensagem:', error.message);
    throw error;
  }
}

export async function removeStorageAddon() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    // Encontrar e remover o addon de armazenamento
    const storageProductId = 'prod_T9AfZhzca9pgNW';
    const storageItem = subscription.items.data.find(item => {
      return item.price.product === storageProductId;
    });

    if (storageItem) {
      await stripe.subscriptionItems.del(storageItem.id);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao remover addon de armazenamento:', error);
    throw error;
  }
}

export async function createSubscription(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Verificar se já existe uma subscription ativa
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (existingSubscriptions.data.length > 0) {
      throw new Error('Já existe uma subscription ativa');
    }

    // Buscar o customer para verificar se tem método de pagamento padrão
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer foi deletado');
    }

    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error('Nenhum método de pagamento padrão configurado');
    }

    // Criar nova subscription com cobrança imediata
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: defaultPaymentMethod as string,
      payment_behavior: 'default_incomplete', // Tenta cobrar imediatamente
    });

    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    console.error('Erro ao criar subscription:', error);
    throw error;
  }
}

export async function updateSubscription(newPriceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    // Encontrar o item do plano principal (produto prod_T9AmlVw7Z608Rm)
    const planProductId = 'prod_T9AmlVw7Z608Rm';
    const planItem = subscription.items.data.find(item => {
      return item.price.product === planProductId;
    });

    if (!planItem) {
      throw new Error('Item do plano não encontrado na subscription');
    }

    // Atualizar o item com o novo preço
    // Nota: Ao atualizar items individualmente, o Stripe aceita diferentes intervalos
    await stripe.subscriptionItems.update(planItem.id, {
      price: newPriceId,
      proration_behavior: 'create_prorations',
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar subscription:', error);
    throw error;
  }
}

export async function cancelSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    // Cancelar a subscription no final do período (cancel_at_period_end)
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    return {
      success: true,
      cancel_at: (subscription as any).current_period_end
    };
  } catch (error) {
    console.error('Erro ao cancelar subscription:', error);
    throw error;
  }
}

// Reativar subscription cancelada
export async function reactivateSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa (mesmo que agendada para cancelamento)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription encontrada');
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error('Subscription não está agendada para cancelamento');
    }

    // Remover o cancelamento agendado
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });

    return {
      success: true,
      subscription_id: subscription.id
    };
  } catch (error) {
    console.error('Erro ao reativar subscription:', error);
    throw error;
  }
}

// Validar cupom/código promocional
export async function validateCoupon(code: string) {
  try {
    // Buscar o cupom no Stripe
    const coupon = await stripe.coupons.retrieve(code);

    if (!coupon.valid) {
      throw new Error('Cupom inválido ou expirado');
    }

    return {
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
        valid: coupon.valid,
      }
    };
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      throw new Error('Cupom não encontrado');
    }
    console.error('Erro ao validar cupom:', error);
    throw error;
  }
}

// Aplicar cupom à subscription
export async function applyCouponToSubscription(couponCode: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    // Validar o cupom primeiro
    const couponValidation = await validateCoupon(couponCode);

    if (!couponValidation.success) {
      throw new Error('Cupom inválido');
    }

    // Aplicar o cupom à subscription
    await stripe.subscriptions.update(subscription.id, {
      discounts: [{ coupon: couponCode }],
    });

    return {
      success: true,
      coupon: couponValidation.coupon,
    };
  } catch (error) {
    console.error('Erro ao aplicar cupom:', error);
    throw error;
  }
}

// Remover cupom da subscription
export async function removeCouponFromSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription ativa
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error('Nenhuma subscription ativa encontrada');
    }

    // Remover o cupom
    await stripe.subscriptions.update(subscription.id, {
      discounts: [],
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Erro ao remover cupom:', error);
    throw error;
  }
}