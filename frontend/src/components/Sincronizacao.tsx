import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { api } from '../lib/api';
import { CloudUpload, CheckCircle, WifiOff } from 'lucide-react';

export default function Sincronizacao() {
    const [pendentes, setPendentes] = useState(0);
    const [sincronizando, setSincronizando] = useState(false);

    const checarPendentes = async () => {
        const count = await db.rdos.where('sincronizado').equals(0).count();
        setPendentes(count);
    };

    useEffect(() => {
        checarPendentes();
        const intervalo = setInterval(checarPendentes, 5000); // Verifica a cada 5s
        return () => clearInterval(intervalo);
    }, []);

    const sincronizarAgora = async () => {
        if (pendentes === 0) return;
        setSincronizando(true);
        
        try {
            const rdosParaEnviar = await db.rdos.where('sincronizado').equals(0).toArray();
            
            for (const rdo of rdosParaEnviar) {
                
                const payload = {
                    ID_ATIVIDADE: rdo.atividadeId,
                    DATAINICIO: `${rdo.data}T${rdo.horaInicio}:00`,
                    DATAFIM: `${rdo.data}T${rdo.horaFim}:00`,
                    DESCRICAO: rdo.descricao,
                    NOTA: rdo.nota,
                    PENDENCIA: "",
                    STATUS: rdo.status,
                    EFETIVO: rdo.efetivo.map((e:any) => ({ 
                        FUNCAO: e.FUNCAO, 
                        QUANTIDADE: e.QUANTIDADE 
                    })),
                    EQUIPAMENTOS: rdo.equipamentos.map((e:any) => ({ 
                        DESCRICAO: e.DESCRICAO, 
                        QUANTIDADE: e.QUANTIDADE 
                    }))
                };

                const res = await api.post('/rdo', payload);
                const idServidor = res.data.id;

                if (rdo.fotos && rdo.fotos.length > 0) {
                    const formData = new FormData();
                    rdo.fotos.forEach((f: any) => {
                        formData.append('files', f.arquivo);
                    });
                    await api.post(`/rdo/${idServidor}/fotos`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                if (rdo.id) {
                    await db.rdos.update(rdo.id, { sincronizado: 1 });
                }
            }

            alert(`${rdosParaEnviar.length} RDOs sincronizados com sucesso!`);
            checarPendentes();

        } catch (error) {
            console.error(error);
            alert("Erro na sincronização. Verifique sua conexão com a internet.");
        } finally {
            setSincronizando(false);
        }
    };

    if (pendentes === 0) return null; 

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <button 
                onClick={sincronizarAgora}
                disabled={sincronizando}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold transition-all transform hover:scale-105"
            >
                {sincronizando ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                    </span>
                ) : (
                    <>
                        <CloudUpload size={24} />
                        <span>Sincronizar {pendentes} Pendente(s)</span>
                    </>
                )}
            </button>
        </div>
    );
}
