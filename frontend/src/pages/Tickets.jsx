import React, { useEffect, useState } from 'react';
import { Plus, Search, Ticket, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import TicketDetailModal, { PriorityBadge, StatusBadge } from '../components/TicketDetailModal';



export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [assets, setAssets] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModaNewOpen, setIsModalNewOpen] = useState(false);
    const [viewTicket, setViewTicket] = useState(null); // Ticket selecionado para ver detalhes
    const [userRole, setUserRole] = useState('');

    // History State for Suggestions
    const [sectorHistory, setSectorHistory] = useState([]);

    const [patrimonyHistory, setPatrimonyHistory] = useState([]);
    const [usersList, setUsersList] = useState([]); // Para Techs selecionarem quem pediu

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Media',
        asset_id: '',
        category_id: '',
        sector: '',
        patrimony: '',
        requester_id: '' // Novo campo
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role);

        // Load history
        setSectorHistory(JSON.parse(localStorage.getItem('ticket_sectors') || '[]'));
        setPatrimonyHistory(JSON.parse(localStorage.getItem('ticket_patrimonies') || '[]'));

        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ticketsData, assetsData, categoriesData] = await Promise.all([
                api.getTickets(),
                api.getAssets(),
                api.getCategories()
            ]);
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            setAssets(Array.isArray(assetsData) ? assetsData : []);
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);

            // Se for Tech ou Admin, carregar lista de usuários para seleção
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role !== 'User') {
                const usersData = await api.getUsersList();
                setUsersList(Array.isArray(usersData) ? usersData : []);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                asset_id: formData.asset_id ? parseInt(formData.asset_id) : null,
                category_id: formData.category_id ? parseInt(formData.category_id) : null,
                requester_id: formData.requester_id ? parseInt(formData.requester_id) : null,
            };
            await api.createTicket(payload);

            // Save to history
            if (formData.sector && !sectorHistory.includes(formData.sector)) {
                const newHistory = [...sectorHistory, formData.sector];
                setSectorHistory(newHistory);
                localStorage.setItem('ticket_sectors', JSON.stringify(newHistory));
            }
            if (formData.patrimony) {
                // Split by comma if multiple to save individual suggestions? Or save whole string? 
                // Let's save the whole string for now or just unique entries
                if (!patrimonyHistory.includes(formData.patrimony)) {
                    const newHistory = [...patrimonyHistory, formData.patrimony];
                    setPatrimonyHistory(newHistory);
                    localStorage.setItem('ticket_patrimonies', JSON.stringify(newHistory));
                }
            }

            setIsModalNewOpen(false);
            setFormData({ title: '', description: '', priority: 'Media', asset_id: '', category_id: '', sector: '', patrimony: '' });
            loadData();
        } catch (error) {
            alert('Erro ao criar chamado');
        }
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0"> {/* Padding bottom extra para mobile se tiver nav bar fixa */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Central de Chamados</h2>
                    <p className="text-slate-500 text-sm">Gerencie solicitações de suporte e incidentes.</p>
                </div>
                <button
                    onClick={() => setIsModalNewOpen(true)}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 md:py-2 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/30 font-medium"
                >
                    <Plus className="w-5 h-5" /> Abrir Chamado
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou ID..."
                        className="w-full pl-10 pr-4 py-3 md:py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-700 dark:text-slate-200"
                    />
                </div>
                <select className="bg-slate-50 dark:bg-slate-900 px-4 py-3 md:py-2 rounded-lg outline-none border-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200">
                    <option>Todos os Status</option>
                    <option>Novo</option>
                    <option>Em Andamento</option>
                    <option>Resolvido</option>
                </select>
            </div>

            {/* Tickets List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center p-8 text-slate-500">Carregando chamados...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">Nenhum chamado encontrado.</div>
                ) : (
                    tickets.map((ticket) => (
                        <div key={ticket.id} onClick={() => setViewTicket(ticket)} className="cursor-pointer bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start group gap-4 md:gap-0">
                            <div className="flex gap-4 w-full">
                                <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition shrink-0`}>
                                    <Ticket className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">#{ticket.id}</span>
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{ticket.title}</h3>
                                        <PriorityBadge priority={ticket.priority} />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2 line-clamp-2 md:line-clamp-1">{ticket.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleDateString()}
                                        </span>
                                        {ticket.asset && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                                                🖥 {ticket.asset.hostname}
                                            </span>
                                        )}
                                        {ticket.sector && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">
                                                🏢 {ticket.sector}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-2 pl-[3.5rem] md:pl-0">
                                <StatusBadge status={ticket.status} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Ticket Detail Modal */}
            {viewTicket && (
                <TicketDetailModal
                    ticket={viewTicket}
                    onClose={() => setViewTicket(null)}
                    onUpdate={loadData}
                    currentUserRole={userRole}
                />
            )}

            {/* New Ticket Modal */}
            {isModaNewOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Novo Chamado</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria do Serviço</label>
                                <select
                                    required
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                >
                                    <option value="">Selecione o tipo de serviço...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="Ex: PC não liga"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Setor</label>
                                    <input
                                        list="sectors"
                                        value={formData.sector}
                                        onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        placeholder="Ex: Financeiro"
                                    />
                                    <datalist id="sectors">
                                        {sectorHistory.map((s, i) => <option key={i} value={s} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nº Patrimônio(s)</label>
                                    <input
                                        list="patrimonies"
                                        value={formData.patrimony}
                                        onChange={e => setFormData({ ...formData, patrimony: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        placeholder="Ex: 1203, 1204"
                                    />
                                    <datalist id="patrimonies">
                                        {patrimonyHistory.map((p, i) => <option key={i} value={p} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                                <textarea
                                    rows="3"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="Descreva o problema detalhadamente..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridade</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Media">Média</option>
                                        <option value="Alta">Alta</option>
                                    </select>
                                </div>
                                {/* Mostrar select de ativos apenas se NÃO for usuário comum (ou se ele quiser vincular ao inventário real) */}
                                {userRole !== 'User' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vincular Ativo (Opcional)</label>
                                        <select
                                            value={formData.asset_id}
                                            onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        >
                                            <option value="">-- Nenhum --</option>
                                            {assets.map(asset => (
                                                <option key={asset.id} value={asset.id}>
                                                    {asset.hostname} ({asset.ip_address})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Solicitante (Apenas para Tech/Admin) */}
                            {userRole !== 'User' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solicitante (Usuário Final)</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={formData.requester_id}
                                        onChange={e => setFormData({ ...formData, requester_id: e.target.value })}
                                    >
                                        <option value="">-- Eu mesmo (Logado) --</option>
                                        {usersList.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Selecione se estiver abrindo chamado em nome de outra pessoa.</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalNewOpen(false)}
                                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                                >
                                    Criar Chamado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


