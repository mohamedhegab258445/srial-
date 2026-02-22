import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
});

// Attach token automatically — customer routes get customer_token, admin routes get admin_token
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const isCustomerRoute = !!config.url?.match(/\/(auth\/otp|customer)\//)
        const token = isCustomerRoute
            ? localStorage.getItem("customer_token")
            : (localStorage.getItem("admin_token") || localStorage.getItem("customer_token"));
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Serial ─────────────────────────────────────────────
export const lookupSerial = (sn: string) => api.get(`/api/serials/${sn}`);
export const getSerialQR = (sn: string) => `${API_URL}/api/serials/${sn}/qr`;

// ─── Admin Products ────────────────────────────────────
export const getProducts = (search?: string) =>
    api.get("/api/admin/products/", { params: { search } });
export const createProduct = (data: object) => api.post("/api/admin/products/", data);
export const updateProduct = (id: number, data: object) =>
    api.patch(`/api/admin/products/${id}`, data);
export const deleteProduct = (id: number) => api.delete(`/api/admin/products/${id}`);

// ─── Admin Serials ──────────────────────────────────────
export const generateSerials = (data: object) =>
    api.post("/api/serials/admin/generate", data);
export const listSerials = (params?: object) =>
    api.get("/api/serials/admin/list", { params });
export const activateWarranty = (sn: string, data: object) =>
    api.post(`/api/serials/${sn}/activate`, data);

// ─── Admin Tickets ─────────────────────────────────────
export const getTickets = (status?: string) =>
    api.get("/api/tickets/admin", { params: { status } });
export const updateTicketStatus = (id: number, status: string) =>
    api.patch(`/api/tickets/admin/${id}/status`, { status });
export const deleteTicket = (id: number) =>
    api.delete(`/api/tickets/admin/${id}`);

// ─── Admin Maintenance ──────────────────────────────────
export const getMaintenance = (sn: string) =>
    api.get(`/api/admin/maintenance/${sn}`);
export const addMaintenance = (data: object) =>
    api.post("/api/admin/maintenance/", data);

// ─── Admin Auth ────────────────────────────────────────
export const adminLogin = (username: string, password: string) =>
    api.post("/api/admin/login", { username, password });
export const getDashboardStats = () => api.get("/api/admin/dashboard");

// ─── Customer Auth ─────────────────────────────────────
export const requestOTP = (contact: string) =>
    api.post("/api/auth/otp/request", { contact });
export const verifyOTP = (contact: string, code: string, name?: string) =>
    api.post("/api/auth/otp/verify", { contact, code, name });

// ─── Customer Portal ───────────────────────────────────
export const getMyProducts = () => api.get("/api/customer/products");

// ─── Tickets (Public) ──────────────────────────────────
export const createTicket = (data: object) => api.post("/api/tickets/", data);
