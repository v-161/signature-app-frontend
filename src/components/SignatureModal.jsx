import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

function SignatureModal({ isOpen, onClose, onSaveSignature }) {
    const [signatureMethod, setSignatureMethod] = useState('type'); // 'type' or 'draw'
    const [typedSignature, setTypedSignature] = useState('');
    const signaturePadRef = useRef(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setTypedSignature('');
            if (signaturePadRef.current) {
                signaturePadRef.current.clear();
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        if (signatureMethod === 'type') {
            if (!typedSignature.trim()) {
                setError('Please type your signature.');
                return;
            }
            onSaveSignature({
                type: 'text',
                value: typedSignature.trim(),
            });
            onClose();
        } else {
            if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
                setError('Please draw your signature.');
                return;
            }
            const drawnSignature = signaturePadRef.current.toDataURL('image/png');
            onSaveSignature({
                type: 'image',
                value: drawnSignature,
            });
            onClose();
        }
    };

    const handleClear = () => {
        if (signaturePadRef.current) {
            signaturePadRef.current.clear();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Create Your Signature</h2>

                <div className="flex justify-center mb-4 space-x-4">
                    <button
                        onClick={() => setSignatureMethod('type')}
                        className={`px-4 py-2 rounded-md font-semibold ${signatureMethod === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Type Signature
                    </button>
                    <button
                        onClick={() => setSignatureMethod('draw')}
                        className={`px-4 py-2 rounded-md font-semibold ${signatureMethod === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Draw Signature
                    </button>
                </div>

                {signatureMethod === 'type' ? (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Type your full name:</label>
                        <input
                            type="text"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none bg-white"
                            value={typedSignature}
                            onChange={(e) => setTypedSignature(e.target.value)}
                            placeholder="e.g., John Doe"
                        />
                        <p className="mt-2 text-sm text-gray-500">This will appear as your digital signature.</p>
                    </div>
                ) : (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Draw your signature below:</label>
                        <div className="border border-gray-300 rounded bg-white overflow-hidden">
                            <SignatureCanvas
                                ref={signaturePadRef}
                                penColor="black"
                                canvasProps={{ width: 450, height: 150, className: 'sigCanvas' }}
                                minWidth={0.5}
                                maxWidth={2.5}
                                clearOnResize={false}
                            />
                        </div>
                        <button
                            onClick={handleClear}
                            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm"
                        >
                            Clear
                        </button>
                        <p className="mt-2 text-sm text-gray-500">Use mouse or finger to sign.</p>
                    </div>
                )}

                {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                    >
                        Save Signature
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignatureModal;
