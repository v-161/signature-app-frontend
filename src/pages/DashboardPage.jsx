import React, { useState, useEffect } from 'react';
import { uploadDocument, getDocuments, generateShareLink } from '../utils/api'; 

function DashboardPage({ navigateTo }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [uploadMessage, setUploadMessage] = useState('');
    const [fetchMessage, setFetchMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [currentDocToShare, setCurrentDocToShare] = useState(null);

    const fetchDocuments = async () => {
        setFetchMessage('');
        setIsLoading(true);
        try {
            const res = await getDocuments();
            setDocuments(res.data);
        } catch (error) {
            setFetchMessage(error.response?.data?.message || 'Failed to fetch documents');
            console.error('Error fetching documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setUploadMessage('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadMessage('Please select a file to upload.');
            return;
        }

        setIsLoading(true);
        setUploadMessage('Uploading...');
        const formData = new FormData();
        formData.append('document', selectedFile);

        try {
            const res = await uploadDocument(formData);
            setUploadMessage(`File "${res.data.originalName}" uploaded successfully!`);
            setSelectedFile(null); // Clear selected file
            fetchDocuments(); // Refresh document list
        } catch (error) {
            setUploadMessage(error.response?.data?.message || 'File upload failed');
            console.error('Error uploading document:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openShareModal = (doc) => {
        setCurrentDocToShare(doc);
        setShareEmail('');
        setShareMessage('');
        setIsShareModalOpen(true);
    };

    const handleShareDocument = async () => {
        if (!shareEmail || !currentDocToShare) {
            setShareMessage('Please enter a valid email and select a document.');
            return;
        }
        setShareMessage('Sending share link...');
        try {
            await generateShareLink(currentDocToShare._id, shareEmail);
            setShareMessage('Share link sent successfully!');
            setIsShareModalOpen(false);
        } catch (error) {
            setShareMessage(error.response?.data?.message || 'Failed to send share link.');
            console.error('Error sharing document:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="bg-white p-8 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload New Document</h2>
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isLoading}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && selectedFile ? 'Uploading...' : 'Upload PDF'}
                    </button>
                </div>
                {uploadMessage && (
                    <p className={`mt-4 text-sm ${uploadMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {uploadMessage}
                    </p>
                )}
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Documents</h2>
                {fetchMessage && <p className="text-red-600 mb-4">{fetchMessage}</p>}
                {isLoading && !fetchMessage && <p className="text-gray-600">Loading documents...</p>}
                {documents.length === 0 && !isLoading && !fetchMessage && (
                    <p className="text-gray-600">No documents uploaded yet. Upload one above!</p>
                )}
                {documents.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Document Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Uploaded On
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Size
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map((doc) => (
                                    <tr key={doc._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {doc.originalName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <a
                                                href={`http://localhost:5000${doc.filePath}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                View
                                            </a>
                                            <button
                                                onClick={() => navigateTo(`/document/${doc._id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 ml-2 bg-indigo-100 px-3 py-1 rounded-md text-xs font-semibold"
                                            >
                                                Sign
                                            </button>
                                            <button
                                                onClick={() => openShareModal(doc)}
                                                className="text-green-600 hover:text-green-900 ml-2 bg-green-100 px-3 py-1 rounded-md text-xs font-semibold"
                                            >
                                                Share
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Share Document Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Share Document</h2>
                        {currentDocToShare && (
                            <p className="text-gray-700 mb-4 text-center">
                                Sharing: <span className="font-semibold">{currentDocToShare.originalName}</span>
                            </p>
                        )}
                        <div className="mb-4">
                            <label htmlFor="shareEmail" className="block text-gray-700 text-sm font-bold mb-2">
                                Recipient Email
                            </label>
                            <input
                                type="email"
                                id="shareEmail"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white" // Added bg-white
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                placeholder="signer@example.com"
                                required
                            />
                        </div>
                        {shareMessage && (
                            <p className={`mt-4 text-sm text-center ${shareMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                                {shareMessage}
                            </p>
                        )}
                        <div className="flex justify-end space-x-4 mt-6">
                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShareDocument}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                            >
                                Send Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
