import Dexie, { type Table } from 'dexie';

export interface RDOLocal {
  id?: number;
  atividadeId: number;
  etapaId?: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  descricao: string;
  nota: string;
  status: string;
  efetivo: any[];
  equipamentos: any[];
  fotos: { arquivo: File | Blob }[]; 
  sincronizado: number;
  idServer?: number;
  dataCriacao: Date;
}

export interface CacheItem {
  chave: string; 
  dados: any[];
}

class BoaObraDB extends Dexie {
  rdos!: Table<RDOLocal>;
  cache!: Table<CacheItem>;

  constructor() {
    super('BoaObraDB');
    this.version(3).stores({ 
      rdos: '++id, atividadeId, data, sincronizado',
      cache: 'chave' 
    });

  }
}

export const db = new BoaObraDB();
