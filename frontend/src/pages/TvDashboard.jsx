import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Clock, AlertCircle, CheckCircle, TrendingUp, Sun, Moon, Shield, Monitor, Activity, Server, Wifi } from 'lucide-react';

const StatCard = ({ title, value, color, icon: Icon, trend }) => (
    <div className={`relative overflow-hidden rounded-2xl ${color} p-5 shadow-lg border border-white/10`}>
        <div className="flex justify-between items-start z-10 relative">
            <div>
                <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-4xl font-black tracking-tight">{value}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
        {/* Decorative background circle */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>
);

export default function TvDashboard() {
    const [stats, setStats] = useState({ open: 0, critical: 0, today: 0, slaBreach: 0 });
    const [criticalTickets, setCriticalTickets] = useState([]);
    const [systemNotice, setSystemNotice] = useState('');
    const [time, setTime] = useState(new Date());

    // Relógio em tempo real
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto Refresh dos dados (30s)
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getDashboardKPIs();
            if (data && data.stats) {
                setStats({
                    open: data.stats.open,
                    critical: data.stats.critical,
                    today: data.stats.today,
                    slaBreach: data.stats.sla_breach
                });
            }
            if (data && data.critical_tickets) {
                setCriticalTickets(data.critical_tickets);
            }

            const settingsData = await api.getSettings();
            const notice = settingsData.find(s => s.key === 'system_notice')?.value;
            setSystemNotice(notice);

        } catch (e) {
            console.error("Erro dashboard TV", e);
        }
    };

    const isSystemHealthy = stats.critical === 0 && stats.slaBreach === 0;

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white">

            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 ${isSystemHealthy ? 'opacity-50' : 'animate-pulse'}`}></div>

            <div className="relative z-10 flex flex-col h-full p-6 md:p-8 gap-6">

                {/* Header Compacto */}
                <header className="flex justify-between items-end border-b border-slate-800/50 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight leading-none text-white">Monitoramento TI</h1>
                            <p className="text-sm text-slate-400 font-medium mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Sistema Operacional • Câmara Municipal
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-light tabular-nums tracking-tighter text-white/90">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {time.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}
                        </p>
                    </div>
                </header>

                {/* KPI Grid - Mais compacto */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        title="Fila Aberta"
                        value={stats.open}
                        color="bg-gradient-to-br from-indigo-600 to-indigo-800"
                        icon={Server}
                    />
                    <StatCard
                        title="Prioridade Alta"
                        value={stats.critical}
                        color={stats.critical > 0 ? "bg-gradient-to-br from-red-600 to-rose-700 animate-pulse-slow" : "bg-gradient-to-br from-emerald-600 to-emerald-800"}
                        icon={AlertCircle}
                    />
                    <StatCard
                        title="Abertos Hoje"
                        value={stats.today}
                        color="bg-gradient-to-br from-blue-600 to-blue-800"
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="SLA Violado"
                        value={stats.slaBreach}
                        color={stats.slaBreach > 0 ? "bg-gradient-to-br from-orange-600 to-orange-800" : "bg-slate-800"}
                        icon={Shield}
                    />
                </div>

                {/* Main Layout Divided */}
                <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                    {/* Lista de Chamados Prioritários (2/3 da tela) */}
                    <div className="col-span-8 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80">
                            <h3 className="font-bold text-slate-300 flex items-center gap-2 uppercase text-sm tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Fila de Atendimento Prioritário
                            </h3>
                            <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono">LIVE FEED</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-2">
                            {criticalTickets.length > 0 ? (
                                criticalTickets.map(ticket => (
                                    <div key={ticket.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:bg-slate-800 transition-all group">
                                        <div className="flex-shrink-0">
                                            {ticket.priority === 'Alta' ? (
                                                <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30">
                                                    <AlertCircle size={20} />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                                    <Monitor size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-slate-500">#{ticket.id}</span>
                                                <h4 className="font-semibold text-white truncate text-lg">{ticket.title}</h4>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                <span className="flex items-center gap-1"><Monitor size={12} /> {ticket.category?.name || 'Geral'}</span>
                                                <span className="text-slate-600">•</span>
                                                <span>{ticket.creator?.full_name || ticket.creator?.username}</span>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                                                    {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ticket.status === 'Novo' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                }`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-40">
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    </div>
                                    <p className="text-xl font-medium text-slate-300">Nenhum chamado crítico na fila</p>
                                    <p className="text-sm text-slate-500">Excelente trabalho, equipe!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Informativa (1/3 da tela) */}
                    <div className="col-span-4 flex flex-col gap-4">

                        {/* Status da Rede / Avisos */}
                        <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 backdrop-blur-sm relative overflow-hidden">
                            {systemNotice ? (
                                <div className="z-10 relative">
                                    <h3 className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Comunicado Oficial
                                    </h3>
                                    <p className="text-2xl font-light text-white leading-relaxed">
                                        {systemNotice}
                                    </p>
                                    <div className="mt-6 flex items-center gap-2 text-xs text-amber-500/50">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                        Prioridade Alta • Exibindo até revogação
                                    </div>
                                </div>
                            ) : (
                                <div className="z-10 relative h-full flex flex-col justify-center">
                                    <h3 className="text-emerald-500 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                        <Wifi className="w-4 h-4" /> Status da Rede
                                    </h3>
                                    <p className="text-3xl font-bold text-white mb-2">Operacional</p>
                                    <p className="text-slate-400 text-sm">Todos os serviços rodando dentro dos parâmetros de performance.</p>

                                    <div className="mt-8 space-y-3">
                                        <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                                            <span className="text-slate-500">Link Principal</span>
                                            <span className="text-emerald-400 font-mono">UP 100%</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                                            <span className="text-slate-500">Link Backup</span>
                                            <span className="text-emerald-400 font-mono">UP 100%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Efeito de fundo */}
                            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
                        </div>

                        {/* Rodapé Tech */}
                        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 text-center">
                            <p className="text-xs text-slate-500 font-mono">
                                SERVER: CÂMARA-DC01 • UPTIME: 99.9% • V{__APP_VERSION__ || '1.0'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
