'use server';

/**
 * Server Actions para integração com API InfoDental
 * Base URL: https://infoai.infodental.dental/manager.php
 */

const INFODENTAL_API_URL = 'https://infoai.infodental.dental/manager.php';

// Tipos
export interface InfoZapChannel {
  id: number;
  data: string;
  titulo: string;
  ia_ativa: 0 | 1;
  ia_stripe_si: string;
  ia_stripe_price: string;
  ia_stripe_expiration: string;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: string;
}

interface InfoDentalResponse {
  success: boolean;
  infozaps?: InfoZapChannel[];
  message?: string;
}

/**
 * Buscar token e instance das variáveis de ambiente
 */
function getCredentials() {
  const token = process.env.INFODENTAL_TOKEN;
  const instance = process.env.INFODENTAL_INSTANCE;

  if (!token || !instance) {
    throw new Error('Credenciais InfoDental não configuradas');
  }

  return { token, instance };
}

/**
 * Listar todos os canais InfoZap
 */
export async function listInfoZapChannels() {
  try {
    const { token, instance } = getCredentials();

    const requestBody = {
      token,
      instance,
      method: 'listar',
    };

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao listar canais');
    }

    return {
      success: true,
      channels: data.infozaps || [],
    };
  } catch (error) {
    console.error('❌ Erro ao listar canais InfoZap:', error);
    throw error;
  }
}

/**
 * Criar ou atualizar um canal InfoZap
 */
export async function createInfoZapChannel(params: {
  id_infozap: string;
  ia_stripe_si?: string;
  ia_stripe_price?: string;
  ia_stripe_expiration?: string;
  infozap_stripe_si?: string;
  infozap_stripe_price?: string;
  infozap_stripe_expiration?: string;
}) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        instance,
        method: 'criar',
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao criar canal');
    }

    return {
      success: true,
      message: 'Canal criado/atualizado com sucesso',
    };
  } catch (error) {
    console.error('Erro ao criar canal InfoZap:', error);
    throw error;
  }
}

/**
 * Remover um canal InfoZap
 */
export async function removeInfoZapChannel(id_infozap: number) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        instance,
        id_infozap,
        method: 'remover',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao remover canal');
    }

    return {
      success: true,
      message: 'Canal removido com sucesso',
    };
  } catch (error) {
    console.error('Erro ao remover canal InfoZap:', error);
    throw error;
  }
}

/**
 * Reativar um canal InfoZap
 */
export async function reactivateInfoZapChannel(params: {
  id_infozap: number;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: string;
}) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        instance,
        method: 'reativar',
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao reativar canal');
    }

    return {
      success: true,
      message: 'Canal reativado com sucesso',
    };
  } catch (error) {
    console.error('Erro ao reativar canal InfoZap:', error);
    throw error;
  }
}
