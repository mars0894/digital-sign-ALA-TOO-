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

interface BoxState { x: number; y: number; width: number; height: number; }

export default function SignModal({ isOpen, onClose, documentId, documentTitle, onSuccess }: SignModalProps) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  
  // Document State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Signature Target Box
  const [box, setBox] = useState<BoxState | null>(null);
  const [dragState, setDragState] = useState<{ mode: 'drag' | 'resize', startX: number, startY: number, initialBox: BoxState } | null>(null);
  const [liveSignData, setLiveSignData] = useState<string | null>(null);

  // Tabs
  type TabType = 'draw' | 'vault' | 'extract';
  const [activeTab, setActiveTab] = useState<TabType>('draw');

  // Vault State
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
  const [saveToVault, setSaveToVault] = useState(false);
  const [vaultLabel, setVaultLabel] = useState('');

  // Extract State
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractPdfUrl, setExtractPdfUrl] = useState<string | null>(null);
  const [extractPageNumber, setExtractPageNumber] = useState(1);
  const [extractNumPages, setExtractNumPages] = useState(1);
  const [extractBox, setExtractBox] = useState<BoxState | null>(null);
  const extractContainerRef = useRef<HTMLDivElement>(null);
  const [extractDrag, setExtractDrag] = useState<any>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      const currentToken = getToken();
      if (isOpen && documentId && currentToken) {
        try {
          const res = await authFetch(`/documents/${documentId}`);
          const data = await res.json();
          if (data.downloadUrl) {
            const pdfRes = await fetch(data.downloadUrl, { headers: { Authorization: `Bearer ${currentToken}` } });
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              setPdfUrl(URL.createObjectURL(blob));
            } else throw new Error('Binary fetch fail');
          }
        } catch {
          setError('Failed to load document preview');
        }

        // Fetch Vault
        const vaultRes = await authFetch('/saved-signatures');
        if (vaultRes.ok) setSavedSignatures(await vaultRes.json());
      }
    };
    fetchDoc();

    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  async function handleSign() {
    if (!box) return setError('Please map your signature target box on the document.');
    if (!liveSignData) return setError('Please draw, select, or extract a signature below.');

    setSigning(true);
    setError('');

    try {
      // 1. Save to vault if checked
      if (saveToVault && vaultLabel.trim()) {
        await authFetch('/saved-signatures', {
          method: 'POST',
          body: JSON.stringify({ label: vaultLabel.trim(), imageData: liveSignData })
        });
      }

      // 2. Sign document
      const res = await authFetch('/signatures', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          signatureData: liveSignData,
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

  function handleDrawEnd() {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setLiveSignData(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
    } else setLiveSignData(null);
  }

  function handleExtractCrop() {
    if (!extractBox || !extractContainerRef.current) return;
    const canvas = extractContainerRef.current.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      setError("Error: Could not locate the PDF layer to extract.");
      return;
    }

    try {
      // Calculate dynamic pixel density ratio
      const ratioX = canvas.width / canvas.clientWidth;
      const ratioY = canvas.height / canvas.clientHeight;

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = extractBox.width * ratioX;
      tmpCanvas.height = extractBox.height * ratioY;
      const ctx = tmpCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas, 
          extractBox.x * ratioX, extractBox.y * ratioY, extractBox.width * ratioX, extractBox.height * ratioY,
          0, 0, tmpCanvas.width, tmpCanvas.height
        );
        
        // Intelligent Dynamic Background Removal
        const imgData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        const data = imgData.data;
        
        // 1. Find the average brightness (luma) of the cropped area.
        // Since the crop is mostly paper, the average brightness represents the "paper color", regardless of shadows!
        let sumLuma = 0;
        for (let i = 0; i < data.length; i += 4) {
          sumLuma += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        }
        const avgLuma = sumLuma / (data.length / 4);

        // 2. Set the cutoff threshold (e.g. 15% darker than the paper average)
        const threshold = avgLuma * 0.85;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;

          if (luma > threshold) {
            // It's paper (lighter than threshold) -> Make completely transparent
            data[i+3] = 0; 
          } else {
            // It's ink! 
            // Calculate opacity: darker ink becomes more opaque. Use a quadratic curve for sharper edges.
            const alpha = 255 - Math.pow(luma / threshold, 2) * 255;
            // Optionally, we can force the ink to be a bit darker to compensate for photo blowout
            data[i] = Math.max(0, r - 30);
            data[i+1] = Math.max(0, g - 30);
            data[i+2] = Math.max(0, b - 30);
            data[i+3] = Math.max(0, Math.min(255, alpha));
          }
        }
        ctx.putImageData(imgData, 0, 0);

        setLiveSignData(tmpCanvas.toDataURL('image/png'));
        setVaultLabel('Extracted from PDF');
        setSaveToVault(true); // Default to saving it for them

        // UX FIX: Auto-place the target box if they haven't so they instantly see the result
        if (!box) {
          setBox({ x: 50, y: 150, width: 250, height: (250 / tmpCanvas.width) * tmpCanvas.height });
        } else {
          // Adjust existing box aspect ratio to match extracted image
          setBox(prev => prev ? { ...prev, height: (prev.width / tmpCanvas.width) * tmpCanvas.height } : null);
        }
        
        setError('');
        setActiveTab('draw'); // Switch back to draw tab to show vault persistence options
      }
    } catch (err: any) {
      setError("Failed to extract image. " + err.message);
    }
  }

  function handleExtractFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExtractFile(file);
      setExtractPdfUrl(URL.createObjectURL(file));
      setExtractPageNumber(1);
      setExtractBox(null);
    }
  }

  // Generic Drag/Resize Logic Generator
  const createMouseHandlers = (
    stateBox: BoxState | null, setStateBox: React.Dispatch<React.SetStateAction<BoxState | null>>,
    stateDrag: any, setStateDrag: React.Dispatch<React.SetStateAction<any>>,
    ref: React.RefObject<HTMLDivElement | null>
  ) => ({
    onContainerMouseDown: (e: React.MouseEvent) => {
      if (stateDrag) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setStateBox({ x: (e.clientX - rect.left) - 75, y: (e.clientY - rect.top) - 30, width: 150, height: 60 });
    },
    onBoxMouseDown: (e: React.MouseEvent) => {
      if (!stateBox) return;
      e.stopPropagation();
      setStateDrag({ mode: 'drag', startX: e.clientX, startY: e.clientY, initialBox: { ...stateBox } });
    },
    onResizeMouseDown: (e: React.MouseEvent) => {
      if (!stateBox) return;
      e.stopPropagation();
      setStateDrag({ mode: 'resize', startX: e.clientX, startY: e.clientY, initialBox: { ...stateBox } });
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!stateDrag || !stateBox) return;
      const dx = e.clientX - stateDrag.startX;
      const dy = e.clientY - stateDrag.startY;
      if (stateDrag.mode === 'drag') {
        setStateBox({ ...stateBox, x: stateDrag.initialBox.x + dx, y: stateDrag.initialBox.y + dy });
      } else {
        setStateBox({ ...stateBox, width: Math.max(50, stateDrag.initialBox.width + dx), height: Math.max(20, stateDrag.initialBox.height + dy) });
      }
    },
    onMouseUp: () => setStateDrag(null)
  });

  const docHandlers = createMouseHandlers(box, setBox, dragState, setDragState, containerRef);
  const extrHandlers = createMouseHandlers(extractBox, setExtractBox, extractDrag, setExtractDrag, extractContainerRef);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
      <div className="glass-panel" style={{ width: '95vw', maxWidth: '1300px', height: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Sign Target Document</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>{documentTitle}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>
        {error && <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.875rem' }}>{error}</div>}

        {/* Split UI */}
        <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT PANELS: Live Output Target */}
          <div style={{ flex: '1 1 50%', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
            <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-main)', marginRight: 'auto', marginLeft: '1rem', display: 'flex', alignItems: 'center' }}>Target Document Preview</span>
              <button disabled={pageNumber <= 1} onClick={() => setPageNumber(v => v - 1)} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Prev</button>
              <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Page {pageNumber} of {numPages}</span>
              <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(v => v + 1)} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Next</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', justifyContent: 'center', position: 'relative' }} onMouseMove={docHandlers.onMouseMove} onMouseUp={docHandlers.onMouseUp} onMouseLeave={docHandlers.onMouseUp}>
              {pdfUrl && (
                <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                  <div ref={containerRef} onMouseDown={docHandlers.onContainerMouseDown} style={{ position: 'relative', cursor: 'crosshair', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                    {box && (
                      <div onMouseDown={docHandlers.onBoxMouseDown} style={{ position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height, border: '2px dashed #10b981', background: liveSignData ? 'transparent' : 'rgba(16, 185, 129, 0.15)', cursor: dragState?.mode === 'drag' ? 'grabbing' : 'grab', display: 'flex', overflow: 'hidden' }}>
                        {liveSignData ? <img src={liveSignData} alt="Sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false}/> : <div style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#10b981', fontWeight:600}}>Sign Target</div>}
                        <div onMouseDown={docHandlers.onResizeMouseDown} style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#10b981', cursor: 'nwse-resize', borderTopLeftRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                </Document>
              )}
            </div>
          </div>

          {/* RIGHT PANELS: Input Method */}
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            
            {/* Tab Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {['draw', 'vault', 'extract'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  style={{ flex: 1, padding: '1rem', background: activeTab === tab ? 'rgba(16, 185, 129, 0.1)' : 'transparent', border: 'none', color: activeTab === tab ? '#10b981' : 'var(--color-text-main)', borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}
                >
                  {tab === 'vault' ? 'Saved Vault' : tab === 'extract' ? 'PDF Extractor' : 'Draw New'}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              {/* TAB 1: DRAW */}
              {activeTab === 'draw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Use your mouse or touchscreen to draw a fresh signature.</p>
                  <div style={{ background: 'white', borderRadius: '12px', border: '2px solid var(--color-border)', overflow: 'hidden', height: '200px' }}>
                    <SignatureCanvas ref={sigCanvas} penColor="black" onEnd={handleDrawEnd} canvasProps={{ width: 1000, height: 200, className: 'sigCanvas', style: { width: '100%', height: '100%' } }} />
                  </div>
                  <button onClick={() => { sigCanvas.current?.clear(); handleDrawEnd(); }} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>Clear Context</button>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-main)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={saveToVault} onChange={e => setSaveToVault(e.target.checked)} style={{ width: '16px', height: '16px' }}/>
                      Save this signature to Vault
                    </label>
                    {saveToVault && (
                      <input type="text" placeholder="Enter custom label (e.g. My Formal Signature)" value={vaultLabel} onChange={e => setVaultLabel(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)' }} />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: VAULT */}
              {activeTab === 'vault' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Quickly apply a previously saved signature variant.</p>
                  {savedSignatures.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>Your signature vault is empty.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {savedSignatures.map(sig => (
                        <div key={sig.id} onClick={() => setLiveSignData(sig.imageData)} style={{ background: liveSignData === sig.imageData ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', border: liveSignData === sig.imageData ? '2px solid #10b981' : '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                          <img src={sig.imageData} alt={sig.label} style={{ height: '60px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{sig.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EXTRACT */}
              {activeTab === 'extract' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Upload an old document, draw a box over your signature to crop it, and extract it!</p>
                  
                  {!extractPdfUrl ? (
                    <label style={{ border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      <input type="file" accept="application/pdf" onChange={handleExtractFileUpload} style={{ display: 'none' }} />
                      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <span style={{ marginTop: '1rem' }}>Click to Browse Local PDF</span>
                    </label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                        <button disabled={extractPageNumber <= 1} onClick={() => setExtractPageNumber(v => v - 1)} style={{ padding: '0.2rem 0.5rem' }}>&larr; Prev</button>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-main)' }}>Page {extractPageNumber} of {extractNumPages}</span>
                        <button disabled={extractPageNumber >= extractNumPages} onClick={() => setExtractPageNumber(v => v + 1)} style={{ padding: '0.2rem 0.5rem' }}>Next &rarr;</button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'center' }} onMouseMove={extrHandlers.onMouseMove} onMouseUp={extrHandlers.onMouseUp} onMouseLeave={extrHandlers.onMouseUp}>
                        <Document file={extractPdfUrl} onLoadSuccess={({ numPages }) => setExtractNumPages(numPages)}>
                          <div ref={extractContainerRef} onMouseDown={extrHandlers.onContainerMouseDown} style={{ position: 'relative', cursor: 'crosshair', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                            <Page pageNumber={extractPageNumber} renderTextLayer={false} renderAnnotationLayer={false} width={400} />
                            {extractBox && (
                              <div onMouseDown={extrHandlers.onBoxMouseDown} style={{ position: 'absolute', left: extractBox.x, top: extractBox.y, width: extractBox.width, height: extractBox.height, border: '2px solid #3b82f6', background: 'rgba(59, 130, 246, 0.2)', cursor: extractDrag?.mode === 'drag' ? 'grabbing' : 'grab' }}>
                                <div onMouseDown={extrHandlers.onResizeMouseDown} style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#3b82f6', cursor: 'nwse-resize' }} />
                              </div>
                            )}
                          </div>
                        </Document>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button onClick={() => { setExtractPdfUrl(null); setExtractBox(null); }} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-main)', cursor: 'pointer' }}>Cancel Source</button>
                        <button onClick={handleExtractCrop} disabled={!extractBox} style={{ flex: 2, padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: extractBox ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Crop & Apply Extracted Image</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Action Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem' }}>
              <button disabled={signing} onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel Draft</button>
              <button disabled={signing || !box || !liveSignData} onClick={handleSign} style={{ flex: 2, padding: '0.85rem', borderRadius: '10px', background: (!box || !liveSignData || signing) ? 'var(--color-border)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', cursor: (!box || !liveSignData || signing) ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                {signing ? 'Finalizing Signature...' : 'Stamp & Complete Document'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
