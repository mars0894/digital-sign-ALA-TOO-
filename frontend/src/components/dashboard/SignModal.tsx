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

interface PlacedElement {
  id: string;
  signatureData: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SignModal({ isOpen, onClose, documentId, documentTitle, onSuccess }: SignModalProps) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  
  // Document State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Placed Elements Array
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([]);
  const [dragState, setDragState] = useState<{ mode: 'drag' | 'resize', id: string, startX: number, startY: number, initialElement: PlacedElement } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Tabs
  type TabType = 'draw' | 'vault' | 'extract' | 'text';
  const [activeTab, setActiveTab] = useState<TabType>('draw');

  // Text State
  const [textInput, setTextInput] = useState('');
  const [textStyle, setTextStyle] = useState({ font: 'Brush Script MT, cursive', size: 64, color: '#000000' });
  const textCanvasRef = useRef<HTMLCanvasElement>(null);

  // Vault State
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
  const [saveToVault, setSaveToVault] = useState(false);
  const [vaultLabel, setVaultLabel] = useState('');

  // Extract State
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractPdfUrl, setExtractPdfUrl] = useState<string | null>(null);
  const [extractPageNumber, setExtractPageNumber] = useState(1);
  const [extractNumPages, setExtractNumPages] = useState(1);
  const [extractBox, setExtractBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const extractContainerRef = useRef<HTMLDivElement>(null);
  const [extractDrag, setExtractDrag] = useState<any>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);

  async function handleDeleteVaultSig(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved signature from your vault?')) return;
    try {
      const res = await authFetch(`/saved-signatures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedSignatures(prev => prev.filter(s => s.id !== id));
      } else {
        setError('Failed to delete saved signature.');
      }
    } catch {
      setError('A network error occurred while deleting.');
    }
  }

  // Pre-render text snippet to canvas
  useEffect(() => {
    if (activeTab === 'text') {
      const canvas = textCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (!textInput.trim()) {
         ctx.clearRect(0,0, canvas.width, canvas.height);
         return;
      }
      
      ctx.font = `${textStyle.size}px ${textStyle.font}`;
      const metrics = ctx.measureText(textInput);
      const width = Math.max(10, metrics.width + 20);
      const height = Math.max(10, textStyle.size * 1.5);
      
      canvas.width = width;
      canvas.height = height;
      ctx.font = `${textStyle.size}px ${textStyle.font}`;
      ctx.fillStyle = textStyle.color;
      ctx.textBaseline = 'middle';
      ctx.fillText(textInput, 10, height / 2);
    }
  }, [textInput, textStyle, activeTab]);

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
    if (placedElements.length === 0) {
      return setError('Please insert at least one element onto the document.');
    }

    setSigning(true);
    setError('');

    try {
      const payloadElements = placedElements.map(el => ({
        signatureData: el.signatureData,
        pageNumber: el.pageNumber,
        x: el.x,
        y: el.y,
        boxWidth: el.width,
        boxHeight: el.height
      }));

      const res = await authFetch('/signatures', {
        method: 'POST',
        body: JSON.stringify({
          documentId,
          elements: payloadElements
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

  function addUniqueElement(data: string, width: number, height: number, vaultSaveReq?: {label: string, data: string}) {
    const ratio = width / height;
    const targetW = width > 300 ? 300 : Math.max(width, 100);
    const targetH = targetW / ratio;

    setPlacedElements(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      signatureData: data,
      pageNumber: pageNumber,
      x: 50 + ((prev.length * 20) % 200),
      y: 100 + ((prev.length * 20) % 200),
      width: targetW,
      height: targetH
    }]);

    // Handle vault auto-saving silently
    if (vaultSaveReq) {
      authFetch('/saved-signatures', {
        method: 'POST',
        body: JSON.stringify({ label: vaultSaveReq.label, imageData: vaultSaveReq.data })
      });
    }
  }

  function handleInsertDrawing() {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
       const canvas = sigCanvas.current.getTrimmedCanvas();
       const data = canvas.toDataURL('image/png');
       addUniqueElement(data, canvas.width, canvas.height, (saveToVault && vaultLabel.trim()) ? {label: vaultLabel.trim(), data} : undefined);
       sigCanvas.current.clear();
       setSaveToVault(false);
       setVaultLabel('');
    }
  }

  function handleInsertVault(sig: any) {
    // Basic approximate aspect ratio to map from DB image string
    addUniqueElement(sig.imageData, 200, 100);
  }

  function handleInsertText() {
    if (!textInput.trim() || !textCanvasRef.current) return;
    const canvas = textCanvasRef.current;
    const data = canvas.toDataURL('image/png');
    addUniqueElement(data, canvas.width, canvas.height, (saveToVault && vaultLabel.trim()) ? {label: vaultLabel.trim(), data} : undefined);
    setTextInput('');
    setSaveToVault(false);
    setVaultLabel('');
  }

  function handleExtractCrop() {
    if (!extractBox || !extractContainerRef.current) return;
    const canvas = extractContainerRef.current.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return setError("Error: Could not locate the PDF layer to extract.");

    try {
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
        
        const imgData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        const data = imgData.data;
        let sumLuma = 0;
        for (let i = 0; i < data.length; i += 4) {
          sumLuma += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        }
        const avgLuma = sumLuma / (data.length / 4);
        const threshold = avgLuma * 0.85;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luma > threshold) {
            data[i+3] = 0; 
          } else {
            const alpha = 255 - Math.pow(luma / threshold, 2) * 255;
            data[i] = Math.max(0, r - 30);
            data[i+1] = Math.max(0, g - 30);
            data[i+2] = Math.max(0, b - 30);
            data[i+3] = Math.max(0, Math.min(255, alpha));
          }
        }
        ctx.putImageData(imgData, 0, 0);

        const dataUrl = tmpCanvas.toDataURL('image/png');
        addUniqueElement(dataUrl, tmpCanvas.width, tmpCanvas.height, {label: 'Extracted from PDF', data: dataUrl});
        setError('');
        setActiveTab('draw'); 
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

  function handleDuplicateElement(el: PlacedElement) {
    const newId = Math.random().toString(36).substring(7);
    setPlacedElements(prev => [...prev, {
      ...el,
      id: newId,
      x: el.x + 30,
      y: el.y + 30
    }]);
    setSelectedElementId(newId);
  }

  async function handleSaveToVaultQuick(el: PlacedElement) {
    const label = prompt("Enter a label to save this item to your Vault:", "Saved Item");
    if (!label) return;
    try {
      const res = await authFetch('/saved-signatures', {
        method: 'POST',
        body: JSON.stringify({ label, imageData: el.signatureData })
      });
      if (res.ok) {
        alert("Saved to vault successfully!");
        const vaultRes = await authFetch('/saved-signatures');
        if (vaultRes.ok) setSavedSignatures(await vaultRes.json());
      } else {
        alert("Failed to save to vault.");
      }
    } catch {
      alert("Network error.");
    }
  }

  // Multi-element drag handles
  const docHandlers = {
    onContainerMouseDown: () => { setSelectedElementId(null); }, // deselect when generic PDF is clicked
    onBoxMouseDown: (e: React.MouseEvent, el: PlacedElement) => {
      e.stopPropagation();
      setSelectedElementId(el.id);
      setDragState({ mode: 'drag', id: el.id, startX: e.clientX, startY: e.clientY, initialElement: { ...el } });
    },
    onResizeMouseDown: (e: React.MouseEvent, el: PlacedElement) => {
      e.stopPropagation();
      setSelectedElementId(el.id);
      setDragState({ mode: 'resize', id: el.id, startX: e.clientX, startY: e.clientY, initialElement: { ...el } });
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setPlacedElements(prev => prev.map(el => {
        if (el.id !== dragState.id) return el;
        if (dragState.mode === 'drag') {
          return { ...el, x: dragState.initialElement.x + dx, y: dragState.initialElement.y + dy };
        } else {
          // Proportional scale to preserve signature aspect ratio perfectly
          const initialRatio = dragState.initialElement.height / dragState.initialElement.width;
          // Use the largest movement vector to determine scale direction
          const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          const newWidth = Math.max(40, dragState.initialElement.width + delta);
          const newHeight = newWidth * initialRatio;
          
          return { ...el, width: newWidth, height: newHeight };
        }
      }));
    },
    onMouseUp: () => setDragState(null)
  };

  // Extractor specific generic mouse handler
  const extrHandlers = {
    onContainerMouseDown: (e: React.MouseEvent) => {
      if (extractDrag) return;
      const rect = extractContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setExtractBox({ x: (e.clientX - rect.left) - 75, y: (e.clientY - rect.top) - 30, width: 150, height: 60 });
    },
    onBoxMouseDown: (e: React.MouseEvent) => {
      if (!extractBox) return;
      e.stopPropagation();
      setExtractDrag({ mode: 'drag', startX: e.clientX, startY: e.clientY, initialBox: { ...extractBox } });
    },
    onResizeMouseDown: (e: React.MouseEvent) => {
      if (!extractBox) return;
      e.stopPropagation();
      setExtractDrag({ mode: 'resize', startX: e.clientX, startY: e.clientY, initialBox: { ...extractBox } });
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!extractDrag || !extractBox) return;
      const dx = e.clientX - extractDrag.startX;
      const dy = e.clientY - extractDrag.startY;
      if (extractDrag.mode === 'drag') {
        setExtractBox({ ...extractBox, x: extractDrag.initialBox.x + dx, y: extractDrag.initialBox.y + dy });
      } else {
        setExtractBox({ ...extractBox, width: Math.max(50, extractDrag.initialBox.width + dx), height: Math.max(20, extractDrag.initialBox.height + dy) });
      }
    },
    onMouseUp: () => setExtractDrag(null)
  };

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
            <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: 'auto', marginLeft: '1rem', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Target Document Preview</span>
                {selectedElementId && (() => {
                  const el = placedElements.find(p => p.id === selectedElementId);
                  return el ? (
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                      <button title="Duplicate Selected" onClick={() => handleDuplicateElement(el)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Duplicate
                      </button>
                      <button title="Save to Vault" onClick={() => handleSaveToVaultQuick(el)} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Save Vault
                      </button>
                      <button title="Delete Selected" onClick={() => { setPlacedElements(prev => prev.filter(p => p.id !== el.id)); setSelectedElementId(null); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>
              <button disabled={pageNumber <= 1} onClick={() => setPageNumber(v => v - 1)} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Prev</button>
              <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Page {pageNumber} of {numPages}</span>
              <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(v => v + 1)} style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', background: 'var(--glass-bg)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>Next</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', justifyContent: 'center', position: 'relative' }} onMouseMove={docHandlers.onMouseMove} onMouseUp={docHandlers.onMouseUp} onMouseLeave={docHandlers.onMouseUp}>
              {pdfUrl && (
                <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                  <div ref={containerRef} onMouseDown={docHandlers.onContainerMouseDown} style={{ position: 'relative', cursor: 'crosshair', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                    
                    {/* Render Pinned Elements for this page */}
                    {placedElements.filter(e => e.pageNumber === pageNumber).map(el => {
                      const isSelected = selectedElementId === el.id;
                      return (
                      <div onMouseDown={(e) => docHandlers.onBoxMouseDown(e, el)} key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, border: isSelected ? '2px dashed #3b82f6' : '1px dashed transparent', outline: isSelected ? 'none' : '2px dashed rgba(16, 185, 129, 0.4)', cursor: dragState?.id === el.id && dragState.mode === 'drag' ? 'grabbing' : 'grab', display: 'flex' }}>
                         
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={el.signatureData} alt="Element" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isSelected ? 1 : 0.95 }} draggable={false}/>
                         
                         {isSelected && (
                           <div onMouseDown={(e) => docHandlers.onResizeMouseDown(e, el)} style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', cursor: 'nwse-resize', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                         )}
                      </div>
                    )})}
                  </div>
                </Document>
              )}
            </div>
          </div>

          {/* RIGHT PANELS: Input Method */}
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            
            {/* Tab Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {['draw', 'text', 'vault', 'extract'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  style={{ flex: 1, padding: '1rem', background: activeTab === tab ? 'rgba(16, 185, 129, 0.1)' : 'transparent', border: 'none', color: activeTab === tab ? '#10b981' : 'var(--color-text-main)', borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}
                >
                  {tab === 'vault' ? 'Saved Vault' : tab === 'extract' ? 'PDF Extractor' : tab === 'text' ? 'Type Text' : 'Draw New'}
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
                    <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{ width: 1000, height: 200, className: 'sigCanvas', style: { width: '100%', height: '100%' } }} />
                  </div>
                  <button onClick={() => { sigCanvas.current?.clear(); }} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>Clear Canvas</button>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-main)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={saveToVault} onChange={e => setSaveToVault(e.target.checked)} style={{ width: '16px', height: '16px' }}/>
                      Save this signature to Vault for future use
                    </label>
                    {saveToVault && (
                      <input type="text" placeholder="Enter custom label (e.g. My Formal Signature)" value={vaultLabel} onChange={e => setVaultLabel(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)' }} />
                    )}
                  </div>
                  <button onClick={handleInsertDrawing} style={{ width: '100%', padding: '0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem' }}>Insert Drawing into Document</button>
                </div>
              )}

              {/* TAB 2: VAULT */}
              {activeTab === 'vault' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Click any saved signature variant to immediately insert it into the document.</p>
                  {savedSignatures.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>Your signature vault is empty.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {savedSignatures.map(sig => (
                        <div 
                           key={sig.id} 
                           onClick={() => handleInsertVault(sig)} 
                           style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                           onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                           onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        >
                          <button 
                            onClick={(e) => handleDeleteVaultSig(sig.id, e)} 
                            style={{ position: 'absolute', top: '0.3rem', right: '0.3rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Delete Signature"
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sig.imageData} alt={sig.label} style={{ height: '60px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>{sig.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EXTRACT */}
              {activeTab === 'extract' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Upload an old document, crop out your signature, and extract it cleanly!</p>
                  
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
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setExtractBox(null); }}
                                  style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottomLeftRadius: '6px', padding: 0 }}
                                  title="Remove Extractor Box"
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                <div onMouseDown={extrHandlers.onResizeMouseDown} style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#3b82f6', cursor: 'nwse-resize' }} />
                              </div>
                            )}
                          </div>
                        </Document>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button onClick={() => { setExtractPdfUrl(null); setExtractBox(null); }} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel Source</button>
                        <button onClick={handleExtractCrop} disabled={!extractBox} style={{ flex: 2, padding: '0.8rem', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: extractBox ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Crop & Insert directly to Page</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TEXT */}
              {activeTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Type your name or any text to generate a signature block.</p>
                  
                  <input 
                    type="text" 
                    placeholder="Type here..." 
                    value={textInput} 
                    onChange={e => setTextInput(e.target.value)} 
                    style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--glass-bg)', color: 'var(--color-text-main)', fontSize: '1.2rem', outline: 'none' }} 
                  />
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Font</label>
                      <select 
                        value={textStyle.font} 
                        onChange={e => setTextStyle(prev => ({ ...prev, font: e.target.value }))}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--glass-bg)', color: 'var(--color-text-main)', outline: 'none' }}
                      >
                        <option value="Brush Script MT, cursive">Brush Script (Cursive)</option>
                        <option value="Arial, sans-serif">Arial (Sans-Serif)</option>
                        <option value="Georgia, serif">Georgia (Serif)</option>
                        <option value="Courier New, monospace">Courier New (Monospace)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Color</label>
                      <input 
                        type="color" 
                        value={textStyle.color} 
                        onChange={e => setTextStyle(prev => ({ ...prev, color: e.target.value }))}
                        style={{ padding: '0', borderRadius: '6px', border: '1px solid var(--color-border)', height: '2.4rem', width: '3rem', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ background: 'white', borderRadius: '12px', border: '2px solid var(--color-border)', overflow: 'hidden', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <canvas ref={textCanvasRef} style={{ display: textInput ? 'block' : 'none', maxWidth: '100%', maxHeight: '100%' }} />
                    {!textInput && <span style={{ color: '#aaa' }}>Preview</span>}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-main)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={saveToVault} onChange={e => setSaveToVault(e.target.checked)} style={{ width: '16px', height: '16px' }}/>
                      Save this text block to Vault
                    </label>
                    {saveToVault && (
                      <input type="text" placeholder="Enter custom label (e.g. Director Title)" value={vaultLabel} onChange={e => setVaultLabel(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--glass-bg)', color: 'var(--color-text-main)', outline: 'none' }} />
                    )}
                  </div>
                  <button onClick={handleInsertText} style={{ width: '100%', padding: '0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1.05rem' }}>Insert Text into Document</button>
                </div>
              )}

            </div>

            {/* Action Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginRight: 'auto' }}>
                {placedElements.length} element(s) to stamp
              </span>
              <button disabled={signing} onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button disabled={signing || placedElements.length === 0} onClick={handleSign} style={{ flex: 2, padding: '0.85rem', borderRadius: '10px', background: (placedElements.length === 0 || signing) ? 'var(--color-border)' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', cursor: (placedElements.length === 0 || signing) ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                {signing ? 'Finalizing Document...' : 'Stamp & Complete Document'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
