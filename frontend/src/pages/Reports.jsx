import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, ThumbsUp, TrendingUp } from 'lucide-react';

const Card = ({ title, value, sub, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
        {sub && <p className={`text-xs font-medium ${sub.includes('+') ? 'text-emerald-600' : 'text-red-600'}`}>{sub} <span className="text-slate-400 font-normal">vs mês anterior</span></p>}
    </div>
);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState('');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role);

        if (user.role !== 'User') {
            api.getTechs().then(setTechs).catch(console.error);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        api.getReports(selectedTech).then(data => {
            setStats(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [selectedTech]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando relatórios...</div>;
    if (!stats) return <div className="p-8 text-center text-slate-500">Erro ao carregar dados.</div>;

    const categoryData = Object.keys(stats.tickets_by_category || {}).map(key => ({
        name: key,
        value: stats.tickets_by_category[key]
    }));

    const trendData = stats.weekly_trend && stats.weekly_trend.length > 0
        ? stats.weekly_trend
        : [{ name: 'Sem dados', count: 0 }];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios de Performance</h2>
                    <p className="text-slate-500">Métricas de eficiência, qualidade e volume.</p>
                </div>

                {userRole === 'Admin' && (
                    <select
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                    >
                        <option value="">Visão Geral (Todos)</option>
                        {techs.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.full_name || tech.username}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Tempo Médio (MTTR)"
                    value={`${stats.mttr_hours.toFixed(1)}h`}
                    sub="-0.5h"
                    icon={Clock}
                    color="bg-blue-100 text-blue-600"
                />
                <Card
                    title="Aderência SLA"
                    value={`${stats.sla_compliance_rate.toFixed(0)}%`}
                    sub="-2%"
                    icon={CheckCircle}
                    color={stats.sla_compliance_rate > 90 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}
                />
                <Card
                    title="Chamados Pendentes"
                    value={stats.open_tickets}
                    sub="+5"
                    icon={AlertTriangle}
                    color="bg-amber-100 text-amber-600"
                />
                <Card
                    title="Satisfação (CSAT)"
                    value={stats.satisfaction_score}
                    sub="+0.1"
                    icon={ThumbsUp}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Volume por Categoria */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-white">Top Ofensores por Categoria</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tendência Semanal */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-white">Volume de Chamados (Últimos 7 dias)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Executive Summary Table */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Resumo Executivo</h3>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-3 rounded-l-lg">Indicador</th>
                                    <th className="px-6 py-3">Meta</th>
                                    <th className="px-6 py-3">Atual</th>
                                    <th className="px-6 py-3 rounded-r-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">SLA de Resolução</td>
                                    <td className="px-6 py-4 text-slate-500">{'>'} 95%</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{stats.sla_compliance_rate.toFixed(0)}%</td>
                                    <td className="px-6 py-4">
                                        {stats.sla_compliance_rate >= 95
                                            ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Atingido</span>
                                            : <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Abaixo</span>
                                        }
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Tempo Médio (MTTR)</td>
                                    <td className="px-6 py-4 text-slate-500">{'<'} 4h</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{stats.mttr_hours.toFixed(1)}h</td>
                                    <td className="px-6 py-4">
                                        {stats.mttr_hours <= 4
                                            ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Atingido</span>
                                            : <span className="text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Alto</span>
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
