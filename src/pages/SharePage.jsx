import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';

// Log the pdfjs version to ensure it's correctly resolved
console.log('PDF.js version (SharePage):', pdfjs.version);

// FIX: Align workerSrc version with the pdfjs.version reported in console (2.16.105)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
console.log('PDF.js Worker Source (SharePage) set to:', pdfjs.GlobalWorkerOptions.workerSrc);

// CSS imports are now in index.css
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';
// REMOVED: getDocumentFileBlob as we will no longer use Blob URLs
import { getDocumentByShareToken, getSignaturesForDocument, updateSignatureStatusByShareToken } from '../utils/api';
import SignatureModal from '../components/SignatureModal';


function SharePage({ navigateTo }) {
    console.log('SharePage rendered. Token:', window.location.pathname.split('/').pop()); // NEW: Debugging log
    const urlParts = window.location.pathname.split('/');
    const token = urlParts[urlParts.length - 1];

    const [documentData, setDocumentData] = useState(null);
    // MODIFIED: fileUrl will now store the direct URL string, not a Blob URL
    const [fileUrl, setFileUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1); // Keep pageNumber for placement, but render all
    const [loading, setLoading] = useState(true); // Keep loading state to track initial data fetch
    const [error, setError] = useState('');
    const [signatures, setSignatures] = useState([]);
    const [isPlacingSignature, setIsPlacingSignature] = useState(false);
    const [currentSignatureType, setCurrentSignatureType] = useState('signature');
    const pdfContainerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [userSignature, setUserSignature] = useState(null);
    const [userInitial, setUserInitial] = useState(null);
    const [signerName, setSignerName] = useState('');
    const [isSigningComplete, setIsSigningComplete] = useState(false);

    // NEW: State for custom confirmation modal
    const [showConfirmDeclineModal, setShowConfirmDeclineModal] = useState(false);
    // NEW: State for custom message modal
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageModalTitle, setMessageModalTitle] = useState('');
    const [messageModalContent, setMessageModalContent] = useState('');
    const [messageModalCallback, setMessageModalCallback] = useState(null);


    useEffect(() => {
        console.log('SharePage useEffect triggered. Token:', token); // NEW: Debugging log
        const fetchDocAndSignatures = async () => {
            try {
                setLoading(true); // Keep loading true for initial data fetch
                if (!token) {
                    setError('No share token provided.');
                    setLoading(false); // Stop loading on error
                    return;
                }

                const res = await getDocumentByShareToken(token);
                setDocumentData(res.data.document);
                
                // MODIFIED: Construct the direct file URL using the backend's base URL and document's filePath
                // Assuming your backend serves static files from /uploads
                const directFileUrl = `http://localhost:5000${res.data.document.filePath}`;
                setFileUrl(directFileUrl);
                console.log('Document direct file URL created:', directFileUrl);


                const sigRes = await getSignaturesForDocument(res.data.document._id);
                setSignatures(sigRes.data || []);

                setError('');
                setLoading(false); // Set loading false after all data (metadata, fileUrl, signatures) are fetched
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load document via share link.');
                console.error('Error fetching shared document:', err);
                setLoading(false); // Stop loading on error
            }
        };

        fetchDocAndSignatures();

        // REMOVED: Cleanup Blob URL as we are no longer using Blob URLs
        return () => {
            // No URL.revokeObjectURL needed for direct file paths
        };
    }, [token]);

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
        setError('');
        // No longer setting setLoading(false) here, as it's handled after data fetch in useEffect
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const handlePdfClick = async (e) => {
        if (!isPlacingSignature || !pdfContainerRef.current) return;

        const signatureToUse = currentSignatureType === 'signature' ? userSignature : userInitial;

        if (!signatureToUse) {
            setError(`Please create your ${currentSignatureType} first using the "Create Signature" button.`);
            setIsPlacingSignature(false);
            return;
        }

        if (signerName.trim() === '') {
            setError('Please enter your name/email before placing a signature.');
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
            const pendingSig = signatures.find(sig => sig.page === pageNumber && sig.status === 'pending');

            if (!pendingSig) {
                setError('No pending signature fields to sign on this page. Please contact the document owner.');
                setIsPlacingSignature(false);
                return;
            }

            await updateSignatureStatusByShareToken(
                token,
                pendingSig._id,
                'signed',
                signerName.trim()
            );

            setSignatures(prevSigs => prevSigs.map(s =>
                s._id === pendingSig._id ? { ...s, status: 'signed', signedBy: signerName.trim(), signedAt: new Date() } : s
            ));

            setIsPlacingSignature(false);
            setError('');
            // NEW: Use custom message modal instead of alert
            setMessageModalTitle('Success');
            setMessageModalContent('Signature applied successfully!');
            setMessageModalCallback(null); // No specific action after OK
            setShowMessageModal(true);
            setIsSigningComplete(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to apply signature.');
            console.error('Error applying signature:', err);
        }
    };

    const handleSaveCreatedSignature = ({ type, value }) => {
        if (currentSignatureType === 'signature') {
            setUserSignature({ type, value });
        } else {
            setUserInitial({ type, value });
        }
        setIsSignatureModalOpen(false);
        setError('');
    };

    const openSignatureModal = (type) => {
        setCurrentSignatureType(type);
        setIsSignatureModalOpen(true);
        setIsPlacingSignature(false);
    };

    // NEW: Function to perform the actual decline action after confirmation
    const performDeclineAction = async () => {
        if (signerName.trim() === '') {
            setError('Please enter your name/email before declining.');
            return;
        }
        try {
            const anyPendingSig = signatures.find(sig => sig.status === 'pending');
            if (anyPendingSig) {
                await updateSignatureStatusByShareToken(token, anyPendingSig._id, 'declined', signerName.trim());
            } else {
                // NEW: Use custom message modal instead of alert
                setMessageModalTitle('Document Declined');
                setMessageModalContent('Document declined successfully. No specific signature fields to update.');
                setMessageModalCallback(() => navigateTo('/')); // Navigate after OK
                setShowMessageModal(true);
                return; // Exit to prevent double alert/navigation
            }
            // NEW: Use custom message modal instead of alert
            setMessageModalTitle('Document Declined');
            setMessageModalContent('Document declined.');
            setMessageModalCallback(() => navigateTo('/')); // Navigate after OK
            setShowMessageModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to decline document.');
            console.error('Error declining document:', err);
        }
    };

    const handleDecline = async () => {
        // NEW: Use custom confirmation modal instead of window.confirm
        setShowConfirmDeclineModal(true);
    };


    // If there's a critical error that prevents the page from being useful, show the error state.
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <p className="text-red-600 text-lg mb-4">{error}</p>
                <button
                    onClick={() => navigateTo('/')}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    // Render the main content even if loading is true, letting <Document> component handle its own loading state.
    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Sign Document: {documentData ? documentData.originalName : (loading ? 'Loading Document Info...' : 'Document')}
                </h2>
                <p className="text-gray-700 mb-4 text-center">
                    Please provide your name/email to sign this document.
                </p>
                <div className="mb-4">
                    <label htmlFor="signerName" className="block text-gray-700 text-sm font-bold mb-2">
                        Recipient's Name / Email
                    </label>
                    <input
                        type="text"
                        id="signerName"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="e.g., Jane Doe or jane@example.com"
                        required
                        disabled={isSigningComplete}
                    />
                </div>

                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <button
                        onClick={() => navigateTo('/')}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md"
                        disabled={isSigningComplete}
                    >
                        Go to Home
                    </button>
                    <div className="flex flex-wrap space-x-2 gap-2">
                        <button
                            onClick={() => openSignatureModal('signature')}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md"
                            disabled={isSigningComplete}
                        >
                            {userSignature ? 'Edit Signature' : 'Create Signature'}
                        </button>
                        <button
                            onClick={() => openSignatureModal('initial')}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md"
                            disabled={isSigningComplete}
                        >
                            {userInitial ? 'Edit Initial' : 'Create Initial'}
                        </button>
                        <button
                            onClick={() => {
                                setIsPlacingSignature(true);
                                setCurrentSignatureType('signature');
                                setError('');
                            }}
                            className={`py-2 px-4 rounded-md font-semibold ${isPlacingSignature && currentSignatureType === 'signature' ? 'bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'} ${!userSignature || isSigningComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!userSignature || isSigningComplete}
                        >
                            Place Signature
                        </button>
                        <button
                            onClick={() => {
                                setIsPlacingSignature(true);
                                setCurrentSignatureType('initial');
                                setError('');
                            }}
                            className={`py-2 px-4 rounded-md font-semibold ${isPlacingSignature && currentSignatureType === 'initial' ? 'bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'} ${!userInitial || isSigningComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!userInitial || isSigningComplete}
                        >
                            Place Initial
                        </button>
                        <button
                            onClick={handleDecline}
                            disabled={isSigningComplete}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Decline
                        </button>
                    </div>
                </div>

                {isPlacingSignature && (
                    <p className="text-blue-600 mb-4 text-center">Click on the PDF to place the {currentSignatureType} field. (This will sign the first available pending field.)</p>
                )}

                {error && <p className="text-red-600 mb-4 text-center">{error}</p>}

                <div className="relative border border-gray-300 rounded-lg overflow-hidden" ref={pdfContainerRef} onClick={handlePdfClick}>
                    {fileUrl ? ( // Only render Document if fileUrl is available
                        <Document
                            file={fileUrl} // Now a direct URL string
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(err) => {
                                console.error("PDF Load Error (onLoadError callback):", err, "Error details:", err.message, err.name, err.stack);
                                setError('Failed to load PDF file. Please ensure the file is valid and the worker script is correctly configured.');
                                // No longer setting setLoading(false) here
                            }}
                            onSourceError={(err) => {
                                console.error("PDF Source Error (onSourceError callback):", err);
                                setError('Failed to load PDF source. Please check the document URL and your backend CORS configuration.');
                                // No longer setting setLoading(false) here
                            }}
                            className="w-full"
                            loading={<p className="text-gray-700 text-lg p-4">Loading PDF...</p>} // Added loading prop
                        >
                            {/* Render all pages */}
                            {numPages && Array.from(new Array(numPages), (el, index) => (
                                <div key={`page-container-${index + 1}`} className="relative mb-4 last:mb-0">
                                    <Page
                                        key={`page_${index + 1}`}
                                        pageNumber={index + 1}
                                        width={containerWidth}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                    />
                                    {/* Signatures for the current page */}
                                    {signatures.map((sig) => (
                                        sig.page === (index + 1) && (
                                            <div
                                                key={sig._id}
                                                className={`absolute p-2 border-2 border-dashed ${sig.status === 'pending' ? 'border-blue-500 bg-blue-100 opacity-70' : 'border-green-500 bg-green-100 opacity-70'} text-xs text-gray-700 flex items-center justify-center`}
                                                style={{
                                                    left: `${sig.x}%`,
                                                    top: `${sig.y}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    width: sig.type === 'signature' ? '120px' : '80px',
                                                    height: sig.type === 'signature' ? '40px' : '30px',
                                                }}
                                            >
                                                {sig.type === 'signature' ? 'Signature Field' : 'Initial Field'}
                                                {sig.status === 'signed' && sig.signedBy && (
                                                    <span className="ml-1 text-green-800"> (Signed by {sig.signedBy})</span>
                                                )}
                                            </div>
                                        )
                                    ))}
                                </div>
                            ))}
                        </Document>
                    ) : (
                        // Show loading message if fileUrl is not yet available, but not an error
                        loading && <p className="text-gray-700 text-lg p-4">Fetching document file...</p>
                    )}
                </div>

                {/* Removed page navigation buttons as all pages are rendered */}
                {/* {numPages && (
                    <div className="flex justify-center items-center mt-4 space-x-4">
                        <button
                            onClick={() => changePage(-1)}
                            disabled={pageNumber <= 1}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous Page
                        </button>
                        <p className="text-gray-700">Page {pageNumber} of {numPages}</p>
                        <button
                            onClick={() => changePage(1)}
                            disabled={pageNumber >= numPages}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next Page
                        </button>
                    </div>
                )} */}
            </div>

            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSaveSignature={handleSaveCreatedSignature}
            />

            {/* NEW: Custom Confirmation Modal */}
            {showConfirmDeclineModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Confirm Decline</h3>
                        <p className="mb-6 text-gray-700">Are you sure you want to decline signing this document?</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowConfirmDeclineModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmDeclineModal(false);
                                    performDeclineAction(); // Call the actual decline logic
                                }}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Custom Message Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">{messageModalTitle}</h3>
                        <p className="mb-6 text-gray-700">{messageModalContent}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setShowMessageModal(false);
                                    if (messageModalCallback) messageModalCallback();
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SharePage;
