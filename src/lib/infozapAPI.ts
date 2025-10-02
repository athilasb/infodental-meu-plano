/**
 * Serviço de API para integração com InfoZap Manager
 */

const MANAGER_URL = 'https://infoai.infodental.dental/manager.php';
const API_TOKEN = process.env.NEXT_PUBLIC_INFOZAP_TOKEN || 'c20ef152b81e559ef400f564fd0e14651a4e6e76';

export interface InfoZapCreateParams {
  instance: string;
  id_infozap: string;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: string;
}

export interface InfoZapRemoveParams {
  instance: string;
  id_infozap: number;
}

export interface InfoZapReactivateParams {
  instance: string;
  id_infozap: number;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: string;
}

/**
 * Cria uma nova instância do InfoZap
 */
export async function createInfoZap(params: InfoZapCreateParams): Promise<any> {
  try {
    const response = await fetch(MANAGER_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InfoDental-MeuPlano/1.0'
      },
      body: JSON.stringify({
        token: API_TOKEN,
        instance: params.instance,
        id_infozap: params.id_infozap,
        method: 'criar',
        infozap_stripe_si: params.infozap_stripe_si,
        infozap_stripe_price: params.infozap_stripe_price,
        infozap_stripe_expiration: params.infozap_stripe_expiration
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar InfoZap: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar InfoZap:', error);
    throw error;
  }
}

/**
 * Remove uma instância do InfoZap
 */
export async function removeInfoZap(params: InfoZapRemoveParams): Promise<any> {
  try {
    const response = await fetch(MANAGER_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InfoDental-MeuPlano/1.0'
      },
      body: JSON.stringify({
        token: API_TOKEN,
        instance: params.instance,
        id_infozap: params.id_infozap,
        method: 'remover'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao remover InfoZap: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao remover InfoZap:', error);
    throw error;
  }
}

/**
 * Reativa uma instância do InfoZap
 */
export async function reactivateInfoZap(params: InfoZapReactivateParams): Promise<any> {
  try {
    const response = await fetch(MANAGER_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InfoDental-MeuPlano/1.0'
      },
      body: JSON.stringify({
        token: API_TOKEN,
        instance: params.instance,
        id_infozap: params.id_infozap,
        method: 'reativar',
        infozap_stripe_si: params.infozap_stripe_si,
        infozap_stripe_price: params.infozap_stripe_price,
        infozap_stripe_expiration: params.infozap_stripe_expiration
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao reativar InfoZap: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao reativar InfoZap:', error);
    throw error;
  }
}
