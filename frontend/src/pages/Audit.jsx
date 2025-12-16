import React, { useEffect, useState } from 'react';
import { Shield, Clock, Search, Filter } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterEntity, setFilterEntity] = useState('');
    const [filterAction, setFilterAction] = useState('');

    useEffect(() => {
        loadLogs();
    }, [filterEntity, filterAction]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getAuditLogs({
                entity: filterEntity,
                action: filterAction
            });
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Erro ao carregar auditoria", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" /> Auditoria do Sistema
                    </h2>
                    <p className="text-slate-500">Histórico de ações críticas e segurança.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                        value={filterEntity}
                        onChange={e => setFilterEntity(e.target.value)}
                    >
                        <option value="">Todas Entidades</option>
                        <option value="Ticket">Chamados</option>
                        <option value="User">Usuários</option>
                        <option value="Asset">Ativos</option>
                        <option value="Setting">Configurações</option>
                    </select>

                    <select
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                        value={filterAction}
                        onChange={e => setFilterAction(e.target.value)}
                    >
                        <option value="">Todas Ações</option>
                        <option value="CREATE">Criação</option>
                        <option value="UPDATE">Atualização</option>
                        <option value="DELETE">Exclusão</option>
                        <option value="LOGIN">Login</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Data/Hora</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Usuário</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Ação</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Entidade</th>
                            <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Carregando registros...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                                <td className="px-6 py-3 text-slate-500 font-mono">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                                    {log.user ? (log.user.full_name || log.user.username) : `ID ${log.user_id}`}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold font-mono
                                        ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                                    {log.entity} <span className="text-xs text-slate-400">#{log.entity_id}</span>
                                </td>
                                <td className="px-6 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={log.details}>
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
