import React, { useEffect, useState } from 'react';
import { Monitor, AlertCircle, CheckCircle, Server, Ticket } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass }) => {
    return (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{value}</h3>
                </div>
                {/* Ícone com fundo suave e cor forte para contraste garantido */}
                <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        assets: 0,
        tickets: 0,
        openTickets: 0,
        resolvedTickets: 0,
        servers: 0
    });
    const [recentTickets, setRecentTickets] = useState([]);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const loadDashboardData = async () => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            setUserRole(user.role);

            try {
                const [assets, tickets] = await Promise.all([
                    api.getAssets(),
                    api.getTickets()
                ]);

                const assetList = Array.isArray(assets) ? assets : [];
                const ticketList = Array.isArray(tickets) ? tickets : [];

                setStats({
                    assets: assetList.length,
                    tickets: ticketList.length,
                    openTickets: ticketList.filter(t => t.status !== 'Resolvido' && t.status !== 'Fechado').length,
                    resolvedTickets: ticketList.filter(t => t.status === 'Resolvido').length,
                    servers: assetList.filter(a => a.type === 'Server').length
                });

                setRecentTickets(ticketList.slice(0, 5)); // Top 5 recent
            } catch (error) {
                console.error("Dashboard load failed", error);
            }
        };
        loadDashboardData();
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h2>
                <p className="text-slate-500 mt-1">Bem-vindo ao sistema de gestão de TI.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total de Ativos"
                    value={stats.assets}
                    icon={Monitor}
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
                />
                <StatCard
                    title="Chamados Abertos"
                    value={stats.openTickets}
                    icon={AlertCircle}
                    colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300"
                />
                <StatCard
                    title="Total de Chamados"
                    value={stats.tickets}
                    icon={CheckCircle}
                    colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300"
                />
                <StatCard
                    title="Servidores"
                    value={stats.servers}
                    icon={Server}
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Chamados Recentes</h3>
                    <div className="space-y-4">
                        {recentTickets.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">Nenhum chamado recente.</p>
                        ) : (
                            recentTickets.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'Novo' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t.title}</h4>
                                            <p className="text-xs text-slate-500">
                                                {new Date(t.created_at).toLocaleDateString()}
                                                {t.asset ? ` • ${t.asset.hostname}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">{t.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20">
                    <h3 className="font-bold text-lg mb-2">Ações Rápidas</h3>
                    <p className="text-blue-100 text-sm mb-6">Acesse as funções mais utilizadas do sistema.</p>

                    <div className="space-y-3">
                        {userRole !== 'User' && (
                            <button
                                onClick={() => navigate('/assets')}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-medium transition text-left px-4 flex items-center gap-3"
                            >
                                <Monitor className="w-5 h-5" /> Novo Ativo
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/tickets')}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-medium transition text-left px-4 flex items-center gap-3"
                        >
                            <Ticket className="w-5 h-5" /> Abrir Chamado
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
