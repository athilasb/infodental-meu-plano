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
  assinatura_status?: 'acontratar' | 'contratado' | 'cancelado';
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
  id: string;
  titulo?: string;
  ia_stripe_si?: string;
  ia_stripe_price?: string;
  ia_stripe_expiration?: string;
  infozap_stripe_si?: string;
  infozap_stripe_price?: string;
  infozap_stripe_expiration?: string;
  assinatura_status?: 'acontratar' | 'contratado' | 'cancelado';
}) {
  try {
    const { token, instance } = getCredentials();

    const requestBody = {
      id: String(params.id),
      token,
      instance,
      method: 'criar',
      id_infozap: String(params.id),
      titulo: params.titulo || `Canal ${params.id}`,
      ia_stripe_si: params.ia_stripe_si || '',
      ia_stripe_price: params.ia_stripe_price || '',
      ia_stripe_expiration: params.ia_stripe_expiration || '',
      infozap_stripe_si: params.infozap_stripe_si || '',
      infozap_stripe_price: params.infozap_stripe_price || '',
      infozap_stripe_expiration: params.infozap_stripe_expiration || '',
      assinatura_status: params.assinatura_status || 'acontratar',
    };
    console.log('🔍 createInfoZapChannel - Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('🔍 createInfoZapChannel - Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ createInfoZapChannel - Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data: InfoDentalResponse = await response.json();
    console.log('✅ createInfoZapChannel - Success Response:', data);

    if (!data.success) {
      throw new Error(data.message || 'Erro ao criar canal');
    }

    return {
      success: true,
      message: 'Canal criado/atualizado com sucesso',
    };
  } catch (error) {
    console.error('❌ Erro ao criar canal InfoZap:', error);
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
        id: String(id_infozap),
        token,
        instance,
        method: 'remover',
        id_infozap: String(id_infozap),
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
        id_infozap: params.id_infozap,
        infozap_stripe_si: params.infozap_stripe_si,
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

/**
 * Incluir IA em um canal InfoZap
 */
export async function includeIAInChannel(params: {
  id_infozap: number;
  ia_stripe_si: string;
  ia_stripe_price: string;
  ia_stripe_expiration: string;
}) {
  try {
    const { token, instance } = getCredentials();

    const requestBody = {
      id: String(params.id_infozap),
      token,
      instance,
      method: 'incluir_ia',
      id_infozap: String(params.id_infozap),
      ia_stripe_si: params.ia_stripe_si,
      ia_stripe_price: params.ia_stripe_price,
      ia_stripe_expiration: params.ia_stripe_expiration,
    };

    console.log('🔍 includeIAInChannel - Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('🔍 includeIAInChannel - Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ includeIAInChannel - Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data: InfoDentalResponse = await response.json();
    console.log('✅ includeIAInChannel - Success Response:', data);

    if (!data.success) {
      throw new Error(data.message || 'Erro ao incluir IA');
    }

    return {
      success: true,
      message: 'IA incluída com sucesso',
    };
  } catch (error) {
    console.error('❌ Erro ao incluir IA:', error);
    throw error;
  }
}

/**
 * Remover IA de um canal InfoZap
 */
export async function removeIAFromChannel(id_infozap: number) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: String(id_infozap),
        token,
        instance,
        method: 'remover_ia',
        id_infozap: String(id_infozap),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao remover IA');
    }

    return {
      success: true,
      message: 'IA removida com sucesso',
    };
  } catch (error) {
    console.error('Erro ao remover IA:', error);
    throw error;
  }
}

/**
 * Alterar título de um canal InfoZap
 */
export async function updateChannelTitle(id_infozap: number, titulo: string) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: String(id_infozap),
        token,
        instance,
        method: 'alterar_titulo',
        id_infozap: String(id_infozap),
        titulo,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao alterar título');
    }

    return {
      success: true,
      message: 'Título alterado com sucesso',
    };
  } catch (error) {
    console.error('Erro ao alterar título:', error);
    throw error;
  }
}

/**
 * Alterar status da assinatura de um canal InfoZap
 */
export async function updateSubscriptionStatus(
  id_infozap: number,
  assinatura_status: 'acontratar' | 'contratado' | 'cancelado'
) {
  try {
    const { token, instance } = getCredentials();

    const response = await fetch(INFODENTAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: String(id_infozap),
        token,
        instance,
        method: 'alterar_assinatura_status',
        id_infozap: String(id_infozap),
        assinatura_status,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: InfoDentalResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Erro ao alterar status da assinatura');
    }

    return {
      success: true,
      message: 'Status da assinatura alterado com sucesso',
    };
  } catch (error) {
    console.error('Erro ao alterar status da assinatura:', error);
    throw error;
  }
}
