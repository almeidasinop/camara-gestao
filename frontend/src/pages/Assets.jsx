import React, { useEffect, useState } from 'react';
import {
    Plus, Search, Monitor, Trash2, Edit2, History, X,
    Cpu, MapPin, DollarSign, FileText, CheckCircle, Smartphone, Download, Printer, QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';

const Tabs = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'general', label: 'Geral', icon: Monitor },
        { id: 'location', label: 'Localização', icon: MapPin },
        { id: 'technical', label: 'Técnico', icon: Cpu },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
    ];

    return (
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default function Assets() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [labelAsset, setLabelAsset] = useState(null);
    const [activeTab, setActiveTab] = useState('general');

    // Form and History Data
    const [currentAssetHistory, setCurrentAssetHistory] = useState([]);
    const [formData, setFormData] = useState({
        id: null,
        hostname: '',
        type: 'Computador',
        ip_address: '',
        status: 'Em Uso',
        serial_number: '',
        asset_tag: '',
        manufacturer: '',
        model: '',
        location: '',
        responsible: '',
        technical_group: '',
        os: '',
        processor: '',
        ram: '',
        storage: '',
        screen_size: '',
        connections: '',
        purchase_date: '',
        warranty_end: '',
        price: '',
        invoice_number: '',
        supplier: ''
    });

    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await api.getAssets();
            setAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load assets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenHistory = async (asset) => {
        try {
            const history = await api.getAssetHistory(asset.id);
            setCurrentAssetHistory(history);
            setIsHistoryModalOpen(true);
        } catch (error) {
            alert("Erro ao carregar histórico");
        }
    };

    const handleOpenLabel = (asset) => {
        setLabelAsset(asset);
        setIsLabelModalOpen(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                price: formData.price ? parseFloat(formData.price) : 0
            };

            if (isEditing) {
                await api.updateAsset(formData.id, payload);
            } else {
                await api.createAsset(payload);
            }
            setIsModalOpen(false);
            resetForm();
            loadAssets();
        } catch (error) {
            alert('Erro ao salvar ativo: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este ativo?')) {
            try {
                await api.deleteAsset(id);
                loadAssets();
            } catch (error) {
                alert('Erro ao excluir');
            }
        }
    };

    const handleEdit = (asset) => {
        // Formatar datas para o input type="date"
        const formatDate = (dateString) => dateString ? dateString.split('T')[0] : '';

        setFormData({
            ...asset,
            purchase_date: formatDate(asset.purchase_date),
            warranty_end: formatDate(asset.warranty_end),
            price: asset.price || ''
        });
        setIsEditing(true);
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: null,
            hostname: '', type: 'Computador', ip_address: '', status: 'Em Uso',
            serial_number: '', asset_tag: '', manufacturer: '', model: '',
            location: '', responsible: '', technical_group: '',
            os: '', processor: '', ram: '', storage: '',
            screen_size: '', connections: '',
            purchase_date: '', warranty_end: '', price: '', invoice_number: '', supplier: ''
        });
        setIsEditing(false);
        setActiveTab('general');
    };

    // Components for input fields to ensure consistency
    const InputField = ({ label, value, onChange, type = "text", placeholder, required = false }) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input
                type={type}
                required={required}
                value={value || ''}
                onChange={onChange}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                placeholder={placeholder}
            />
        </div>
    );

    const SelectField = ({ label, value, onChange, options }) => (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select
                value={value || ''}
                onChange={onChange}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );

    const downloadTemplate = () => {
        const header = "Hostname,Type,SerialNumber,AssetTag,Location,Status\n";
        const example = "PC-FIN-01,Computador,ABC12345,TAG-001,Financeiro > Sala 1,Em Uso";
        const blob = new Blob([header + example], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_ativos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const res = await api.importAssets(formData);
            alert(`Importação concluída: ${res.success} sucessos, ${res.errors} erros.`);
            loadAssets();
        } catch (error) {
            alert('Erro na importação: ' + error.message);
        } finally {
            setLoading(false);
            e.target.value = null; // Reset input
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventário de Ativos</h2>
                    <p className="text-slate-500">Gerencie equipamentos, licenças e periféricos.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg flex items-center gap-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                        title="Baixar modelo CSV"
                    >
                        <Download className="w-4 h-4" /> Modelo
                    </button>
                    <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-500/30 cursor-pointer">
                        <FileText className="w-5 h-5" /> Importar CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-indigo-500/30"
                    >
                        <Plus className="w-5 h-5" /> Novo Ativo
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Ativo</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Tipo</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Serial / Tag</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Local</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : assets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                                {asset.type === 'Monitor' ? <Monitor className="w-5 h-5" /> :
                                                    asset.type === 'Smartphone' ? <Smartphone className="w-5 h-5" /> :
                                                        <Cpu className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{asset.hostname}</p>
                                                <p className="text-xs text-slate-500">{asset.ip_address}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{asset.type}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 space-y-1">
                                            <p>S/N: {asset.serial_number || '-'}</p>
                                            <p>Tag: {asset.asset_tag || '-'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{asset.location || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${asset.status === 'Em Uso' ? 'bg-emerald-100 text-emerald-700' :
                                            asset.status === 'Em Estoque' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenHistory(asset)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition" title="Histórico">
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleOpenLabel(asset)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition" title="Gerar Etiqueta">
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleEdit(asset)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition" title="Editar">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(asset.id)} className="p-2 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition" title="Excluir">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {isEditing ? 'Editar Ativo' : 'Novo Ativo'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

                            <form id="asset-form" onSubmit={handleSubmit} className="space-y-6">
                                {/* Tab: Geral */}
                                {activeTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="Hostname" value={formData.hostname} onChange={e => setFormData({ ...formData, hostname: e.target.value })} required placeholder="Ex: PC-FINANCEIRO-01" />
                                        <SelectField label="Tipo" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} options={['Computador', 'Monitor', 'Impressora', 'Switch', 'Nobreak', 'Smartphone']} />
                                        <InputField label="Nº de Série" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="S/N do Fabricante" />
                                        <InputField label="Nº Inventário (Tag)" value={formData.asset_tag} onChange={e => setFormData({ ...formData, asset_tag: e.target.value })} placeholder="Etiqueta Interna" />
                                        <InputField label="Fabricante" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} placeholder="Ex: Dell" />
                                        <InputField label="Modelo" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="Ex: Optiplex 3070" />
                                        <SelectField label="Status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} options={['Em Uso', 'Em Estoque', 'Em Manutenção', 'Para Descarte', 'Roubado/Perdido']} />
                                    </div>
                                )}

                                {/* Tab: Localização */}
                                {activeTab === 'location' && (
                                    <div className="space-y-4">
                                        <InputField label="Localização Completa" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Matriz > 1º Andar > Sala TI" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Usuário Responsável" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} placeholder="Nome do utilizador" />
                                            <InputField label="Grupo Técnico" value={formData.technical_group} onChange={e => setFormData({ ...formData, technical_group: e.target.value })} placeholder="Ex: Suporte N1" />
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Técnico */}
                                {activeTab === 'technical' && (
                                    <div className="space-y-4">
                                        {formData.type === 'Computador' || formData.type === 'Server' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputField label="Sistema Operacional" value={formData.os} onChange={e => setFormData({ ...formData, os: e.target.value })} placeholder="Ex: Windows 11 Pro" />
                                                <InputField label="Processador" value={formData.processor} onChange={e => setFormData({ ...formData, processor: e.target.value })} placeholder="Ex: i5-12400" />
                                                <InputField label="Memória RAM" value={formData.ram} onChange={e => setFormData({ ...formData, ram: e.target.value })} placeholder="Ex: 16GB" />
                                                <InputField label="Armazenamento" value={formData.storage} onChange={e => setFormData({ ...formData, storage: e.target.value })} placeholder="Ex: SSD 512GB" />
                                                <InputField label="Endereço IP" value={formData.ip_address} onChange={e => setFormData({ ...formData, ip_address: e.target.value })} placeholder="Ex: 192.168.1.10" />
                                            </div>
                                        ) : formData.type === 'Monitor' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputField label="Tamanho (Pol)" value={formData.screen_size} onChange={e => setFormData({ ...formData, screen_size: e.target.value })} placeholder="Ex: 24 polegadas" />
                                                <InputField label="Conexões" value={formData.connections} onChange={e => setFormData({ ...formData, connections: e.target.value })} placeholder="Ex: HDMI, DP" />
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-500 py-8">
                                                Selecione "Computador" ou "Monitor" para ver campos específicos.
                                                <br />Mas você pode preencher o IP abaixo se aplicável.
                                                <div className="mt-4 max-w-xs mx-auto">
                                                    <InputField label="Endereço IP" value={formData.ip_address} onChange={e => setFormData({ ...formData, ip_address: e.target.value })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab: Financeiro */}
                                {activeTab === 'financial' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="Data da Compra" type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} />
                                        <InputField label="Fim da Garantia" type="date" value={formData.warranty_end} onChange={e => setFormData({ ...formData, warranty_end: e.target.value })} />
                                        <InputField label="Valor de Aquisição (R$)" type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" />
                                        <InputField label="Número da Nota Fiscal" value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="NF-e 12345" />
                                        <div className="col-span-2">
                                            <InputField label="Fornecedor" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} placeholder="Nome da empresa fornecedora" />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="asset-form"
                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-bold shadow-lg shadow-indigo-500/20"
                            >
                                Salvar Ativo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Histórico de Alterações</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {currentAssetHistory.length === 0 ? (
                                <p className="text-slate-500 text-center">Nenhum registro encontrado.</p>
                            ) : (
                                currentAssetHistory.map((h) => (
                                    <div key={h.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-500"></div>
                                        <p className="text-sm text-slate-500 mb-1">{new Date(h.timestamp).toLocaleString()}</p>
                                        <div className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                            {h.change_log}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Label Modal */}
            {isLabelModalOpen && labelAsset && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-6 animate-fade-in print:shadow-none print:w-auto">
                        <div className="flex justify-between w-full items-center print:hidden">
                            <h3 className="text-lg font-bold text-slate-800">Etiqueta de Patrimônio</h3>
                            <button onClick={() => setIsLabelModalOpen(false)}><X className="text-slate-400 w-5 h-5" /></button>
                        </div>

                        {/* Printable Area */}
                        <div id="printable-label" className="printable-label border-2 border-slate-900 rounded-lg p-4 w-full flex flex-col items-center gap-2 bg-white text-slate-900">
                            <div className="text-center border-b-2 border-slate-900 w-full pb-2 mb-1">
                                <h2 className="text-xl font-bold uppercase tracking-wider">Câmara Municipal</h2>
                                <p className="text-xs font-bold">Gestão de Patrimônio</p>
                            </div>

                            <div className="p-2 bg-white">
                                <QRCodeSVG
                                    value={`${window.location.origin}/tickets/new?asset_id=${labelAsset.id}`}
                                    size={120}
                                    level={"H"}
                                />
                            </div>

                            <div className="text-center w-full">
                                <div className="text-2xl font-black font-mono tracking-widest">{labelAsset.asset_tag || String(labelAsset.id).padStart(6, '0')}</div>
                                <div className="text-sm font-semibold truncate max-w-[200px]">{labelAsset.hostname}</div>
                                <div className="text-xs mt-1">{labelAsset.type} • {labelAsset.serial_number || 'Sem Serial'}</div>
                            </div>
                        </div>

                        <button onClick={handlePrint} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition print:hidden">
                            <Printer className="w-5 h-5" /> Imprimir Etiqueta
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
