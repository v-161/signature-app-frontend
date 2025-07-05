import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getDocumentMetadata, saveSignaturePosition, getSignaturesForDocument, finalizeDocument } from '../utils/api';
import SignatureModal from '../components/SignatureModal';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js`;

function DocumentSignPage({ documentId, navigateTo }) {
    const [documentData, setDocumentData] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [signatures, setSignatures] = useState([]);
    const [isPlacingSignature, setIsPlacingSignature] = useState(false);
    const [currentSignatureType, setCurrentSignatureType] = useState('signature');
    const pdfContainerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [userSignature, setUserSignature] = useState(null);
    const [userInitial, setUserInitial] = useState(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showConfirmFinalizeModal, setShowConfirmFinalizeModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageModalTitle, setMessageModalTitle] = useState('');
    const [messageModalContent, setMessageModalContent] = useState('');
    const [messageModalCallback, setMessageModalCallback] = useState(null);

    useEffect(() => {
        const fetchDocAndSignatures = async () => {
            try {
                setLoading(true);
                const docRes = await getDocumentMetadata(documentId);
                setDocumentData(docRes.data);
                const directFileUrl = `http://localhost:5000${docRes.data.filePath}`;
                setFileUrl(directFileUrl);

                const sigRes = await getSignaturesForDocument(documentId);
                setSignatures(sigRes.data || []);

                setError('');
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load document.');
                setLoading(false);
            }
        };

        if (documentId) {
            fetchDocAndSignatures();
        } else {
            setError('No document ID provided.');
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        const updateWidth = () => {
            if (pdfContainerRef.current) {
                setContainerWidth(pdfContainerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [documentData]);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
        setError('');
        setLoading(false);
    }

    const handlePdfClick = async (e) => {
        if (!isPlacingSignature || !pdfContainerRef.current) return;

        const signatureToUse = currentSignatureType === 'signature' ? userSignature : userInitial;

        if (!signatureToUse) {
            setError(`Please create your ${currentSignatureType} first.`);
            setIsPlacingSignature(false);
            return;
        }

        const rect = pdfContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const pdfWidth = containerWidth;
        const pdfHeight = (pdfWidth / 794) * 1123;

        const normalizedX = (x / pdfWidth) * 100;
        const normalizedY = (y / pdfHeight) * 100;

        try {
            const newSignature = await saveSignaturePosition({
                documentId,
                pageNumber, // ✅ fixed key name
                position: { x: normalizedX, y: normalizedY }, // ✅ wrapped position
                signatureData: signatureToUse.value, // ✅ correct key name
            });

            setSignatures([...signatures, newSignature.data]);
            setIsPlacingSignature(false);
            setError('');
            setMessageModalTitle('Success');
            setMessageModalContent('Signature placed successfully!');
            setMessageModalCallback(null);
            setShowMessageModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save signature.');
        }
    };

    const handleFinalizeDocument = () => {
        setShowConfirmFinalizeModal(true);
    };

    const performFinalizeAction = async () => {
        setIsFinalizing(true);
        setError('');
        try {
            const res = await finalizeDocument(documentId);
            setMessageModalTitle('Document Finalized');
            setMessageModalContent(`Document finalized successfully: ${res.data.signedDocument.originalName}`);
            setMessageModalCallback(() => navigateTo('/dashboard'));
            setShowMessageModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to finalize document.');
        } finally {
            setIsFinalizing(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p>Loading document...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mb-6">
                <h2 className="text-2xl font-bold mb-4">Sign Document: {documentData?.originalName || 'Document'}</h2>

                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <button onClick={() => navigateTo('/dashboard')} className="bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-md">Back to Dashboard</button>
                    <div className="flex flex-wrap space-x-2 gap-2">
                        <button
                            onClick={() => {
                                setCurrentSignatureType('signature');
                                setIsSignatureModalOpen(true);
                            }}
                            className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md"
                        >
                            Create Signature
                        </button>

                        <button
                            onClick={() => {
                                setCurrentSignatureType('initial');
                                setIsSignatureModalOpen(true);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-md"
                        >
                            Create Initial
                        </button>

                        <button
                            onClick={() => setIsPlacingSignature(true)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md"
                        >
                            Place Signature
                        </button>

                        <button
                            onClick={handleFinalizeDocument}
                            disabled={isFinalizing || signatures.length === 0}
                            className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
                        >
                            {isFinalizing ? 'Finalizing...' : 'Finalize Document'}
                        </button>
                    </div>
                </div>

                {error && <p className="text-red-600 mb-3">{error}</p>}

                <div className="relative border border-gray-300 rounded-lg overflow-hidden" ref={pdfContainerRef} onClick={handlePdfClick}>
                    {fileUrl && (
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={() => setError('Failed to load PDF')}
                        >
                            {numPages && Array.from(new Array(numPages), (el, index) => (
                                <Page key={`page_${index + 1}`} pageNumber={index + 1} width={containerWidth} />
                            ))}
                        </Document>
                    )}
                </div>
            </div>

            {isSignatureModalOpen && (
                <SignatureModal
                    isOpen={isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(false)}
                    onSaveSignature={(signature) => {
                        if (currentSignatureType === 'signature') {
                            setUserSignature(signature);
                        } else {
                            setUserInitial(signature);
                        }
                        setIsSignatureModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}

export default DocumentSignPage;
