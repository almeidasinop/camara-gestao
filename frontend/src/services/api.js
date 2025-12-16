const API_URL = 'http://localhost:8080/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const request = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        // Token expirado ou invalido
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'API Error');
    }

    return res.json();
};

export const api = {
    // Auth
    login: async (credentials) => {
        // Login é público, não usa request wrapper padrão para evitar loop de 401
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    // Assets
    getAssets: () => request('/assets'),
    createAsset: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
    updateAsset: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
    getAssetHistory: (id) => request(`/assets/${id}/history`),

    // Tickets
    getTickets: () => request('/tickets'),
    getCategories: () => request('/categories'),
    createCategory: (data) => request('/categories/', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

    // Settings
    getSettings: () => request('/settings'),
    updateSetting: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

    // Audit/Dashboard
    getAuditLogs: (filters) => {
        const query = new URLSearchParams(filters).toString();
        return request(`/audit?${query}`);
    },
    getDashboardKPIs: () => request('/dashboard/kpis'),

    createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    updateTicketStatus: (id, status) => request(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    addTicketComment: (id, content) => request(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    getReports: (techId) => request(`/reports${techId ? `?tech_id=${techId}` : ''}`),

    // Users
    getUsers: () => request('/users/'),
    getUsersList: () => request('/users/list'), // Tech Access
    getTechs: () => request('/users/techs'),
    getUser: (id) => request(`/users/${id}`),
    createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: async (id) => {
        return request(`/users/${id}`, { method: 'DELETE' });
    },

    // Import
    importAssets: async (formData) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/import/assets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!res.ok) throw new Error('Falha na importação');
        return res.json();
    },

    importUsers: async (formData) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/import/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!res.ok) throw new Error('Falha na importação');
        return res.json();
    }
};
