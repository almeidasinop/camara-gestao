import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Clock, AlertCircle, CheckCircle, TrendingUp, Sun, Moon, Shield } from 'lucide-react';

const StatCard = ({ title, value, color, icon: Icon }) => (
    <div className={`p-8 rounded-3xl ${color} text-white shadow-xl flex items-center justify-between`}>
        <div>
            <p className="text-xl font-medium opacity-80 mb-2 uppercase tracking-wider">{title}</p>
            <h3 className="text-7xl font-bold">{value}</h3>
        </div>
        <Icon className="w-24 h-24 opacity-20" />
    </div>
);

export default function TvDashboard() {
    const [stats, setStats] = useState({ open: 0, critical: 0, today: 0, slaBreach: 0 });
    const [criticalTickets, setCriticalTickets] = useState([]);
    const [theme, setTheme] = useState('dark');

    // Auto Refresh every 30s
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            // Buscando dados reais do backend (bypass RLS de user)
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

        } catch (e) {
            console.error("Erro dashboard TV", e);
        }
    };

    return (
        <div className={`fixed inset-0 w-screen h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} p-8 font-sans`}>

            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-6">
                    <img src="/favicon.png" className="w-20 h-20 rounded-2xl shadow-lg" alt="Logo" />
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Monitoramento TI</h1>
                        <p className="text-xl opacity-60 font-medium">{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* Theme toggler or status indicator */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full font-bold animate-pulse">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        ONLINE
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-8 mb-10">
                <StatCard
                    title="Fila Aberta"
                    value={stats.open}
                    color="bg-indigo-600"
                    icon={Clock}
                />
                <StatCard
                    title="Alta Prioridade"
                    value={stats.critical}
                    color={stats.critical > 0 ? "bg-red-600 animate-pulse" : "bg-emerald-600"}
                    icon={AlertCircle}
                />
                <StatCard
                    title="Abertos Hoje"
                    value={stats.today}
                    color="bg-blue-600"
                    icon={TrendingUp}
                />
                <StatCard
                    title="SLA Violado"
                    value={stats.slaBreach}
                    color={stats.slaBreach > 0 ? "bg-amber-600" : "bg-slate-700"}
                    icon={Shield}
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-3 gap-8 h-[calc(100vh-340px)]">

                {/* Critical List */}
                <div className="col-span-2 bg-slate-900/50 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <AlertCircle className="text-red-500" />
                        Fila de Atendimento Prioritário
                    </h2>

                    <div className="space-y-4 flex-1 overflow-visible">
                        {criticalTickets.map(t => (
                            <div key={t.id} className="bg-slate-800 p-6 rounded-2xl border-l-8 border-indigo-500 flex justify-between items-center shadow-lg transform transition hover:scale-[1.01]">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="bg-slate-900 text-slate-300 px-3 py-1 rounded-lg text-sm font-bold font-mono">#{t.id}</span>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase ${t.priority === 'Alta' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>{t.priority}</span>
                                        <span className="text-slate-400 text-sm">{new Date(t.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                    </div>
                                    <h3 className="text-xl font-bold truncate max-w-xl">{t.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                        {t.category?.name || 'Geral'} • {t.creator?.full_name || 'Desconhecido'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Responsável</div>
                                    <div className="flex items-center justify-end gap-2">
                                        {t.assigned_to ? (
                                            <span className="font-bold text-lg">{t.assigned_to.full_name?.split(' ')[0]}</span>
                                        ) : (
                                            <span className="text-slate-500 italic">--</span>
                                        )}
                                        {t.assigned_to?.avatar && <img src={t.assigned_to.avatar} className="w-8 h-8 rounded-full bg-slate-700" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {criticalTickets.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                <CheckCircle className="w-24 h-24 mb-4 opacity-20" />
                                <p className="text-2xl font-medium">Tudo tranquilo por aqui.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats / Messages */}
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-8 backdrop-blur-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-400 mb-6 uppercase tracking-wider">Avisos do Sistema</h3>
                        <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl mb-4">
                            <h4 className="font-bold text-blue-400 text-lg mb-2">🚀 Backup Realizado</h4>
                            <p className="text-sm opacity-80">O backup automático foi executado com sucesso às 03:00 AM. Seus dados estão seguros.</p>
                        </div>
                        <div className="bg-amber-600/10 border border-amber-500/30 p-6 rounded-2xl mb-4">
                            <h4 className="font-bold text-amber-400 text-lg mb-2">⚠️ Manutenção</h4>
                            <p className="text-sm opacity-80">Lembrete: Atualização do servidor agendada para sexta-feira às 18h.</p>
                        </div>
                    </div>

                    <div className="text-center opacity-30 mt-auto">
                        <img src="/qr-placeholder.png" className="w-32 h-32 mx-auto bg-white p-2 rounded-xl mb-4 hidden" />
                        <p className="text-sm font-medium">Câmara Municipal Dashboard v2.0</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
