import React, { useEffect, useState } from 'react';
import { Plus, Search, User, Trash2, Edit2, Shield, ShieldCheck, Users as UsersIcon, Download } from 'lucide-react';
import { api } from '../services/api';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        username: '',
        password: '',
        role: 'Tech' // Admin, Tech
    });
    const [isEditing, setIsEditing] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                // Update
                const payload = { role: formData.role };
                if (formData.password) payload.password = formData.password;
                await api.updateUser(formData.id, payload);
            } else {
                // Create
                await api.createUser(formData);
            }
            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (error) {
            alert('Erro ao salvar usuário: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
            try {
                await api.deleteUser(id);
                loadData();
            } catch (error) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    const handleEdit = (user) => {
        setFormData({
            id: user.id,
            username: user.username,
            password: '', // Não mostrar a senha hashada, apenas permitir redefinir
            role: user.role
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ id: null, username: '', password: '', role: 'Tech' });
        setIsEditing(false);
    };

    const downloadTemplate = () => {
        const header = "Username,Password,Role\n";
        const example = "joao.silva,senha123,User\nmaria.admin,admin123,Admin";
        const blob = new Blob([header + example], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_usuarios.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true); // Reusing loading state if available or local
            const res = await api.importUsers(formData);
            alert(`Importação concluída: ${res.success} sucessos, ${res.errors} erros.`);
            loadData(); // Changed from loadUsers() to loadData() to match existing function name
        } catch (error) {
            alert('Erro na importação: ' + error.message);
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Usuários</h2>
                    <p className="text-slate-500">Gerencie o acesso ao sistema.</p>
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
                        <UsersIcon className="w-5 h-5" /> Importar CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button
                        onClick={() => {
                            setFormData({ id: null, username: '', password: '', role: 'Tech' });
                            setIsModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-indigo-500/30"
                    >
                        <Plus className="w-5 h-5" /> Novo Usuário
                    </button>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Usuário</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Permissão</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Criado em</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-sm text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium w-fit ${user.role === 'Admin'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                            {user.role === 'Admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                            {user.role}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition"
                                                disabled={user.username === 'admin'}
                                            >
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                                <input
                                    required
                                    disabled={isEditing} // Não permitir mudar username na edição por enquanto
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                                </label>
                                <input
                                    type="password"
                                    required={!isEditing}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Permissão</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                >
                                    <option value="Tech">Técnico (Tech)</option>
                                    <option value="Admin">Administrador (Admin)</option>
                                    <option value="User">Usuário Final (User)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-lg shadow-indigo-500/20"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
