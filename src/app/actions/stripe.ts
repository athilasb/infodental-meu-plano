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
        items: await Promise.all((subscription as any).items.data.map(async (item: any) => {
          // Buscar informações do produto para obter metadata
          const price = await stripe.prices.retrieve(item.price.id, {
            expand: ['product']
          });
          const product = price.product as any;

          return {
            id: item.id,
            price: {
              id: item.price.id,
              unit_amount: item.price.unit_amount,
              recurring: item.price.recurring,
              metadata: price.metadata,
            },
            product: {
              id: product.id,
              name: product.name,
              metadata: product.metadata,
            },
            quantity: item.quantity,
          };
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

    // Buscar o produto
    const product = await stripe.products.retrieve(productId);

    // Buscar TODOS os preços ativos deste produto
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    // Retornar TODOS os preços ativos (sem filtro)
    // Storage agora é subscription separada
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
    };
  } catch (error) {
    console.error('Erro ao buscar produto de armazenamento:', error);
    throw error;
  }
}

/**
 * Verifica se o customer tem um plano principal ativo
 */
export async function hasActivePlan(): Promise<boolean> {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      return false;
    }

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    // Verificar se existe subscription ativa com o plano principal
    for (const sub of subscriptions.data) {
      if (!['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
        continue;
      }

      const hasMainPlan = sub.items.data.some(item => item.price.product === mainPlanProductId);
      if (hasMainPlan) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar plano ativo:', error);
    return false;
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

    // Filter to get only relevant statuses and ONLY the main plan subscription
    let subscription: any = null;
    const mainPlanProductId = productId; // 'prod_T9AmlVw7Z608Rm'

    for (const sub of subscriptions.data) {
      // Only include active, trialing, past_due, or unpaid subscriptions
      if (!['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
        continue;
      }

      // Check if this subscription has the main plan product
      const hasMainPlan = sub.items.data.some(item => item.price.product === mainPlanProductId);

      if (!hasMainPlan) {
        // Skip subscriptions that are not the main plan (storage, infozap, etc)
        continue;
      }

      // Get subscription with expanded details
      subscription = await stripe.subscriptions.retrieve(sub.id, {
        expand: ['items.data.price', 'default_payment_method', 'discount.coupon', 'discounts'],
      });

      // Now get product details for each item
      for (const item of subscription.items.data) {
        if (item.price.product && typeof item.price.product === 'string') {
          item.price.product = await stripe.products.retrieve(item.price.product);
        }
      }

      // Found the main plan subscription, break
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
          // Suportar tanto subscription.discount quanto subscription.discounts
          const discounts = (subscription as any).discounts;
          const singleDiscount = (subscription as any).discount;

          let discount = null;

          // Verificar se tem discounts (plural - array)
          if (discounts && discounts.length > 0) {
            discount = discounts[0]; // Pegar o primeiro desconto
          }
          // Verificar se tem discount (singular - objeto)
          else if (singleDiscount) {
            discount = singleDiscount;
          }

          if (!discount || !discount.coupon) return null;

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
              // Buscar o item do plano principal (primeiro item da subscription)
              const mainPlanItem = subscription.items.data[0];
              if (!mainPlanItem) return 0;

              const itemTotal = (mainPlanItem.price.unit_amount || 0) * (mainPlanItem.quantity || 1);
              const coupon = discount.coupon;

              if (coupon.percent_off) {
                return Math.round((itemTotal * coupon.percent_off) / 100);
              } else if (coupon.amount_off) {
                return coupon.amount_off;
              }
              return 0;
            })(),
            finalAmount: (() => {
              const total = subscription.items.data.reduce((sum: number, item: any) => {
                return sum + (item.price.unit_amount || 0) * (item.quantity || 1);
              }, 0);

              // Calcular desconto apenas no plano principal
              const mainPlanItem = subscription.items.data[0];
              if (!mainPlanItem) return total;

              const itemTotal = (mainPlanItem.price.unit_amount || 0) * (mainPlanItem.quantity || 1);
              const coupon = discount.coupon;
              let discountAmount = 0;

              if (coupon.percent_off) {
                discountAmount = Math.round((itemTotal * coupon.percent_off) / 100);
              } else if (coupon.amount_off) {
                discountAmount = coupon.amount_off;
              }

              return total - discountAmount;
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

export async function getUpcomingInvoice() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar a próxima fatura usando fetch diretamente com expand
    const response = await fetch(`https://api.stripe.com/v1/invoices/upcoming?customer=${customerId}&expand[]=lines.data.price.product`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Se retornar 404, significa que não há próxima fatura (sem subscriptions ativas)
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.statusText}`);
    }

    const upcomingInvoice = await response.json();

    return {
      id: upcomingInvoice.id,
      amount_due: upcomingInvoice.amount_due,
      amount_paid: upcomingInvoice.amount_paid,
      amount_remaining: upcomingInvoice.amount_remaining,
      subtotal: upcomingInvoice.subtotal,
      total: upcomingInvoice.total,
      tax: upcomingInvoice.tax,
      total_discount_amounts: upcomingInvoice.total_discount_amounts,
      starting_balance: upcomingInvoice.starting_balance,
      ending_balance: upcomingInvoice.ending_balance,
      period_start: upcomingInvoice.period_start,
      period_end: upcomingInvoice.period_end,
      lines: upcomingInvoice.lines.data.map((line: any) => {
        // Extrair nome do produto
        let productName = 'Item';
        if (line.price?.product) {
          if (typeof line.price.product === 'string') {
            productName = line.price.product;
          } else {
            productName = line.price.product.name || 'Item';
          }
        } else if (line.description) {
          // Tentar extrair nome da descrição
          productName = line.description.split('(')[0].trim();
        }

        return {
          id: line.id,
          description: line.description,
          productName,
          amount: line.amount,
          quantity: line.quantity || 1,
          unit_amount: line.price?.unit_amount || line.amount,
          period: {
            start: line.period.start,
            end: line.period.end,
          },
          proration: line.proration,
          type: line.type,
        };
      }),
      discounts: upcomingInvoice.discounts || [],
    };
  } catch (error) {
    console.error('Erro ao buscar próxima fatura:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Use addOrChangeStoragePlan() ao invés
 * Mantido para compatibilidade com código existente
 * Agora chama addOrChangeStoragePlan() para funcionar tanto para adicionar quanto alterar
 */
export async function addStorageAddon(priceId: string) {
  console.warn('⚠️ addStorageAddon está deprecated. Use addOrChangeStoragePlan()');

  // Redirecionar para a função inteligente que adiciona OU altera
  return await addOrChangeStoragePlan(priceId);
}

/**
 * DEPRECATED: Use removeStorageAddonFromSubscription() ao invés
 * Mantido para compatibilidade com código existente
 */
export async function removeStorageAddon() {
  console.warn('⚠️ removeStorageAddon está deprecated. Use removeStorageAddonFromSubscription()');

  // Redirecionar para a nova função que remove o add-on da subscription principal
  return await removeStorageAddonFromSubscription();
}

export async function createSubscription(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const planProductId = 'prod_T9AmlVw7Z608Rm';

    // Verificar se já existe uma subscription do plano principal ativa
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    const existingMainPlan = existingSubscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === planProductId)
    );

    if (existingMainPlan) {
      throw new Error('Já existe uma subscription do plano principal ativa');
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
      payment_behavior: 'error_if_incomplete', // Cobra imediatamente e retorna erro se falhar
      expand: ['latest_invoice.payment_intent'],
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

    const planProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar TODAS as subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar a subscription do plano principal
    const subscription = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === planProductId)
    );

    if (!subscription) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }

    // Encontrar o item do plano principal dentro da subscription
    const planItem = subscription.items.data.find(item => {
      return item.price.product === planProductId;
    });

    if (!planItem) {
      throw new Error('Item do plano não encontrado na subscription');
    }
    // Nota: Ao atualizar items individualmente, o Stripe aceita diferentes intervalos
    await stripe.subscriptionItems.update(planItem.id, {
      price: newPriceId,
      proration_behavior: 'create_prorations', // Cobra proporcionalmente pela mudança
    });
    // Buscar a subscription atualizada para verificar o status
    const updatedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['latest_invoice'],
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

    const planProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar TODAS as subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar a subscription do plano principal
    const subscription = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === planProductId)
    );

    if (!subscription) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
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

    const planProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar TODAS as subscriptions ativas (mesmo que agendadas para cancelamento)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar a subscription do plano principal
    const subscription = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === planProductId)
    );

    if (!subscription) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
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

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar TODAS as subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar a subscription do plano principal
    const mainPlanSubscription = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === mainPlanProductId)
    );

    if (!mainPlanSubscription) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }

    // Validar o cupom primeiro
    const couponValidation = await validateCoupon(couponCode);

    if (!couponValidation.success) {
      throw new Error('Cupom inválido');
    }

    // Aplicar o cupom à subscription do plano principal
    await stripe.subscriptions.update(mainPlanSubscription.id, {
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

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar TODAS as subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar a subscription do plano principal
    const mainPlanSubscription = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === mainPlanProductId)
    );

    if (!mainPlanSubscription) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }

    // Remover o cupom da subscription do plano principal
    await stripe.subscriptions.update(mainPlanSubscription.id, {
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

// ==========================================
// FLEXIBLE BILLING MODE
// ==========================================

/**
 * Migra uma subscription para flexible billing mode
 * Isso permite adicionar items com diferentes intervalos de cobrança
 * Necessário para subscriptions criadas antes da API version 2025-06-30.basil
 */
export async function migrateToFlexibleBilling(subscriptionId: string) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Secret Key não configurado');
    }


    // Usar API REST diretamente para migrar para flexible billing
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-08-27.basil',
      },
      body: new URLSearchParams({
        'metadata[billing_mode]': 'flexible',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao migrar:', error);
      throw new Error(error.error?.message || 'Erro ao migrar para flexible billing');
    }

    const subscription = await response.json();

    return {
      success: true,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error('Erro ao migrar para flexible billing:', error);
    throw error;
  }
}

/**
 * Cancela subscriptions incompletas (status: incomplete ou incomplete_expired)
 * Útil para limpar subscriptions que ficaram em aberto
 */
export async function cancelIncompleteSubscriptions() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscriptions incompletas
    const incompleteSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'incomplete',
      limit: 100,
    });

    const expiredSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'incomplete_expired',
      limit: 100,
    });

    const allIncomplete = [
      ...incompleteSubscriptions.data,
      ...expiredSubscriptions.data,
    ];

    // Cancelar todas
    for (const sub of allIncomplete) {
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (error) {
        console.error(`Erro ao cancelar ${sub.id}:`, error);
      }
    }

    return {
      success: true,
      canceledCount: allIncomplete.length,
    };
  } catch (error) {
    console.error('Erro ao cancelar subscriptions incompletas:', error);
    throw error;
  }
}

/**
 * Migra a subscription do plano principal para flexible billing mode
 * Útil para chamar manualmente quando necessário
 */
export async function migrateMainPlanToFlexibleBilling() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';

    // Buscar subscription do plano principal
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    const mainPlanSub = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === mainPlanProductId)
    );

    if (!mainPlanSub) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }


    // Migrar para flexible billing
    return await migrateToFlexibleBilling(mainPlanSub.id);
  } catch (error) {
    console.error('Erro ao migrar plano principal:', error);
    throw error;
  }
}

// ==========================================
// NOVA ESTRATÉGIA: SUBSCRIPTIONS SEPARADAS
// ==========================================

/**
 * Lista TODAS as subscriptions ativas do customer
 */
export async function getAllCustomerSubscriptions() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscriptions sem expand (evita erro de limite de 4 níveis)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    return {
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_end: (sub as any).current_period_end,
        current_period_start: (sub as any).current_period_start,
        cancel_at_period_end: (sub as any).cancel_at_period_end,
        items: sub.items.data.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            product: item.price.product, // Retorna só o ID (string)
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring,
            nickname: item.price.nickname
          },
          quantity: item.quantity
        }))
      }))
    };
  } catch (error) {
    console.error('Erro ao listar subscriptions:', error);
    throw error;
  }
}

/**
 * Busca todos os preços disponíveis de um produto
 */
export async function getProductPrices(productId: string) {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    // Buscar informações do produto
    const product = await stripe.products.retrieve(productId);

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
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar preços do produto:', error);
    throw error;
  }
}

/**
 * Busca a subscription de storage separada (estratégia recomendada)
 */
export async function getCurrentStorage() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const storageProductId = 'prod_T9AfZhzca9pgNW';

    // Buscar todas as subscriptions
    const allSubs = await getAllCustomerSubscriptions();

    // Encontrar a subscription de storage
    const storageSub = allSubs.subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === storageProductId
          : (item.price.product as any).id === storageProductId
      )
    );

    if (!storageSub) {
      return { hasStorage: false, subscription: null };
    }

    // Buscar detalhes completos da subscription
    const subscription = await stripe.subscriptions.retrieve(storageSub.id, {
      expand: ['items.data.price.product']
    });

    return {
      hasStorage: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as any).current_period_end,
        current_period_start: (subscription as any).current_period_start,
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        items: subscription.items.data.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            nickname: item.price.nickname,
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring,
          },
          quantity: item.quantity
        }))
      }
    };
  } catch (error) {
    console.error('Erro ao buscar storage atual:', error);
    return { hasStorage: false, subscription: null };
  }
}

/**
 * Cria uma nova subscription separada para Storage
 * SEMPRE MENSAL
 */
export async function createStorageSubscription(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Verificar se tem plano principal ativo
    const hasPlan = await hasActivePlan();
    if (!hasPlan) {
      throw new Error('Você precisa ter um plano ativo para contratar armazenamento');
    }

    // PRIMEIRO: Cancelar subscriptions incompletas (limpeza)
    try {
      await cancelIncompleteSubscriptions();
    } catch (cleanupError) {
      console.warn('Aviso ao limpar subscriptions incompletas:', cleanupError);
    }

    // Verificar se já existe subscription de storage ATIVA
    const allSubs = await getAllCustomerSubscriptions();
    const storageProductId = 'prod_T9AfZhzca9pgNW';

    const existingStorage = allSubs.subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === storageProductId
          : (item.price.product as any).id === storageProductId
      )
    );

    if (existingStorage) {
      throw new Error('Já existe uma subscription de armazenamento ativa');
    }

    // Buscar método de pagamento padrão
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer foi deletado');
    }

    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error('Nenhum método de pagamento padrão configurado');
    }

    // Criar subscription separada com cobrança imediata
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: defaultPaymentMethod as string,
      payment_behavior: 'error_if_incomplete', // Cobra imediatamente e retorna erro se falhar
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        type: 'storage',
        product_id: storageProductId
      }
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      current_period_end: (subscription as any).current_period_end
    };
  } catch (error) {
    console.error('Erro ao criar subscription de storage:', error);
    throw error;
  }
}

/**
 * Altera o plano de armazenamento existente
 */
export async function changeStoragePlan(newPriceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar subscription de storage
    const allSubs = await getAllCustomerSubscriptions();
    const storageProductId = 'prod_T9AfZhzca9pgNW';

    const storageSub = allSubs.subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === storageProductId
          : (item.price.product as any).id === storageProductId
      )
    );

    if (!storageSub) {
      throw new Error('Nenhuma subscription de armazenamento encontrada');
    }

    // Atualizar o price da subscription
    await updateSubscriptionPrice(storageSub.id, newPriceId);

    return {
      success: true,
      subscriptionId: storageSub.id
    };
  } catch (error) {
    console.error('Erro ao alterar plano de storage:', error);
    throw error;
  }
}

/**
 * Adiciona armazenamento como ADD-ON na subscription do plano principal
 * NÃO cria subscription separada - adiciona como item na mesma subscription
 * USA FLEXIBLE BILLING MODE para permitir diferentes intervalos
 */
export async function addStorageAsAddon(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!customerId || !secretKey) {
      throw new Error('Customer ID ou Secret Key não configurado');
    }

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';
    const storageProductId = 'prod_T9AfZhzca9pgNW';

    // Buscar subscription do plano principal
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    const mainPlanSub = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === mainPlanProductId)
    );

    if (!mainPlanSub) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }

    // Verificar se já existe storage como item nesta subscription
    const existingStorageItem = mainPlanSub.items.data.find(item =>
      item.price.product === storageProductId
    );

    if (existingStorageItem) {
      // Já existe - atualizar o price
      await stripe.subscriptionItems.update(existingStorageItem.id, {
        price: priceId,
        proration_behavior: 'create_prorations',
      });
    } else {

      try {
        await migrateToFlexibleBilling(mainPlanSub.id);
      } catch (migrateError) {
        console.warn('Aviso ao migrar (pode já estar em flexible mode):', migrateError);
        // Continuar mesmo se der erro - pode já estar migrada
      }

      const response = await fetch(`https://api.stripe.com/v1/subscription_items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Version': '2025-08-27.basil',
        },
        body: new URLSearchParams({
          'subscription': mainPlanSub.id,
          'price': priceId,
          'proration_behavior': 'create_prorations',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao adicionar storage');
      }

      const item = await response.json();
    }

    return {
      success: true,
      subscriptionId: mainPlanSub.id,
    };
  } catch (error) {
    console.error('Erro ao adicionar storage como add-on:', error);
    throw error;
  }
}

/**
 * Remove armazenamento da subscription principal
 */
export async function removeStorageAddonFromSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const mainPlanProductId = 'prod_T9AmlVw7Z608Rm';
    const storageProductId = 'prod_T9AfZhzca9pgNW';

    // Buscar subscription do plano principal
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    const mainPlanSub = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === mainPlanProductId)
    );

    if (!mainPlanSub) {
      throw new Error('Nenhuma subscription do plano principal encontrada');
    }

    // Encontrar o item de storage
    const storageItem = mainPlanSub.items.data.find(item =>
      item.price.product === storageProductId
    );

    if (!storageItem) {
      throw new Error('Storage não encontrado na subscription');
    }

    // Remover o item
    await stripe.subscriptionItems.del(storageItem.id, {
      proration_behavior: 'create_prorations',
    });

    return {
      success: true,
      subscriptionId: mainPlanSub.id,
    };
  } catch (error) {
    console.error('Erro ao remover storage:', error);
    throw error;
  }
}

/**
 * Adiciona ou altera o plano de armazenamento
 * Se já existe, altera. Se não existe, cria.
 * USA SUBSCRIPTION SEPARADA (recomendado pelo Stripe)
 */
export async function addOrChangeStoragePlan(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Verificar se já existe subscription de storage
    const allSubs = await getAllCustomerSubscriptions();
    const storageProductId = 'prod_T9AfZhzca9pgNW';

    const existingStorage = allSubs.subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === storageProductId
          : (item.price.product as any).id === storageProductId
      )
    );

    if (existingStorage) {
      // Já existe - alterar plano
      return await changeStoragePlan(priceId);
    } else {
      // Não existe - criar novo
      return await createStorageSubscription(priceId);
    }
  } catch (error) {
    console.error('Erro ao adicionar/alterar storage:', error);
    throw error;
  }
}

/**
 * Cria uma nova subscription separada para InfoZap
 * SEMPRE MENSAL
 */
export async function createInfoZapSubscription(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // PRIMEIRO: Cancelar subscriptions incompletas (limpeza)
    try {
      await cancelIncompleteSubscriptions();
    } catch (cleanupError) {
      console.warn('Aviso ao limpar subscriptions incompletas:', cleanupError);
    }

    // Verificar se já existe subscription de infozap ATIVA
    const allSubs = await getAllCustomerSubscriptions();
    const infozapProductId = 'prod_T9SqvByfpsLwI8';

    const existingInfoZap = allSubs.subscriptions.find(sub =>
      sub.items.some(item =>
        typeof item.price.product === 'string'
          ? item.price.product === infozapProductId
          : (item.price.product as any).id === infozapProductId
      )
    );

    if (existingInfoZap) {
      throw new Error('Já existe uma subscription de InfoZap ativa');
    }

    // Buscar método de pagamento padrão
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer foi deletado');
    }

    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error('Nenhum método de pagamento padrão configurado');
    }

    // Criar subscription separada com cobrança imediata
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: defaultPaymentMethod as string,
      payment_behavior: 'error_if_incomplete', // Cobra imediatamente e retorna erro se falhar
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        type: 'infozap',
        product_id: infozapProductId
      }
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      current_period_end: (subscription as any).current_period_end
    };
  } catch (error) {
    console.error('Erro ao criar subscription de InfoZap:', error);
    throw error;
  }
}

/**
 * Cancela uma subscription específica
 * Cancela no final do período (cancel_at_period_end)
 */
export async function cancelSpecificSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
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

/**
 * Cancela TODAS as subscriptions do customer
 * Quando cancela o plano principal, cancela storage e infozap também
 */
export async function cancelAllSubscriptions() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const allSubs = await getAllCustomerSubscriptions();

    const cancelPromises = allSubs.subscriptions.map(sub =>
      stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true
      })
    );

    await Promise.all(cancelPromises);

    return {
      success: true,
      canceledCount: allSubs.subscriptions.length
    };
  } catch (error) {
    console.error('Erro ao cancelar todas as subscriptions:', error);
    throw error;
  }
}

/**
 * Reativa uma subscription cancelada
 */
export async function reactivateSpecificSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription.cancel_at_period_end) {
      throw new Error('Subscription não está agendada para cancelamento');
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    return {
      success: true,
      subscriptionId: updated.id
    };
  } catch (error) {
    console.error('Erro ao reativar subscription:', error);
    throw error;
  }
}

/**
 * Atualiza o plano de uma subscription (troca de price)
 */
export async function updateSubscriptionPrice(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.items.data.length === 0) {
      throw new Error('Subscription não tem items');
    }

    const itemId = subscription.items.data[0].id;

    await stripe.subscriptionItems.update(itemId, {
      price: newPriceId,
      proration_behavior: 'create_prorations'
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar price da subscription:', error);
    throw error;
  }
}

// ==========================================
// GERENCIAMENTO DE INFOZAP E IA
// ==========================================

/**
 * Busca a subscription de InfoZap (canais WhatsApp)
 */
export async function getInfoZapSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const infozapProductId = 'prod_T9SqvByfpsLwI8';

    // Buscar todas as subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar subscription do InfoZap
    const infozapSub = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === infozapProductId)
    );

    if (!infozapSub) {
      return { hasSubscription: false, subscription: null };
    }

    // Buscar detalhes completos
    const subscription = await stripe.subscriptions.retrieve(infozapSub.id, {
      expand: ['items.data.price.product']
    });

    return {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as any).current_period_end,
        current_period_start: (subscription as any).current_period_start,
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        items: subscription.items.data.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            nickname: item.price.nickname,
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring,
            product: item.price.product,
          },
          quantity: item.quantity
        }))
      }
    };
  } catch (error) {
    console.error('Erro ao buscar subscription InfoZap:', error);
    throw error;
  }
}

/**
 * Busca a subscription de IA
 */
export async function getIASubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const iaProductId = 'prod_TA8gkanW3rgytK';

    // Buscar todas as subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Encontrar subscription da IA
    const iaSub = subscriptions.data.find(sub =>
      sub.items.data.some(item => item.price.product === iaProductId)
    );

    if (!iaSub) {
      return { hasSubscription: false, subscription: null };
    }

    // Buscar detalhes completos
    const subscription = await stripe.subscriptions.retrieve(iaSub.id, {
      expand: ['items.data.price.product']
    });

    return {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as any).current_period_end,
        current_period_start: (subscription as any).current_period_start,
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        items: subscription.items.data.map(item => ({
          id: item.id,
          price: {
            id: item.price.id,
            nickname: item.price.nickname,
            unit_amount: item.price.unit_amount,
            recurring: item.price.recurring,
            product: item.price.product,
          },
          quantity: item.quantity
        }))
      }
    };
  } catch (error) {
    console.error('Erro ao buscar subscription IA:', error);
    throw error;
  }
}

/**
 * Adiciona 1 quantidade à subscription de InfoZap
 * Se não existir subscription, cria uma nova
 */
export async function addInfoZapChannel(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Verificar se já existe subscription
    const { hasSubscription, subscription } = await getInfoZapSubscription();

    if (hasSubscription && subscription) {
      // Já existe - aumentar quantidade
      const item = subscription.items[0];
      const currentQuantity = item.quantity || 0;

      await stripe.subscriptionItems.update(item.id, {
        quantity: currentQuantity + 1,
        proration_behavior: 'create_prorations',
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: currentQuantity + 1,
      };
    } else {
      // Não existe - criar nova subscription
      const customer = await stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new Error('Customer foi deletado');
      }

      const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

      if (!defaultPaymentMethod) {
        throw new Error('Nenhum método de pagamento padrão configurado');
      }

      const newSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity: 1 }],
        default_payment_method: defaultPaymentMethod as string,
        payment_behavior: 'error_if_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          type: 'infozap',
          product_id: 'prod_T9SqvByfpsLwI8'
        }
      });

      return {
        success: true,
        subscriptionId: newSubscription.id,
        quantity: 1,
      };
    }
  } catch (error) {
    console.error('Erro ao adicionar canal InfoZap:', error);
    throw error;
  }
}

/**
 * Remove 1 quantidade da subscription de InfoZap
 * Se quantidade chegar a 0, cancela a subscription
 */
export async function removeInfoZapChannel() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const { hasSubscription, subscription } = await getInfoZapSubscription();

    if (!hasSubscription || !subscription) {
      throw new Error('Subscription InfoZap não encontrada');
    }

    const item = subscription.items[0];
    const currentQuantity = item.quantity || 0;

    if (currentQuantity <= 1) {
      // Se é o último canal, cancelar subscription
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: 0,
        cancelled: true,
      };
    } else {
      // Diminuir quantidade
      await stripe.subscriptionItems.update(item.id, {
        quantity: currentQuantity - 1,
        proration_behavior: 'create_prorations',
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: currentQuantity - 1,
        cancelled: false,
      };
    }
  } catch (error) {
    console.error('Erro ao remover canal InfoZap:', error);
    throw error;
  }
}

/**
 * Adiciona 1 quantidade à subscription de IA
 * Se não existir subscription, cria uma nova
 */
export async function addIAChannel(priceId: string) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Verificar se já existe subscription
    const { hasSubscription, subscription } = await getIASubscription();

    if (hasSubscription && subscription) {
      // Já existe - aumentar quantidade
      const item = subscription.items[0];
      const currentQuantity = item.quantity || 0;

      await stripe.subscriptionItems.update(item.id, {
        quantity: currentQuantity + 1,
        proration_behavior: 'create_prorations',
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: currentQuantity + 1,
      };
    } else {
      // Não existe - criar nova subscription
      const customer = await stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new Error('Customer foi deletado');
      }

      const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

      if (!defaultPaymentMethod) {
        throw new Error('Nenhum método de pagamento padrão configurado');
      }

      const newSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity: 1 }],
        default_payment_method: defaultPaymentMethod as string,
        payment_behavior: 'error_if_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          type: 'ia',
          product_id: 'prod_TA8gkanW3rgytK'
        }
      });

      return {
        success: true,
        subscriptionId: newSubscription.id,
        quantity: 1,
      };
    }
  } catch (error) {
    console.error('Erro ao adicionar canal IA:', error);
    throw error;
  }
}

/**
 * Remove 1 quantidade da subscription de IA
 * Se quantidade chegar a 0, cancela a subscription
 */
export async function removeIAChannel() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const { hasSubscription, subscription } = await getIASubscription();

    if (!hasSubscription || !subscription) {
      throw new Error('Subscription IA não encontrada');
    }

    const item = subscription.items[0];
    const currentQuantity = item.quantity || 0;

    if (currentQuantity <= 1) {
      // Se é o último canal, cancelar subscription
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: 0,
        cancelled: true,
      };
    } else {
      // Diminuir quantidade
      await stripe.subscriptionItems.update(item.id, {
        quantity: currentQuantity - 1,
        proration_behavior: 'create_prorations',
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        quantity: currentQuantity - 1,
        cancelled: false,
      };
    }
  } catch (error) {
    console.error('Erro ao remover canal IA:', error);
    throw error;
  }
}

/**
 * Busca os preços disponíveis para InfoZap
 */
export async function getInfoZapPrices() {
  try {
    const productId = 'prod_T9SqvByfpsLwI8';

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    const product = await stripe.products.retrieve(productId);

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
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar preços InfoZap:', error);
    throw error;
  }
}

/**
 * Busca os preços disponíveis para IA
 */
export async function getIAPrices() {
  try {
    const productId = 'prod_TA8gkanW3rgytK';

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    const product = await stripe.products.retrieve(productId);

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
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar preços IA:', error);
    throw error;
  }
}

/**
 * Verifica o status de uma subscription específica
 * Retorna se está ativa, cancelada, e se cancel_at_period_end está definido
 * Suporta tanto Subscription IDs (sub_xxx) quanto Subscription Item IDs (si_xxx)
 */
export async function checkSubscriptionStatus(subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return {
        exists: false,
        active: false,
        cancel_at_period_end: false,
        current_period_end: null,
      };
    }

    let actualSubscriptionId = subscriptionId;

    // Se for um Subscription Item ID (si_xxx), buscar o Subscription ID primeiro
    if (subscriptionId.startsWith('si_')) {
      try {
        const subscriptionItem = await stripe.subscriptionItems.retrieve(subscriptionId);
        actualSubscriptionId = subscriptionItem.subscription as string;
      } catch (itemError: any) {
        // Subscription item não existe (foi deletado)
        const isResourceMissing = itemError.code === 'resource_missing' ||
                                   itemError.type === 'invalid_request_error' ||
                                   itemError.message?.includes('Invalid subscription_item');

        if (isResourceMissing) {
          console.log(`⚠️ Subscription item ${subscriptionId} não existe mais (deletado)`);
          return {
            exists: false,
            active: false,
            cancel_at_period_end: false,
            current_period_end: null,
          };
        }
        throw itemError;
      }
    }

    const subscription = await stripe.subscriptions.retrieve(actualSubscriptionId);

    // Pegar current_period_end ou billing_cycle_anchor
    let periodEnd = (subscription as any).current_period_end;
    if (!periodEnd) {
      periodEnd = (subscription as any).billing_cycle_anchor;
    }

    return {
      exists: true,
      active: subscription.status === 'active' || subscription.status === 'trialing',
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: periodEnd,
      canceled_at: (subscription as any).canceled_at,
      cancel_at: subscription.cancel_at_period_end ? periodEnd : null,
    };
  } catch (error: any) {
    // Se subscription não existir, retornar como não existe
    if (error?.code === 'resource_missing') {
      return {
        exists: false,
        active: false,
        cancel_at_period_end: false,
        current_period_end: null,
      };
    }
    console.error('Erro ao verificar status da subscription:', error);
    throw error;
  }
}

/**
 * Busca ou cria a subscription principal de InfoZap/IA
 * Todos os canais são items dentro desta mesma subscription
 */
async function getOrCreateMainInfoZapSubscription() {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    const infozapProductId = 'prod_T9SqvByfpsLwI8';
    const iaProductId = 'prod_TA8gkanW3rgytK';

    // Buscar subscriptions ativas
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    // Procurar subscription que tenha produtos InfoZap ou IA
    let mainSubscription = subscriptions.data.find(sub =>
      sub.items.data.some(item =>
        item.price.product === infozapProductId || item.price.product === iaProductId
      )
    );

    if (mainSubscription) {
      console.log('✅ Subscription InfoZap/IA existente encontrada:', mainSubscription.id);
      return mainSubscription;
    }

    // Não existe - criar nova subscription (vazia, items serão adicionados depois)
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      throw new Error('Customer foi deletado');
    }

    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error('Nenhum método de pagamento padrão configurado');
    }

    // Criar subscription vazia - items serão adicionados depois
    console.log('⚠️ Criando nova subscription InfoZap/IA...');

    // Não podemos criar subscription sem items, então vamos retornar null
    // e deixar que addItemToSubscription crie a subscription
    return null;
  } catch (error) {
    console.error('Erro ao buscar/criar subscription InfoZap/IA:', error);
    throw error;
  }
}

/**
 * Adiciona um item (canal) à subscription de InfoZap/IA
 * Se não existir subscription, cria uma nova
 */
export async function addItemToInfoZapSubscription(params: {
  priceId: string;
  metadata?: Record<string, string>;
}) {
  try {
    const customerId = process.env.STRIPE_CUSTOMER_ID;

    if (!customerId) {
      throw new Error('Customer ID não configurado');
    }

    // Buscar ou criar subscription principal
    let subscription = await getOrCreateMainInfoZapSubscription();

    if (!subscription) {
      // Criar primeira subscription com o primeiro item
      const customer = await stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new Error('Customer foi deletado');
      }

      const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

      if (!defaultPaymentMethod) {
        throw new Error('Nenhum método de pagamento padrão configurado');
      }

      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: params.priceId, metadata: params.metadata || {} }],
        default_payment_method: defaultPaymentMethod as string,
        payment_behavior: 'error_if_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      console.log('✅ Nova subscription InfoZap/IA criada:', subscription.id);
    } else {
      // Adicionar item à subscription existente
      await stripe.subscriptionItems.create({
        subscription: subscription.id,
        price: params.priceId,
        metadata: params.metadata || {},
        proration_behavior: 'create_prorations',
      });

      console.log('✅ Item adicionado à subscription existente:', subscription.id);

      // Recarregar subscription para pegar os novos items
      subscription = await stripe.subscriptions.retrieve(subscription.id);
    }

    // Pegar o item recém-criado/adicionado
    const addedItem = subscription.items.data.find(item => item.price.id === params.priceId);

    if (!addedItem) {
      throw new Error('Item não encontrado após adicionar');
    }

    // Pegar current_period_end
    let periodEnd = (subscription as any).current_period_end;

    if (!periodEnd) {
      periodEnd = (subscription as any).billing_cycle_anchor;
      console.log('⚠️ Usando billing_cycle_anchor como current_period_end:', periodEnd);
    }

    console.log('✅ Item adicionado:', {
      subscriptionId: subscription.id,
      subscriptionItemId: addedItem.id,
      priceId: params.priceId,
      current_period_end: periodEnd,
    });

    if (!periodEnd) {
      console.error('❌ Não foi possível obter current_period_end!');
      throw new Error('Stripe não retornou data de expiração válida');
    }

    return {
      success: true,
      subscriptionId: addedItem.id, // Retornar o Subscription Item ID (si_xxx)
      current_period_end: periodEnd
    };
  } catch (error) {
    console.error('Erro ao adicionar item à subscription:', error);
    throw error;
  }
}

/**
 * @deprecated Use addItemToInfoZapSubscription ao invés
 * Mantido para compatibilidade
 */
export async function createIndividualSubscription(params: {
  priceId: string;
  metadata?: Record<string, string>;
}) {
  console.warn('⚠️ createIndividualSubscription está deprecated. Use addItemToInfoZapSubscription()');
  return await addItemToInfoZapSubscription(params);
}

/**
 * Remove apenas a IA de um canal (deleta o subscription item da IA)
 */
export async function removeIASubscriptionItem(iaSubscriptionItemId: string) {
  try {
    if (!iaSubscriptionItemId) {
      throw new Error('IA Subscription Item ID não fornecido');
    }

    console.log('🔍 Removendo IA subscription item:', iaSubscriptionItemId);

    // Buscar o subscription item para confirmar que existe
    const subscriptionItem = await stripe.subscriptionItems.retrieve(iaSubscriptionItemId);
    const subscriptionId = subscriptionItem.subscription as string;

    // Buscar a subscription para pegar current_period_end e contar items
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPeriodEnd = (subscription as any).current_period_end || (subscription as any).billing_cycle_anchor;

    console.log('📅 IA ficará ativa até:', new Date(currentPeriodEnd * 1000).toLocaleString());

    // Contar quantos items existem na subscription
    const activeItemsCount = subscription.items.data.length;
    console.log(`📊 Items ativos na subscription: ${activeItemsCount}`);

    // Se for o último item, cancelar a subscription inteira
    if (activeItemsCount <= 1) {
      console.log('⚠️ Último item da subscription - cancelando subscription inteira IMEDIATAMENTE');

      // Cancelar imediatamente com proration (gera crédito)
      await stripe.subscriptions.cancel(subscriptionId, {
        prorate: true, // Criar crédito proporcional ao tempo não usado
      });

      console.log('✅ Subscription cancelada imediatamente com crédito proporcional');
    } else {
      // Ainda há outros items - deletar apenas este item
      console.log('ℹ️ Ainda há outros items - deletando apenas IA');

      await stripe.subscriptionItems.del(iaSubscriptionItemId, {
        proration_behavior: 'create_prorations', // Criar crédito proporcional
      });

      console.log('✅ IA removida com sucesso. Ativa até:', new Date(currentPeriodEnd * 1000).toLocaleString());
    }

    return {
      success: true,
      will_be_active_until: currentPeriodEnd, // Timestamp Unix de quando vai expirar
    };
  } catch (error) {
    console.error('❌ Erro ao remover IA subscription item:', error);
    throw error;
  }
}

/**
 * Cancela um canal completo (InfoZap + IA) agendando a remoção para o final do período
 * Remove os subscription items agendando para o fim do período usando proration_behavior none
 */
export async function cancelChannelSubscription(params: {
  infozapSubscriptionItemId: string;
  iaSubscriptionItemId?: string;
}) {
  try {
    const { infozapSubscriptionItemId, iaSubscriptionItemId } = params;

    if (!infozapSubscriptionItemId) {
      throw new Error('InfoZap Subscription Item ID não fornecido');
    }

    console.log('🔍 [NOVO] Cancelando canal completo (sem schedule):', params);

    // Buscar o subscription item do InfoZap (se ainda existir)
    let subscriptionId: string;
    let currentPeriodEnd: number;

    try {
      const infozapItem = await stripe.subscriptionItems.retrieve(infozapSubscriptionItemId);
      subscriptionId = infozapItem.subscription as string;
    } catch (error: any) {
      // Stripe usa 'type' ao invés de 'code' para alguns erros
      const isResourceMissing = error.code === 'resource_missing' ||
                                 error.type === 'invalid_request_error' ||
                                 error.message?.includes('Invalid subscription_item');

      if (isResourceMissing) {
        console.log('⚠️ InfoZap subscription item já foi removido anteriormente');
        // Tentar buscar pela IA se fornecida
        if (iaSubscriptionItemId) {
          try {
            const iaItem = await stripe.subscriptionItems.retrieve(iaSubscriptionItemId);
            subscriptionId = iaItem.subscription as string;
          } catch {
            throw new Error('Ambos subscription items não existem mais');
          }
        } else {
          throw new Error('InfoZap subscription item não existe e IA não foi fornecida');
        }
      } else {
        throw error;
      }
    }

    // Buscar a subscription completa
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    currentPeriodEnd = (subscription as any).current_period_end || (subscription as any).billing_cycle_anchor;

    console.log('📋 Agendando cancelamento para:', new Date(currentPeriodEnd * 1000).toLocaleString());

    // Contar quantos items ativos existem na subscription
    const activeItemsCount = subscription.items.data.length;
    console.log(`📊 Items ativos na subscription: ${activeItemsCount}`);

    // Contar quantos items serão removidos
    let itemsToRemoveCount = 1; // InfoZap sempre
    if (iaSubscriptionItemId) itemsToRemoveCount++;

    console.log(`🗑️ Items a serem removidos: ${itemsToRemoveCount}`);

    // Se vai remover TODOS os items, cancelar a subscription inteira
    if (itemsToRemoveCount >= activeItemsCount) {
      console.log('⚠️ Último(s) item(s) da subscription - cancelando subscription inteira IMEDIATAMENTE');

      // Cancelar imediatamente com proration (gera crédito)
      await stripe.subscriptions.cancel(subscriptionId, {
        prorate: true, // Criar crédito proporcional ao tempo não usado
      });

      console.log('✅ Subscription cancelada imediatamente com crédito proporcional');
    } else {
      // Ainda vai sobrar items - deletar items individualmente
      console.log('ℹ️ Ainda há outros items - deletando items individualmente');

      // Deletar o item do InfoZap imediatamente com crédito proporcional
      try {
        await stripe.subscriptionItems.del(infozapSubscriptionItemId, {
          proration_behavior: 'create_prorations', // Criar crédito proporcional
        });
        console.log('✅ InfoZap removido imediatamente com crédito proporcional');
      } catch (error: any) {
        const isResourceMissing = error.code === 'resource_missing' ||
                                   error.type === 'invalid_request_error' ||
                                   error.message?.includes('Invalid subscription_item');

        if (isResourceMissing) {
          console.log('⚠️ InfoZap já estava removido');
        } else {
          throw error;
        }
      }

      // Se tiver IA, deletar também
      if (iaSubscriptionItemId) {
        try {
          await stripe.subscriptionItems.del(iaSubscriptionItemId, {
            proration_behavior: 'create_prorations', // Criar crédito proporcional
          });
          console.log('✅ IA removida imediatamente com crédito proporcional');
        } catch (error: any) {
          const isResourceMissing = error.code === 'resource_missing' ||
                                     error.type === 'invalid_request_error' ||
                                     error.message?.includes('Invalid subscription_item');

          if (isResourceMissing) {
            console.log('⚠️ IA já estava removida');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Canal agendado para cancelamento:', {
      subscriptionId,
      cancel_at: currentPeriodEnd,
      itemsRemoved: {
        infozap: infozapSubscriptionItemId,
        ia: iaSubscriptionItemId,
      },
    });

    return {
      success: true,
      cancel_at: currentPeriodEnd,
    };
  } catch (error) {
    console.error('❌ Erro ao cancelar canal:', error);
    throw error;
  }
}

/**
 * Reativa um canal cancelado (adiciona novamente o item)
 */
export async function reactivateSubscriptionItem(params: {
  priceId: string;
  metadata?: Record<string, string>;
}) {
  try {
    // Simplesmente adiciona o item novamente
    return await addItemToInfoZapSubscription(params);
  } catch (error) {
    console.error('❌ Erro ao reativar subscription item:', error);
    throw error;
  }
}