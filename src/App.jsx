import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentSignPage from './pages/DocumentSignPage';
import SharePage from './pages/SharePage';

function App() {
    const [currentPage, setCurrentPage] = useState('login');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentDocumentId, setCurrentDocumentId] = useState(null);
    const [shareToken, setShareToken] = useState(null);

    const updatePageState = useCallback(() => {
        const token = localStorage.getItem('token');
        const path = window.location.pathname;

        if (path.startsWith('/share/')) {
            const tokenFromUrl = path.split('/share/')[1];
            setShareToken(tokenFromUrl);
            setCurrentPage('share');
            setIsAuthenticated(!!token); // Keep auth state in case user is also logged in
        } else if (token) {
            setIsAuthenticated(true);
            if (path.startsWith('/document/')) {
                const docId = path.split('/document/')[1];
                setCurrentDocumentId(docId);
                setCurrentPage('documentSign');
            } else if (path === '/dashboard' || path === '/') {
                setCurrentPage('dashboard');
            } else if (path === '/login' || path === '/register') {
                setCurrentPage(path.substring(1));
            } else {
                setCurrentPage('notfound');
            }
        } else {
            setIsAuthenticated(false);
            if (path === '/register') setCurrentPage('register');
            else if (path === '/login' || path === '/') setCurrentPage('login');
            else setCurrentPage('notfound');
        }
    }, []);

    useEffect(() => {
        updatePageState();

        const handlePopState = () => {
            updatePageState();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [updatePageState]);

    useEffect(() => {
        const titles = {
            login: 'Login | V-Doc Sign',
            register: 'Register | V-Doc Sign',
            dashboard: 'Dashboard | V-Doc Sign',
            documentSign: 'Sign Document | V-Doc Sign',
            share: 'Shared Document | V-Doc Sign',
            notfound: 'V-Doc Sign'
        };
        document.title = titles[currentPage] || 'V-Doc Sign';
    }, [currentPage]);

    const handleAuthSuccess = useCallback(() => {
        setIsAuthenticated(true);
        window.history.pushState({}, '', '/dashboard');
        setCurrentPage('dashboard');
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        window.history.pushState({}, '', '/login');
        setCurrentPage('login');
    }, []);

    const navigateTo = useCallback((path) => {
        window.history.pushState({}, '', path);
        updatePageState();
    }, [updatePageState]);

    const content = useMemo(() => {
        if (currentPage === 'share' && shareToken) {
            return <SharePage navigateTo={navigateTo} />;
        }

        if (isAuthenticated) {
            if (currentPage === 'dashboard') {
                return (
                    <div className="flex flex-col min-h-screen bg-gray-100">
                        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
                            <h1 className="text-xl font-bold text-gray-800">V-Doc Sign</h1>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">
                                Logout
                            </button>
                        </nav>
                        <main className="flex-1 flex justify-center items-start p-6">
                            <div className="w-full max-w-7xl">
                                <DashboardPage navigateTo={navigateTo} />
                            </div>
                        </main>
                    </div>
                );
            } else if (currentPage === 'documentSign' && currentDocumentId) {
                return (
                    <div className="flex flex-col min-h-screen bg-gray-100">
                        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
                            <h1 className="text-xl font-bold text-gray-800">V-Doc Sign</h1>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">
                                Logout
                            </button>
                        </nav>
                        <main className="flex-1 flex justify-center items-start p-6">
                            <div className="w-full max-w-7xl">
                                <DocumentSignPage documentId={currentDocumentId} navigateTo={navigateTo} />
                            </div>
                        </main>
                    </div>
                );
            } else {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gray-100">
                        <p className="text-red-600 text-lg">
                            Page not found.{' '}
                            <button onClick={() => navigateTo('/dashboard')} className="text-blue-500 hover:underline">
                                Go to Dashboard
                            </button>
                        </p>
                    </div>
                );
            }
        } else {
            if (currentPage === 'register') return <RegisterPage onAuthSuccess={handleAuthSuccess} navigateTo={navigateTo} />;
            if (currentPage === 'login') return <LoginPage onAuthSuccess={handleAuthSuccess} navigateTo={navigateTo} />;
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <p className="text-red-600 text-lg">
                        Page not found.{' '}
                        <button onClick={() => navigateTo('/login')} className="text-blue-500 hover:underline">
                            Go to Login
                        </button>
                    </p>
                </div>
            );
        }
    }, [currentPage, isAuthenticated, currentDocumentId, shareToken, navigateTo, handleAuthSuccess, handleLogout]);

    return <div className="min-h-screen bg-gray-100">{content}</div>;
}

export default App;
