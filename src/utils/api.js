import axios from 'axios';

// Create an Axios instance
const API = axios.create({
    // CRITICAL FIX: Use the Vercel environment variable for the API base URL.
    // The || part provides a fallback for local development if VITE_API_BASE_URL is not set.
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the token to headers
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

// Response interceptor to handle token expiration or invalidity
// This was missing from your provided snippet, but is crucial for robust error handling.
API.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the error is 401 Unauthorized, it might mean the token is expired or invalid
        if (error.response && error.response.status === 401) {
            console.error('Unauthorized: Token expired or invalid. Redirecting to login.');
            localStorage.removeItem('token'); // Clear invalid token
            localStorage.removeItem('user'); // Also clear user data
            // Redirect to login page (assuming your app handles navigation)
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);


// User Authentication
export const register = (userData) => API.post('/auth/register', userData);
export const login = (userData) => API.post('/auth/login', userData);

// Document Management
export const uploadDocument = (formData) => API.post('/docs/upload', formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});
export const getDocuments = () => API.get('/docs');
export const getDocumentMetadata = (id) => API.get(`/docs/${id}?metadata=true`);
export const generateShareLink = (documentId, signerEmail, expiresAt) => API.post('/docs/share', { documentId, signerEmail, expiresAt });
export const getDocumentByShareToken = (token) => API.get(`/docs/share/${token}`);

// Signature Management
export const saveSignaturePosition = (signatureData) => API.post('/signatures', signatureData);
export const getSignaturesForDocument = (documentId) => API.get(`/signatures/document/${documentId}`);
export const finalizeDocument = (documentId) => API.post('/signatures/finalize', { documentId });

// Export the updateSignatureStatusByShareToken function
// Note: This URL was '/docs/share/:token/signature/:signatureId/status' in your previous backend routes.
// Make sure this matches your current backend route for updating shared signature status.
// If your backend signature routes are under /api/signatures, it might be /signatures/shared/...
// Based on your server/routes/signatureRoutes.js, it should be /signatures/shared/:token/signature/:signatureId/status
export const updateSignatureStatusByShareToken = (token, signatureId, status, signedBy) => API.put(`/signatures/shared/${token}/signature/${signatureId}/status`, { status, signedBy });

// Audit Logs
export const getAuditLogs = () => API.get('/auditlogs');
