import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Ticket, Monitor, Users, Settings, Menu, X, LogOut, Moon, Sun, FileText,
    Shield, Tv, Camera, PieChart
} from 'lucide-react';
import clsx from 'clsx';
import { api } from './services/api';

const SidebarItem = ({ to, icon: Icon, label, collapsed }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )
        }
    >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {/* Mostra label se não estiver colapsado OU se for mobile (onde o menu ocupa a tela toda ou é drawer) */}
        {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
    </NavLink>
);

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const [user, setUser] = useState({ username: '', role: '' });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
    }, []);

    // Fecha o menu mobile ao navegar
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileData, setProfileData] = useState({ fullName: '', avatar: '', password: '' });

    const handleOpenProfile = async () => {
        // Pegar ID do usuário do localStorage (mais simples e confiável)
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            alert('Erro: ID do usuário não encontrado');
            return;
        }

        try {
            const userData = await api.getUser(user.id);
            setProfileData({
                id: user.id,
                fullName: userData.full_name || '',
                avatar: userData.avatar || '',
                password: ''
            });
            setIsProfileModalOpen(true);
        } catch (e) {
            console.error("Erro ao carregar perfil", e);
            alert("Erro ao carregar dados do perfil.");
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await api.updateUser(profileData.id, {
                full_name: profileData.fullName,
                avatar: profileData.avatar,
                password: profileData.password // opcional
            });
            setIsProfileModalOpen(false);
            alert("Perfil atualizado com sucesso!");

            // Atualizar estado e localStorage
            const updatedUser = { ...user, full_name: profileData.fullName, avatar: profileData.avatar };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser)); // IMPORTANTE: persistir para recargas futuras
        } catch (e) {
            alert("Erro ao salvar perfil: " + e.message);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData({ ...profileData, avatar: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">

            {/* Mobile Sidebar Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed md:static inset-y-0 left-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-30',
                    // Mobile: desliza da esquerda. Desktop: controla largura.
                    mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
                    collapsed && !mobileMenuOpen ? 'md:w-20' : 'md:w-64'
                )}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
                    {(!collapsed || mobileMenuOpen) && (
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            CâmaraGestão
                        </span>
                    )}

                    {/* Botão de Fechar Mobile */}
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500 md:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Botão de Colapsar Desktop */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:block p-1 rounded-md hover:bg-slate-100 text-slate-500"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {user.role !== 'User' && (
                        <>
                            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed && !mobileMenuOpen} />
                            <SidebarItem to="/assets" icon={Monitor} label="Ativos" collapsed={collapsed && !mobileMenuOpen} />
                            <SidebarItem to="/reports" icon={PieChart} label="Relatórios" collapsed={collapsed && !mobileMenuOpen} />
                        </>
                    )}

                    <SidebarItem to="/tickets" icon={Ticket} label="Chamados" collapsed={collapsed && !mobileMenuOpen} />

                    {user.role === 'Admin' && (
                        <SidebarItem to="/users" icon={Users} label="Usuários" collapsed={collapsed && !mobileMenuOpen} />
                    )}

                    {user.role !== 'User' && (
                        <>
                            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                            <SidebarItem to="/audit" icon={Shield} label="Auditoria" collapsed={collapsed && !mobileMenuOpen} />

                            <a
                                href="/tv"
                                target="_blank"
                                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors font-medium mb-1 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 group`}
                                title="Modo TV"
                            >
                                <Tv className="w-5 h-5 flex-shrink-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                {(!collapsed || mobileMenuOpen) && <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Modo TV</span>}
                            </a>

                            <SidebarItem to="/settings" icon={Settings} label="Configurações" collapsed={collapsed && !mobileMenuOpen} />
                        </>
                    )}
                </nav>

                <button
                    onClick={handleOpenProfile}
                    className="w-full p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                >
                    {profileData.avatar || (user && user.avatar) ? (
                        <img src={profileData.avatar || user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                            {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : (user.username ? user.username.substring(0, 2).toUpperCase() : 'US')}
                        </div>
                    )}
                    {(!collapsed || mobileMenuOpen) && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{user.full_name || user.username}</span>
                            <span className="text-xs text-slate-500 truncate">{user.role}</span>
                        </div>
                    )}
                </button>

                {/* Botão de Logout */}
                <button
                    onClick={() => {
                        if (window.confirm('Deseja realmente sair do sistema?')) {
                            localStorage.clear();
                            window.location.href = '/login';
                        }
                    }}
                    className="w-full p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left cursor-pointer text-red-600 dark:text-red-400"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {(!collapsed || mobileMenuOpen) && (
                        <span className="font-medium">Sair</span>
                    )}
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative flex flex-col w-full">
                {/* Header */}
                <header className="h-16 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center gap-4 z-10">
                    {/* Botão Abrir Mobile */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-md hover:bg-slate-100 text-slate-600 md:hidden"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Painel de Controle
                    </h1>
                </header>

                <div className="p-4 md:p-8 flex-1">
                    <Outlet />
                </div>
            </main>

            {/* Profile Modal */}
            {
                isProfileModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Meu Perfil</h3>
                                <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group cursor-pointer">
                                        {profileData.avatar ? (
                                            <img src={profileData.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800" />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Users className="w-10 h-10" />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full transition cursor-pointer">
                                            <Camera className="w-8 h-8" />
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-500">Clique na foto para alterar</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={profileData.fullName}
                                            onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                            placeholder="Seu nome completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha (Opcional)</label>
                                        <input
                                            type="password"
                                            value={profileData.password}
                                            onChange={e => setProfileData({ ...profileData, password: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                            placeholder="Deixe em branco para manter"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium shadow-lg shadow-indigo-500/20">
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
