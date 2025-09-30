'use client';

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './ui/Button';
import Swal from 'sweetalert2';

interface AddCardFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Criar setup intent
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
      });

      const { clientSecret } = await response.json();

      // Confirmar o setup
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element não encontrado');
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent && setupIntent.payment_method) {
        // Adicionar método de pagamento
        const addResponse = await fetch('/api/stripe/payment-methods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
          }),
        });

        if (!addResponse.ok) {
          throw new Error('Erro ao adicionar método de pagamento');
        }

        await Swal.fire({
          title: 'Sucesso!',
          text: 'Cartão adicionado com sucesso!',
          icon: 'success',
          confirmButtonText: 'Ok',
          confirmButtonColor: '#10b981',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl px-6 py-3 font-semibold'
          }
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao adicionar cartão:', error);
      await Swal.fire({
        title: 'Erro!',
        text: error.message || 'Erro ao adicionar cartão. Tente novamente.',
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#dc2626',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Dados do Cartão</label>
        <div className="rounded-xl border border-gray-300 px-4 py-3">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Aceitamos Visa, Mastercard, Elo e American Express
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? 'Processando...' : 'Adicionar Cartão'}
        </Button>
      </div>
    </form>
  );
}