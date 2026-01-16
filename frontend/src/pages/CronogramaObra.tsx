import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Etapa {
  ID: number;
  ID_LOCAL: number;
  NOME_ETAPA: string;
  ORDEM: number;
  STATUS: string;
  PERCENTUAL: number;
}

const CronogramaObra: React.FC = () => {
    const [etapas, setEtapas] = useState<Etapa[]>([]);
    const [loading, setLoading] = useState(true);
    const [idLocal] = useState(1);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/etapas/obra/${idLocal}`);
            setEtapas(response.data);
        } catch (error) {
            console.error("Erro ao buscar etapas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [idLocal]);

    const handleImportar = async () => {
        if (window.confirm("Deseja importar o cronograma padrão de 14 etapas para esta obra?")) {
            try {
                await api.post(`/etapas/importar/${idLocal}`);
                alert("Cronograma criado com sucesso!");
                carregarDados(); 
            } catch (error: any) {
                alert("Erro ao importar: " + (error.response?.data?.detail || "Erro desconhecido"));
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ color: '#333' }}>Cronograma da Obra</h2>
            <p style={{ color: '#666' }}>Gerenciamento de Etapas e Avanço Físico</p>
            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

            {loading ? (
                <p>Carregando cronograma...</p>
            ) : (
                <>
                    {etapas.length === 0 && (
                        <div style={{ 
                            textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', 
                            borderRadius: '8px', border: '2px dashed #ccc', marginTop: '20px'
                        }}>
                            <h3 style={{ color: '#555' }}>Esta obra ainda não possui um cronograma.</h3>
                            <p style={{ color: '#777' }}>Importe o modelo padrão para começar.</p>
                            <button 
                                onClick={handleImportar}
                                style={{
                                    padding: '12px 24px', fontSize: '16px', backgroundColor: '#28a745',
                                    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    marginTop: '15px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                     Importar Modelo Padrão
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                        {etapas.map((etapa) => (
                            <div key={etapa.ID} style={{
                                border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px',
                                backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <strong style={{ fontSize: '1.1em', color: '#0056b3', display: 'block' }}>
                                        {etapa.ORDEM}. {etapa.NOME_ETAPA}
                                    </strong>
                                    <div style={{ marginTop: '8px' }}>
                                        <span style={{ 
                                            backgroundColor: etapa.STATUS === 'PENDENTE' ? '#f0f0f0' : '#d4edda',
                                            color: etapa.STATUS === 'PENDENTE' ? '#666' : '#155724',
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.85em', fontWeight: 'bold'
                                        }}>
                                            {etapa.STATUS}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.5em', color: '#333' }}>
                                        {etapa.PERCENTUAL}%
                                    </div>
                                    <div style={{ fontSize: '0.8em', color: '#999' }}>Concluído</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default CronogramaObra;
