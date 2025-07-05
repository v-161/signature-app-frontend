import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Request interceptor to add the token to headers
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

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
// export const getDocumentFileBlob = (id) => API.get(`/docs/${id}`, { responseType: 'blob' }); // No longer needed with direct file paths
export const generateShareLink = (documentId, signerEmail, expiresAt) => API.post('/docs/share', { documentId, signerEmail, expiresAt });
export const getDocumentByShareToken = (token) => API.get(`/docs/share/${token}`);

// Signature Management
export const saveSignaturePosition = (signatureData) => API.post('/signatures', signatureData);
export const getSignaturesForDocument = (documentId) => API.get(`/signatures/document/${documentId}`);
export const finalizeDocument = (documentId) => API.post('/signatures/finalize', { documentId });

// NEW: Export the updateSignatureStatusByShareToken function
export const updateSignatureStatusByShareToken = (token, signatureId, status, signedBy) => API.put(`/docs/share/${token}/signature/${signatureId}/status`, { status, signedBy });

// Audit Logs
export const getAuditLogs = () => API.get('/auditlogs');
