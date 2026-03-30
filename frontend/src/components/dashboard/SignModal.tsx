'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch, getToken } from '@/lib/auth';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import SignatureCanvas from 'react-signature-canvas';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  onSuccess: () => void;
}

interface BoxState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SignModal({ isOpen, onClose, documentId, documentTitle, onSuccess }: SignModalProps) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  
  // Box and Drag State
  const [box, setBox] = useState<BoxState | null>(null);
  const [dragState, setDragState] = useState<{ mode: 'drag' | 'resize', startX: number, startY: number, initialBox: BoxState } | null>(null);
  const [liveSignData, setLiveSignData] = useState<string | null>(null);
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
    if (isOpen && documentId && currentToken) {
      // Fetch document details to get the downloadUrl
      authFetch(`/documents/${documentId}`)
        .then(res => res.json())
        .then(async data => {
          if (data.downloadUrl) {
            // Fetch the actual PDF blob with token
            const pdfRes = await fetch(data.downloadUrl, {
              headers: { Authorization: `Bearer ${currentToken}` }
            });
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              setPdfUrl(URL.createObjectURL(blob));
            } else {
              throw new Error('Failed to fetch PDF binary');
            }
          }
        })
        .catch(() => setError('Failed to load document preview'));
      
      setBox(null);
      setLiveSignData(null);
      setPageNumber(1);
      setTimeout(() => sigCanvas.current?.clear(), 100);
    }
    
    return () => {
      // Cleanup object URL
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  async function handleSign() {
    if (!box) {
      setError('Please click on the document to place your signature box.');
      return;
    }
    
    if (sigCanvas.current?.isEmpty()) {
      setError('Please draw your signature.');
      return;
    }

    const signatureData = sigCanvas.current!.getTrimmedCanvas().toDataURL('image/png');

    setSigning(true);
    setError('');

    try {
      const res = await authFetch('/signatures', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          signatureData,
          pageNumber,
          x: box.x,
          y: box.y,
          boxWidth: box.width,
          boxHeight: box.height
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to sign document.');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setSigning(false);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // --- Interaction Handlers ---

  function handleContainerMouseDown(e: React.MouseEvent) {
    // If not clicking on the box bounds and no active drag, move the box here
    if (!dragState) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setBox({
        x: x - 75, // Center default box (150/2)
        y: y - 30, // Center default box (60/2)
        width: 150,
        height: 60
      });
    }
  }

  function handleBoxMouseDown(e: React.MouseEvent) {
    if (!box) return;
    e.stopPropagation(); // prevent container re-placement
    setDragState({ mode: 'drag', startX: e.clientX, startY: e.clientY, initialBox: { ...box } });
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    if (!box) return;
    e.stopPropagation(); // prevent drag
    setDragState({ mode: 'resize', startX: e.clientX, startY: e.clientY, initialBox: { ...box } });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragState || !box) return;
    
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    
    if (dragState.mode === 'drag') {
      setBox({
        ...box,
        x: dragState.initialBox.x + dx,
        y: dragState.initialBox.y + dy
      });
    } else if (dragState.mode === 'resize') {
      setBox({
        ...box,
        width: Math.max(50, dragState.initialBox.width + dx), // Min width
        height: Math.max(20, dragState.initialBox.height + dy) // Min height
      });
    }
  }

  function handleMouseUp() {
    setDragState(null);
  }

  function handleDrawEnd() {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setLiveSignData(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
    } else {
      setLiveSignData(null);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
    }}>
      <div className="glass-panel" style={{
        width: '95vw', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column',
        padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Sign Document</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              {documentTitle}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Content Split */}
        <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
          
          {/* Left: PDF Preview */}
          <div style={{ flex: '1 1 60%', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', userSelect: 'none' }}>
            <div style={{ padding: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <button disabled={pageNumber <= 1} onClick={() => { setPageNumber(v => v - 1); setBox(null); }} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Prev</button>
              <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Page {pageNumber} of {numPages}</span>
              <button disabled={pageNumber >= numPages} onClick={() => { setPageNumber(v => v + 1); setBox(null); }} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Next</button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', position: 'relative' }}
                 onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              {pdfUrl && (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div style={{ color: 'white', marginTop: '2rem' }}>Loading PDF Document...</div>}
                >
                  <div 
                    ref={containerRef}
                    onMouseDown={handleContainerMouseDown}
                    style={{ position: 'relative', cursor: 'crosshair', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false} 
                    />
                    {box && (
                      <div 
                        onMouseDown={handleBoxMouseDown}
                        style={{
                          position: 'absolute',
                          left: box.x,
                          top: box.y,
                          width: box.width,
                          height: box.height,
                          border: '2px dashed #10b981',
                          background: liveSignData ? 'transparent' : 'rgba(16, 185, 129, 0.15)',
                          cursor: dragState?.mode === 'drag' ? 'grabbing' : 'grab',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          color: '#10b981', fontSize: '0.75rem', fontWeight: 600,
                          overflow: 'hidden'
                      }}>
                        {liveSignData ? (
                          <img src={liveSignData} alt="Signature Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
                        ) : (
                          "Sign Here"
                        )}
                        
                        {/* Resize Handle */}
                        <div 
                          onMouseDown={handleResizeMouseDown}
                          style={{
                            position: 'absolute', bottom: 0, right: 0, 
                            width: '12px', height: '12px', 
                            background: '#10b981', 
                            cursor: 'nwse-resize',
                            borderTopLeftRadius: '4px'
                          }} 
                        />
                      </div>
                    )}
                  </div>
                </Document>
              )}
            </div>
          </div>

          {/* Right: Signature Canvas & Actions */}
          <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>1. Placement & Scaling</h3>
              {box ? (
                <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Box placed! Drag to move.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    Drag corner arrow to resize!
                  </div>
                </div>
              ) : (
                <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                  Click strictly inside the document preview to drop a signature box.
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>2. Draw Signature</h3>
              <div style={{ background: 'white', borderRadius: '12px', border: '2px solid var(--color-border)', overflow: 'hidden' }}>
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  onEnd={handleDrawEnd}
                  canvasProps={{ width: 346, height: 150, className: 'sigCanvas' }}
                />
              </div>
              <button onClick={() => { sigCanvas.current?.clear(); handleDrawEnd(); }} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', textDecoration: 'underline' }}>Clear Drawing</button>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
              <button
                onClick={onClose}
                disabled={signing}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !box}
                style={{
                  flex: 2, padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: (!box || signing) ? 'var(--color-border)' : 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', cursor: (!box || signing) ? 'not-allowed' : 'pointer', fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', transition: 'all 0.2s'
                }}
              >
                {signing ? 'Processing...' : 'Sign & Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
