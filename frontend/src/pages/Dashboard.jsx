import React, { useEffect, useState, useRef } from 'react';
import { Monitor, AlertCircle, CheckCircle, Server, Ticket, Bell } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import TicketDetailModal from '../components/TicketDetailModal';

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
    const [viewTicket, setViewTicket] = useState(null);

    // Ref para rastrear o ID do chamado mais recente e evitar som no load inicial
    const lastLatestTicketId = useRef(0);

    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Melodia suave (Ding-Dong)
            const now = audioContext.currentTime;

            // Primeira nota (Ding - E5)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(659.25, now);

            // Segunda nota (Dong - C5)
            oscillator.frequency.setValueAtTime(523.25, now + 0.4);

            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.3);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.8);

            oscillator.start(now);
            oscillator.stop(now + 1.0);
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

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

            // Ordenar por data decrescente se a API já não mandar
            // Garantir que estamos pegando os mais recentes reais
            // Supondo que a API já mande ordenado, se não, ordenaríamos aqui: ticketList.sort(...)

            const recent = ticketList.slice(0, 5);
            setRecentTickets(recent);

            // Verificar novos chamados para alerta sonoro
            if (ticketList.length > 0) {
                // Pega o ID do mais recente (assumindo id incremental é seguro para novidade)
                const latestId = Math.max(...ticketList.map(t => t.id));

                // Se já tínhamos um ID registrado E o novo é maior -> Novo Chamado!
                if (lastLatestTicketId.current > 0 && latestId > lastLatestTicketId.current) {
                    console.log("Novo chamado detectado! ID:", latestId);
                    playNotificationSound();
                }
                lastLatestTicketId.current = latestId;
            }

        } catch (error) {
            console.error("Dashboard load failed", error);
        }
    };

    useEffect(() => {
        loadDashboardData();
        // Polling a cada 15 segundos
        const interval = setInterval(loadDashboardData, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h2>
                    <p className="text-slate-500 mt-1">Bem-vindo ao sistema de gestão de TI.</p>
                </div>
                {/* Indicador de Auto-Refresh */}
                <div className="text-xs text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Atualização em tempo real (15s)
                </div>
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
                                <div key={t.id} onClick={() => setViewTicket(t)} className="cursor-pointer flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'Novo' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t.title}</h4>
                                            <p className="text-xs text-slate-500">
                                                #{t.id} • {new Date(t.created_at).toLocaleDateString()}
                                                {t.asset ? ` • ${t.asset.hostname}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${t.status === 'Novo' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                        t.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                            'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>{t.status}</span>
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
            {viewTicket && (
                <TicketDetailModal
                    ticket={viewTicket}
                    onClose={() => setViewTicket(null)}
                    onUpdate={loadDashboardData}
                    currentUserRole={userRole}
                />
            )}
        </div>
    );
}


export default Dashboard;
