/**
 * Sistema de armazenamento local IndexedDB para InfoZap
 */

export interface InfoZapData {
  id: number;
  data: Date;
  lixo: boolean;
  assinatura_status: 'acontratar' | 'contratado' | 'cancelado';
  ia_ativa: boolean;
  ia_stripe_si: string;
  ia_stripe_price: string;
  ia_stripe_expiration: Date;
  infozap_stripe_si: string;
  infozap_stripe_price: string;
  infozap_stripe_expiration: Date;
  titulo: string;
  instancia: string;
  endpoint: string;
  endereco_cep: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_complemento: string;
  endereco_estado: string;
  endereco_id_cidade: number;
  endereco_lat: string;
  endereco_lng: string;
  ia_prompt_instrucao: string;
  ia_prompt_faq: string;
  ia_agenda_infodental: boolean;
  ia_agenda_link: string;
  ia_cadastro: string[];
  ia_funcionamento: '24horas' | 'personalizado';
  ia_funcionamento_inicio: string;
  ia_funcionamento_fim: string;
  ia_inatividade_humana: number;
  ia_funcionalidades: string;
  ia_qtd_mensagens: number;
  ia_id_llm: number;
  ia_llm_apikey: string;
  lixo_data: Date | null;
}

const DB_NAME = 'InfoDentalDB';
const DB_VERSION = 1;
const STORE_NAME = 'infozap';

class InfoZapDB {
  private db: IDBDatabase | null = null;

  /**
   * Inicializa o banco de dados IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Erro ao abrir o banco de dados'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false
          });

          // Criar índices
          objectStore.createIndex('instancia', 'instancia', { unique: true });
          objectStore.createIndex('assinatura_status', 'assinatura_status', { unique: false });
          objectStore.createIndex('ia_ativa', 'ia_ativa', { unique: false });
        }
      };
    });
  }

  /**
   * Adiciona ou atualiza um registro do InfoZap
   */
  async save(data: InfoZapData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao salvar dados'));
    });
  }

  /**
   * Busca um registro por ID
   */
  async getById(id: number): Promise<InfoZapData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Erro ao buscar dados'));
    });
  }

  /**
   * Busca um registro por instância
   */
  async getByInstance(instancia: string): Promise<InfoZapData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('instancia');
      const request = index.get(instancia);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Erro ao buscar dados por instância'));
    });
  }

  /**
   * Lista todos os registros
   */
  async getAll(): Promise<InfoZapData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(new Error('Erro ao listar dados'));
    });
  }

  /**
   * Lista registros ativos (não lixo e contratados)
   */
  async getActive(): Promise<InfoZapData[]> {
    const all = await this.getAll();
    return all.filter(item => !item.lixo && item.assinatura_status === 'contratado');
  }

  /**
   * Remove um registro
   */
  async delete(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao deletar dados'));
    });
  }

  /**
   * Marca um registro como lixo (soft delete)
   */
  async markAsTrash(id: number): Promise<void> {
    const data = await this.getById(id);
    if (!data) throw new Error('Registro não encontrado');

    data.lixo = true;
    data.lixo_data = new Date();
    await this.save(data);
  }

  /**
   * Atualiza o status da assinatura
   */
  async updateStatus(id: number, status: 'acontratar' | 'contratado' | 'cancelado'): Promise<void> {
    const data = await this.getById(id);
    if (!data) throw new Error('Registro não encontrado');

    data.assinatura_status = status;
    await this.save(data);
  }

  /**
   * Atualiza dados do Stripe
   */
  async updateStripeData(
    id: number,
    stripeData: {
      infozap_stripe_si?: string;
      infozap_stripe_price?: string;
      infozap_stripe_expiration?: Date;
    }
  ): Promise<void> {
    const data = await this.getById(id);
    if (!data) throw new Error('Registro não encontrado');

    if (stripeData.infozap_stripe_si !== undefined) {
      data.infozap_stripe_si = stripeData.infozap_stripe_si;
    }
    if (stripeData.infozap_stripe_price !== undefined) {
      data.infozap_stripe_price = stripeData.infozap_stripe_price;
    }
    if (stripeData.infozap_stripe_expiration !== undefined) {
      data.infozap_stripe_expiration = stripeData.infozap_stripe_expiration;
    }

    await this.save(data);
  }

  /**
   * Limpa todos os dados do banco
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao limpar dados'));
    });
  }
}

// Exportar instância única (singleton)
export const infozapDB = new InfoZapDB();
