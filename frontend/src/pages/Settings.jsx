import React, { useState, useEffect } from 'react';
import { Save, Trash2, Download, Database, Monitor, AlertTriangle, Layers, Edit2, Plus, X, Server } from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
    const [sectors, setSectors] = useState([]);
    const [patrimonies, setPatrimonies] = useState([]);

    const [categories, setCategories] = useState([]);
    const [techs, setTechs] = useState([]);
    const [userRole, setUserRole] = useState('');

    // System Settings State
    const [systemSettings, setSystemSettings] = useState([]);

    // Category Modal State
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); // If null, create mode
    const [catForm, setCatForm] = useState({ name: '', default_user_id: '', escalation_user_id: '', sla_timeout: 4 });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('[Settings] Usuário do localStorage:', user);
        setUserRole(user.role);

        setSectors(JSON.parse(localStorage.getItem('ticket_sectors') || '[]'));
        setPatrimonies(JSON.parse(localStorage.getItem('ticket_patrimonies') || '[]'));

        // Carregar dados do admin imediatamente se for admin
        if (user.role === 'Admin') {
            console.log('[Settings] Usuário é Admin, carregando dados...');
            loadAdminData();
        } else {
            console.log('[Settings] Usuário NÃO é Admin, role:', user.role);
        }
    }, []); // Executar apenas uma vez ao montar o componente

    const loadAdminData = async () => {
        console.log('[Settings] Carregando dados do admin...');
        try {
            const [cats, techList, settingsData] = await Promise.all([
                api.getCategories(),
                api.getTechs(),
                api.getSettings()
            ]);
            console.log('[Settings] Dados carregados:', { cats, techList, settingsData });
            setCategories(cats || []);
            setTechs(techList || []);
            setSystemSettings(settingsData || []);
        } catch (e) {
            console.error("[Settings] Erro ao carregar dados:", e);
        }
    };

    const handleOpenCatModal = (cat = null) => {
        if (cat) {
            setEditingCategory(cat);
            setCatForm({
                name: cat.name,
                default_user_id: cat.default_user_id,
                escalation_user_id: cat.escalation_user_id || '',
                sla_timeout: cat.sla_timeout || 4
            });
        } else {
            setEditingCategory(null);
            setCatForm({ name: '', default_user_id: '', escalation_user_id: '', sla_timeout: 4 });
        }
        setIsCatModalOpen(true);
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...catForm,
                default_user_id: parseInt(catForm.default_user_id),
                escalation_user_id: catForm.escalation_user_id ? parseInt(catForm.escalation_user_id) : null,
                sla_timeout: parseInt(catForm.sla_timeout)
            };

            if (editingCategory) {
                await api.updateCategory(editingCategory.id, payload);
            } else {
                await api.createCategory(payload);
            }
            setIsCatModalOpen(false);
            loadAdminData();
            alert("Categoria salva com sucesso!");
        } catch (e) {
            alert("Erro ao salvar categoria");
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Tem certeza? Isso pode afetar tickets existentes.")) return;
        try {
            await api.deleteCategory(id);
            loadAdminData();
        } catch (e) {
            alert("Erro ao deletar");
        }
    };

    const handleToggleSetting = async (key, currentValue) => {
        const newValue = currentValue === 'true' ? 'false' : 'true';
        try {
            await api.updateSetting(key, newValue);
            // Optimistic update
            setSystemSettings(systemSettings.map(s => s.key === key ? { ...s, value: newValue } : s));
        } catch (e) {
            alert("Erro ao alterar configuração");
        }
    };

    const clearHistory = (key, setFunc) => {
        if (window.confirm('Tem certeza que deseja limpar este histórico de sugestões?')) {
            localStorage.removeItem(key);
            setFunc([]);
        }
    };

    const handleBackup = async () => {
        try {
            const confirmed = window.confirm('Deseja baixar um backup completo do sistema (Ativos, Usuários e Chamados)?');
            if (!confirmed) return;

            // Fetch all data
            // Nota: Isso pode ser pesado se o banco for enorme, mas para uso atual serve.
            // Idealmente teria um endpoint /backup no backend
            const assets = await api.getAssets().catch(() => []);
            const users = await api.getUsers().catch(() => []);

            // Tickets pode não ter endpoint exposto publicamente na api.js ainda, vamos checar.
            // Assumindo que api.getTickets existe (usado na pagina de Tickets)
            let tickets = [];
            try {
                // Precisamos instanciar o api.getTickets se não estiver importado, mas api é objeto
                // Vamos supor que getTickets já está no api.js (vou verificar depois e corrigir se nao)
                tickets = await fetch('http://localhost:8080/api/v1/tickets', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(res => res.ok ? res.json() : []);
            } catch (e) { console.error(e); }

            const backupData = {
                metadata: {
                    version: "1.0",
                    date: new Date().toISOString(),
                    system: "CâmaraGestão"
                },
                data: {
                    assets,
                    users,
                    tickets
                }
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_full_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            alert('Backup gerado com sucesso!');
        } catch (error) {
            alert('Erro ao gerar backup: ' + error.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h2>
                <p className="text-slate-500">Gerencie preferências e dados do sistema.</p>
            </div>

            {/* Aparência */}
            {/*
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-indigo-500" /> Aparência
                </h3>
                <div className="flex gap-4">
                    <button className="flex-1 p-4 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 flex flex-col items-center gap-2">
                        <Monitor className="w-6 h-6" /> Sistema
                    </button>
                    <button className="flex-1 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 flex flex-col items-center gap-2 transition">
                        <Sun className="w-6 h-6" /> Claro
                    </button>
                    <button className="flex-1 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 flex flex-col items-center gap-2 transition">
                        <Moon className="w-6 h-6" /> Escuro
                    </button>
                </div>
            </div>
            */}

            {/* Service Categories Management (Admin only) */}
            {userRole === 'Admin' && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-500" /> Gestão de Serviços e SLA
                        </h3>
                        <button
                            onClick={() => handleOpenCatModal()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition"
                        >
                            <Plus className="w-4 h-4" /> Nova Categoria
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Nome do Serviço</th>
                                    <th className="px-4 py-3">Resp. Padrão</th>
                                    <th className="px-4 py-3">Encaminhar Para</th>
                                    <th className="px-4 py-3">SLA (Horas)</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{cat.name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {cat.default_user?.full_name || cat.default_user?.username || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {cat.escalation_user ? (
                                                <span className="flex items-center gap-1 text-amber-600">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {cat.escalation_user.full_name || cat.escalation_user.username}
                                                </span>
                                            ) : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className="px-4 py-3 font-mono">{cat.sla_timeout}h</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => handleOpenCatModal(cat)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded transition">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Nenhuma categoria cadastrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {systemSettings.map(setting => (
                    <div key={setting.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">{setting.description}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-1">{setting.key}</p>
                        </div>
                        <button
                            onClick={() => handleToggleSetting(setting.key, setting.value)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${setting.value === 'true' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${setting.value === 'true' ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                ))}
                {systemSettings.length === 0 && <p className="text-slate-500 text-sm">Carregando permissões...</p>}
            </div>
            {/* Config Modal */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <button onClick={() => setIsCatModalOpen(false)}><X className="text-slate-400 w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Serviço</label>
                                <input required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Técnico Responsável (Padrão)</label>
                                <select required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    value={catForm.default_user_id} onChange={e => setCatForm({ ...catForm, default_user_id: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    {techs.map(t => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SLA (Horas)</label>
                                    <input type="number" min="1" required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={catForm.sla_timeout} onChange={e => setCatForm({ ...catForm, sla_timeout: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Escalonar Para (Atraso)</label>
                                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={catForm.escalation_user_id} onChange={e => setCatForm({ ...catForm, escalation_user_id: e.target.value })}>
                                        <option value="">-- Ninguém --</option>
                                        {techs.map(t => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsCatModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition font-medium">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dados e Armazenamento */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" /> Dados do Sistema
                </h3>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">Backup Completo</h4>
                            <p className="text-sm text-slate-500">Baixe uma cópia de todos os ativos, usuários e chamados.</p>
                        </div>
                        <button
                            onClick={handleBackup}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                        >
                            <Download className="w-4 h-4" /> Baixar JSON
                        </button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-3">Histórico de Sugestões (Autopreenchimento)</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400 text-sm">Setores Salvos ({sectors.length})</span>
                                <button
                                    onClick={() => clearHistory('ticket_sectors', setSectors)}
                                    className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                    disabled={sectors.length === 0}
                                >
                                    <Trash2 className="w-3 h-3" /> Limpar
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400 text-sm">Patrimônios Recentes ({patrimonies.length})</span>
                                <button
                                    onClick={() => clearHistory('ticket_patrimonies', setPatrimonies)}
                                    className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                    disabled={patrimonies.length === 0}
                                >
                                    <Trash2 className="w-3 h-3" /> Limpar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integração Active Directory (LDAP) */}
            {userRole === 'Admin' && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8 border-l-4 border-l-blue-500">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-600" /> Integração Active Directory (LDAP)
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer"
                                    checked={settings.find(s => s.key === 'ldap_enabled')?.value === 'true'}
                                    onChange={(e) => handleUpdateSetting('ldap_enabled', e.target.checked ? 'true' : 'false')}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-900 dark:text-gray-300">Habilitar Autenticação LDAP</span>
                            </label>
                            <span className="text-xs text-slate-500">Permite que usuários façam login com suas credenciais de rede AD.</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Servidor (IP)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="ex: 192.168.1.5"
                                    value={settings.find(s => s.key === 'ldap_host')?.value || ''}
                                    onChange={(e) => handleUpdateSetting('ldap_host', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Porta</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="ex: 389"
                                    value={settings.find(s => s.key === 'ldap_port')?.value || ''}
                                    onChange={(e) => handleUpdateSetting('ldap_port', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Domínio (NetBIOS)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="ex: CAMARA"
                                    value={settings.find(s => s.key === 'ldap_domain')?.value || ''}
                                    onChange={(e) => handleUpdateSetting('ldap_domain', e.target.value)}
                                />
                                <p className="text-xs text-slate-500 mt-1">Prefixo usado para login: DOMINIO\usuario</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base DN (Busca de Nome)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    placeholder="ex: dc=camara,dc=local"
                                    value={settings.find(s => s.key === 'ldap_basedn')?.value || ''}
                                    onChange={(e) => handleUpdateSetting('ldap_basedn', e.target.value)}
                                />
                                <p className="text-xs text-slate-500 mt-1">Opcional. Usado para buscar o Nome Completo do usuário.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Atualização de Sistema (Admin Only) */}
            {userRole === 'Admin' && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8 border-l-4 border-l-purple-500">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-purple-600" /> Atualização de Sistema
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">Buscar Versão Mais Recente</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                O sistema irá baixar a última versão do repositório, reconstruir os containers e reiniciar.
                                <br />
                                <span className="font-bold text-red-500">Atenção:</span> O sistema ficará indisponível por cerca de 1-2 minutos.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                if (window.confirm("Deseja realmente atualizar o sistema? Isso causará uma breve interrupção.")) {
                                    try {
                                        await api.triggerUpdate();
                                        alert("Atualização solicitada! O sistema reiniciará em breve. Atualize a página em alguns minutos.");
                                    } catch (e) {
                                        alert("Erro ao solicitar atualização: " + e.message);
                                    }
                                }
                            }}
                            className="whitespace-nowrap px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition shadow-lg shadow-purple-500/20 font-medium"
                        >
                            <Download className="w-4 h-4" /> Atualizar Agora
                        </button>
                    </div>
                </div>
            )}


            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                CâmaraGestão v{__APP_VERSION__} &bull; Desenvolvido por AlmeidaSinop
            </div>
        </div>
    );
}
