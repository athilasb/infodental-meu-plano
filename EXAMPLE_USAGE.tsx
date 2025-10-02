/**
 * EXEMPLO DE USO - Subscriptions Separadas
 *
 * Este componente demonstra como usar os hooks customizados
 * para gerenciar subscriptions separadas
 */

'use client';

import React from 'react';
import {
  useSubscriptionManager,
  useStorageManager,
  useInfoZapManager
} from '@/lib/useSubscriptions';
import Swal from 'sweetalert2';

export default function SubscriptionsExample() {
  const {
    subscriptions,
    loading,
    reload,
    actions,
    getPlanName,
    getPlanPrice,
    getNextBilling
  } = useSubscriptionManager();

  const storage = useStorageManager();
  const infozap = useInfoZapManager();

  // ===============================
  // HANDLERS - STORAGE
  // ===============================

  const handleAddStorage = async () => {
    if (storage.hasStorage) {
      Swal.fire('Atenção', 'Você já tem armazenamento contratado', 'info');
      return;
    }

    const { value: priceId } = await Swal.fire({
      title: 'Escolha um Plano de Armazenamento',
      html: `
        <select id="price" class="swal2-select">
          ${storage.prices.map(price => `
            <option value="${price.id}">
              ${price.nickname} - R$ ${((price.unit_amount || 0) / 100).toFixed(2)}/mês
            </option>
          `).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Adicionar',
      preConfirm: () => {
        return (document.getElementById('price') as HTMLSelectElement).value;
      }
    });

    if (priceId) {
      const success = await storage.add(priceId);

      if (success) {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Armazenamento adicionado com sucesso',
          icon: 'success'
        });
      } else {
        Swal.fire('Erro', 'Falha ao adicionar armazenamento', 'error');
      }
    }
  };

  const handleChangeStorage = async () => {
    if (!storage.hasStorage) {
      Swal.fire('Atenção', 'Você não tem armazenamento contratado', 'info');
      return;
    }

    const { value: priceId } = await Swal.fire({
      title: 'Mudar Plano de Armazenamento',
      html: `
        <select id="price" class="swal2-select">
          ${storage.prices.map(price => `
            <option value="${price.id}">
              ${price.nickname} - R$ ${((price.unit_amount || 0) / 100).toFixed(2)}/mês
            </option>
          `).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Mudar',
      preConfirm: () => {
        return (document.getElementById('price') as HTMLSelectElement).value;
      }
    });

    if (priceId) {
      const success = await storage.change(priceId);

      if (success) {
        Swal.fire('Sucesso!', 'Plano de armazenamento alterado', 'success');
      } else {
        Swal.fire('Erro', 'Falha ao alterar plano', 'error');
      }
    }
  };

  const handleRemoveStorage = async () => {
    if (!storage.hasStorage) return;

    const result = await Swal.fire({
      title: 'Cancelar Armazenamento?',
      text: 'O armazenamento será cancelado no final do período',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      const success = await storage.remove();

      if (success) {
        Swal.fire(
          'Cancelado!',
          'Armazenamento válido até o vencimento',
          'success'
        );
      } else {
        Swal.fire('Erro', 'Falha ao cancelar', 'error');
      }
    }
  };

  // ===============================
  // HANDLERS - INFOZAP
  // ===============================

  const handleAddInfoZap = async () => {
    if (infozap.hasInfoZap) {
      Swal.fire('Atenção', 'Você já tem InfoZap contratado', 'info');
      return;
    }

    const { value: priceId } = await Swal.fire({
      title: 'Escolha um Plano InfoZap',
      html: `
        <select id="price" class="swal2-select">
          ${infozap.prices.map(price => `
            <option value="${price.id}">
              ${price.nickname} - R$ ${((price.unit_amount || 0) / 100).toFixed(2)}/mês
            </option>
          `).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Adicionar',
      preConfirm: () => {
        return (document.getElementById('price') as HTMLSelectElement).value;
      }
    });

    if (priceId) {
      const success = await infozap.add(priceId);

      if (success) {
        Swal.fire('Sucesso!', 'InfoZap adicionado com sucesso', 'success');
      } else {
        Swal.fire('Erro', 'Falha ao adicionar InfoZap', 'error');
      }
    }
  };

  const handleRemoveInfoZap = async () => {
    if (!infozap.hasInfoZap) return;

    const result = await Swal.fire({
      title: 'Cancelar InfoZap?',
      text: 'O InfoZap será cancelado no final do período',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      const success = await infozap.remove();

      if (success) {
        Swal.fire('Cancelado!', 'InfoZap válido até o vencimento', 'success');
      } else {
        Swal.fire('Erro', 'Falha ao cancelar', 'error');
      }
    }
  };

  // ===============================
  // HANDLERS - GERAL
  // ===============================

  const handleCancelAll = async () => {
    const result = await Swal.fire({
      title: 'Cancelar TUDO?',
      html: `
        <p>Isso cancelará:</p>
        <ul style="text-align: left; margin: 1rem 2rem;">
          ${subscriptions.map(sub => `
            <li>✖️ ${getPlanName(sub)}</li>
          `).join('')}
        </ul>
        <p style="color: #d33; margin-top: 1rem;">
          <strong>Todas as subscriptions serão canceladas no vencimento</strong>
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar tudo',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      const success = await actions.cancelAll();

      if (success) {
        Swal.fire(
          'Cancelado!',
          `${subscriptions.length} subscriptions canceladas`,
          'success'
        );
        reload();
      } else {
        Swal.fire('Erro', 'Falha ao cancelar', 'error');
      }
    }
  };

  const handleReactivate = async (subscriptionId: string) => {
    const success = await actions.reactivate(subscriptionId);

    if (success) {
      Swal.fire('Reativado!', 'Subscription reativada com sucesso', 'success');
      reload();
    } else {
      Swal.fire('Erro', 'Falha ao reativar', 'error');
    }
  };

  // ===============================
  // RENDER
  // ===============================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"></div>
          <p className="mt-4">Carregando subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Minhas Subscriptions</h1>

      {/* Botões de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleAddStorage}
          disabled={storage.hasStorage}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {storage.hasStorage ? '✓ Storage Ativo' : '+ Adicionar Storage'}
        </button>

        <button
          onClick={handleAddInfoZap}
          disabled={infozap.hasInfoZap}
          className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {infozap.hasInfoZap ? '✓ InfoZap Ativo' : '+ Adicionar InfoZap'}
        </button>

        <button
          onClick={handleCancelAll}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          ✖ Cancelar Tudo
        </button>
      </div>

      {/* Lista de Subscriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-lg">Nenhuma subscription ativa</p>
          </div>
        )}

        {subscriptions.map(sub => {
          const isStorage = sub.items.some(item =>
            typeof item.price.product === 'string'
              ? item.price.product === 'prod_T9AfZhzca9pgNW'
              : (item.price.product as any).id === 'prod_T9AfZhzca9pgNW'
          );

          const isInfoZap = sub.items.some(item =>
            typeof item.price.product === 'string'
              ? item.price.product === 'prod_T9SqvByfpsLwI8'
              : (item.price.product as any).id === 'prod_T9SqvByfpsLwI8'
          );

          return (
            <div
              key={sub.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Nome e Status */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{getPlanName(sub)}</h3>
                {sub.cancel_at_period_end ? (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                    Cancelado
                  </span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                    Ativo
                  </span>
                )}
              </div>

              {/* Preço */}
              <div className="mb-4">
                <p className="text-3xl font-bold">
                  R$ {getPlanPrice(sub).toFixed(2)}
                  <span className="text-sm text-gray-500 font-normal">/mês</span>
                </p>
              </div>

              {/* Próximo Vencimento */}
              <div className="mb-4 text-sm text-gray-600">
                <p>
                  Próximo vencimento:{' '}
                  <strong>{getNextBilling(sub).toLocaleDateString('pt-BR')}</strong>
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                {sub.cancel_at_period_end ? (
                  <button
                    onClick={() => handleReactivate(sub.id)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Reativar
                  </button>
                ) : (
                  <>
                    {isStorage && (
                      <>
                        <button
                          onClick={handleChangeStorage}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Mudar
                        </button>
                        <button
                          onClick={handleRemoveStorage}
                          className="flex-1 px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {isInfoZap && (
                      <button
                        onClick={handleRemoveInfoZap}
                        className="flex-1 px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Cancelar
                      </button>
                    )}

                    {!isStorage && !isInfoZap && (
                      <button
                        onClick={() => actions.cancel(sub.id)}
                        className="flex-1 px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Cancelar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total de Subscriptions</p>
            <p className="text-2xl font-bold">{subscriptions.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Mensal</p>
            <p className="text-2xl font-bold">
              R${' '}
              {subscriptions
                .reduce((total, sub) => total + getPlanPrice(sub), 0)
                .toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Canceladas</p>
            <p className="text-2xl font-bold">
              {subscriptions.filter(s => s.cancel_at_period_end).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
