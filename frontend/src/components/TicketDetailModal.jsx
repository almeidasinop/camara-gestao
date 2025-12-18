import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const PriorityBadge = ({ priority }) => {
    const styles = {
        Alta: 'bg-red-100 text-red-700',
        Media: 'bg-amber-100 text-amber-700',
        Baixa: 'bg-blue-100 text-blue-700',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[priority] || 'bg-slate-100 text-slate-600'}`}>
            {priority}
        </span>
    );
};

export const StatusBadge = ({ status }) => {
    const styles = {
        Novo: 'bg-purple-100 text-purple-700',
        'Em Andamento': 'bg-blue-100 text-blue-700',
        Resolvido: 'bg-emerald-100 text-emerald-700',
        Fechado: 'bg-slate-100 text-slate-700',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
};

const TicketDetailModal = ({ ticket, onClose, onUpdate, currentUserRole }) => {
    const [newComment, setNewComment] = useState('');
    const [statusLoading, setStatusLoading] = useState(false);

    // Transfer Logic
    const [isAssigning, setIsAssigning] = useState(false);
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState('');

    useEffect(() => {
        if (isAssigning && currentUserRole !== 'User') {
            api.getTechs().then(setTechs).catch(() => { });
        }
    }, [isAssigning, currentUserRole]);

    const handleAssign = async () => {
        if (!selectedTech) return;
        setStatusLoading(true);
        try {
            await api.assignTicket(ticket.id, selectedTech);
            alert("Chamado transferido!");
            onUpdate();
            onClose();
        } catch (e) {
            alert("Erro ao transferir chamado");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!confirm(`Alterar status para ${newStatus}?`)) return;
        setStatusLoading(true);
        try {
            await api.updateTicketStatus(ticket.id, newStatus);
            // Se encerrar, pode pedir solução obrigatória aqui (future enhancement)
            onUpdate();
            onClose();
        } catch (e) {
            alert("Erro ao atualizar status");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.addTicketComment(ticket.id, newComment);
            setNewComment('');
            onUpdate(); // Reload to see new comment (could optimize to just push local)
            // onClose(); // Comentado para manter o usuário no chat após enviar
        } catch (e) {
            alert("Erro ao enviar comentário");
        }
    };

    // Ordenar comentários do mais antigo para novo ou vice versa? Chat usually newest at bottom.
    // Backend retorna na ordem que foi salvo? Normalmente sim.
    const comments = ticket.comments || [];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-slate-500">#{ticket.id}</span>
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{ticket.title}</h3>
                        <div className="text-sm text-slate-500 flex gap-4">
                            <span>📅 {new Date(ticket.created_at).toLocaleString()}</span>
                            {ticket.category && <span>📂 {ticket.category.name}</span>}
                            {ticket.assigned_to && <span>👤 {ticket.assigned_to.full_name || ticket.assigned_to.username}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Description */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descrição do Problema</h4>
                        <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.asset && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                                Ativo Vinculado: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.asset.hostname}</span> ({ticket.asset.ip_address})
                            </div>
                        )}
                        <div className="mt-2 text-xs text-slate-500">
                            Aberto por: <span className="font-medium">{ticket.creator?.full_name || 'Usuário'}</span> • {ticket.sector}
                        </div>
                    </div>

                    {/* Timeline / Comments */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Histórico de Atendimento</h4>
                        {comments.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4 italic">Nenhum comentário ou atualização ainda.</p>
                        ) : (
                            comments.map((comment, idx) => (
                                <div key={idx} className={`flex gap-3 ${comment.author === 'System Bot' ? 'justify-center' : ''}`}>
                                    {comment.author !== 'System Bot' && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                            {comment.author ? comment.author.substring(0, 2).toUpperCase() : 'US'}
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-xl text-sm max-w-[80%] ${comment.author === 'System Bot'
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs border border-amber-100 dark:border-amber-800'
                                        : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm'
                                        }`}>
                                        <div className="flex justify-between items-baseline gap-4 mb-1">
                                            <span className="font-semibold">{comment.author}</span>
                                            <span className="text-[10px] opacity-70">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer - Actions & Input */}
                <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                    {/* Status Actions */}
                    {isAssigning ? (
                        <div className="flex gap-2 items-center mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 animate-fade-in">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Transferir para:</span>
                            <select
                                className="px-2 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded text-sm outline-none text-slate-800 dark:text-white"
                                value={selectedTech}
                                onChange={e => setSelectedTech(e.target.value)}
                            >
                                <option value="">Selecione um técnico...</option>
                                {techs.map(t => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
                            </select>
                            <button onClick={handleAssign} disabled={!selectedTech || statusLoading} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Confirmar</button>
                            <button onClick={() => setIsAssigning(false)} className="px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm">Cancelar</button>
                        </div>
                    ) : (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {currentUserRole !== 'User' && ticket.status !== 'Fechado' && (
                                <button disabled={statusLoading} onClick={() => setIsAssigning(true)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition whitespace-nowrap flex items-center gap-1">
                                    👤 Transferir
                                </button>
                            )}
                            {currentUserRole !== 'User' && ticket.status === 'Novo' && (
                                <button disabled={statusLoading} onClick={() => handleStatusChange('Em Andamento')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition whitespace-nowrap">
                                    ▶ Iniciar Atendimento
                                </button>
                            )}
                            {currentUserRole !== 'User' && (ticket.status === 'Em Andamento' || ticket.status === 'Novo') && (
                                <button disabled={statusLoading} onClick={() => handleStatusChange('Resolvido')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition whitespace-nowrap">
                                    ✅ Resolver
                                </button>
                            )}
                            {ticket.status === 'Resolvido' && (
                                // User ou Tech pode fechar/reabrir? Geralmente user fecha.
                                <button disabled={statusLoading} onClick={() => handleStatusChange('Fechado')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition whitespace-nowrap">
                                    🔒 Fechar Chamado
                                </button>
                            )}
                            {ticket.status === 'Resolvido' && (
                                <button disabled={statusLoading} onClick={() => handleStatusChange('Em Andamento')} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition whitespace-nowrap">
                                    ↩ Reabrir
                                </button>
                            )}
                        </div>
                    )}

                    {/* Comment Input */}
                    <form onSubmit={handleSendComment} className="flex gap-2">
                        <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Escreva uma atualização ou solução..."
                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-gray-100 placeholder:text-slate-400"
                        />
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition disabled:opacity-50">
                            Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailModal;
