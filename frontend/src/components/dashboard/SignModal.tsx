'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch, getToken, getUser } from '@/lib/auth';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
  signatureData: string; // Base64 image OR plain string if type=TEXT
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  color?: string;
  fontSize?: number;
  fontName?: string;
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
  type TabType = 'draw' | 'upload' | 'text' | 'tools' | 'vault' | 'extract';
  const [activeTab, setActiveTab] = useState<TabType>('draw');

  // Text State
  const [textInput, setTextInput] = useState('');
  const [textStyle, setTextStyle] = useState({ css: 'Brush Script MT, cursive', pdf: 'HELVETICA_OBLIQUE', size: 64, color: '#000000' });
  const textCanvasRef = useRef<HTMLCanvasElement>(null);

  // Permission State
  const [permission, setPermission] = useState<'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const isViewer = permission === 'VIEWER';

  // Live Cursors
  const [liveCursors, setLiveCursors] = useState<Record<string, {x: number, y: number, name: string, lastUpdate: number}>>({});
  const lastCursorEmitRef = useRef<number>(0);

  // Clean stale cursors
  useEffect(() => {
     const interval = setInterval(() => {
        const now = Date.now();
        setLiveCursors(prev => {
           const next = { ...prev };
           let changed = false;
           for(let k in next) {
             if (now - next[k].lastUpdate > 5000) { delete next[k]; changed = true; }
           }
           return changed ? next : prev;
        });
     }, 2000);
     return () => clearInterval(interval);
  }, []);

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
  const stompClientRef = useRef<Client | null>(null);

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
      
      ctx.font = `${textStyle.size}px ${textStyle.css}`;
      const metrics = ctx.measureText(textInput);
      const width = Math.max(10, metrics.width + 20);
      const height = Math.max(10, textStyle.size * 1.5);
      
      canvas.width = width;
      canvas.height = height;
      ctx.font = `${textStyle.size}px ${textStyle.css}`;
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

          const currentUser = getUser();
          if (currentUser?.email === data.ownerEmail) {
            setPermission('OWNER');
          } else {
             const colsRes = await authFetch(`/documents/${documentId}/collaborators`);
             if (colsRes.ok) {
                 const cols = await colsRes.json();
                 const me = cols.find((c: any) => c.email === currentUser?.email);
                 if (me) setPermission(me.permissionLevel);
             }
          }

          // Securely fetch binary PDF using temporary download token
          const tokenRes = await authFetch(`/documents/${documentId}/download-token`, { method: 'POST' });
          if (tokenRes.ok) {
            const { token: downloadToken } = await tokenRes.json();
            const downloadUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1') + `/documents/download?token=${downloadToken}`;
            const pdfRes = await fetch(downloadUrl);
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              setPdfUrl(URL.createObjectURL(blob));
            } else throw new Error('Binary fetch fail');
          } else {
            throw new Error('Failed to get download token');
          }
        } catch {
          setError('Failed to load document preview');
        }

        // Fetch Vault
        if (permission !== 'VIEWER') {
          const vaultRes = await authFetch('/saved-signatures');
          if (vaultRes.ok) setSavedSignatures(await vaultRes.json());
        }
      }
    };
    fetchDoc();

    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [isOpen, documentId]);

  useEffect(() => {
    if (!isOpen || !documentId) return;
    const token = getToken();
    const currentUser = getUser();
    if (!token || !currentUser) return;
    
    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace('/api/v1', '/ws');
    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/topic/document/${documentId}`, (message) => {
           const event = JSON.parse(message.body);
           if (event.senderEmail === currentUser.email) return; // Skip own echoes
           
           if (event.action === 'ADD') {
             setPlacedElements(prev => {
                if (prev.find(e => e.id === event.element.id)) return prev;
                return [...prev, event.element];
             });
           } else if (event.action === 'UPDATE') {
             setPlacedElements(prev => prev.map(e => e.id === event.element.id ? event.element : e));
           } else if (event.action === 'DELETE') {
             setPlacedElements(prev => prev.filter(e => e.id !== event.element.id));
           }
        });

        client.subscribe(`/topic/document/${documentId}/cursor`, (message) => {
           const event = JSON.parse(message.body);
           if (event.senderEmail === currentUser.email) return;
           
           setLiveCursors(prev => ({
             ...prev,
             [event.senderEmail]: { x: event.x, y: event.y, name: event.userName, lastUpdate: Date.now() }
           }));
        });
      }
    });
    
    client.activate();
    stompClientRef.current = client;
    
    return () => { client.deactivate(); };
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
        boxHeight: el.height,
        type: el.type || 'IMAGE',
        color: el.color,
        fontSize: el.fontSize,
        fontName: el.fontName
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

  function addUniqueElement(data: string, width: number, height: number, vaultSaveReq?: {label: string, data: string}, overrides?: Partial<PlacedElement>) {
    const ratio = width / height;
    const targetW = width > 300 ? 300 : Math.max(width, 100);
    const targetH = targetW / ratio;

    const newEl = {
      id: Math.random().toString(36).substring(7),
      signatureData: data,
      pageNumber: pageNumber,
      x: 50 + ((placedElements.length * 20) % 200),
      y: 100 + ((placedElements.length * 20) % 200),
      width: targetW,
      height: targetH,
      ...overrides
    };

    setPlacedElements(prev => [...prev, newEl]);
    
    if (stompClientRef.current?.connected) {
       stompClientRef.current.publish({
          destination: `/app/document/${documentId}/event`,
          body: JSON.stringify({ action: 'ADD', senderEmail: getUser()?.email, element: newEl })
       });
    }

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
    
    // Pass the actual string for vector rendering alongside preview data constraints
    addUniqueElement(
      textInput, 
      canvas.width, 
      canvas.height, 
      undefined,
      { type: 'TEXT', color: textStyle.color, fontSize: textStyle.size, fontName: textStyle.pdf }
    );
    
    setTextInput('');
    setSaveToVault(false);
    setVaultLabel('');
  }

  function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        addUniqueElement(dataUrl, img.width, img.height, undefined, { type: 'IMAGE' });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleAutoDate() {
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    addUniqueElement(dateStr, 150, 40, undefined, { type: 'TEXT', color: '#000000', fontSize: 18, fontName: 'HELVETICA' });
  }

  function handleInsertIcon(iconType: 'check' | 'cross') {
    // Basic SVGs passed as data URI rendering images. Backend seamlessly scales them!
    const checkSvg = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>');
    const crossSvg = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>');
    
    const svgData = iconType === 'check' ? checkSvg : crossSvg;
    addUniqueElement(svgData, 40, 40, undefined, { type: 'IMAGE' });
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
    const newEl = {
      ...el,
      id: newId,
      x: el.x + 30,
      y: el.y + 30
    };
    setPlacedElements(prev => [...prev, newEl]);
    setSelectedElementId(newId);
    if (stompClientRef.current?.connected) {
       stompClientRef.current.publish({
          destination: `/app/document/${documentId}/event`,
          body: JSON.stringify({ action: 'ADD', senderEmail: getUser()?.email, element: newEl })
       });
    }
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
      // Handle drag
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setPlacedElements(prev => prev.map(el => {
          if (el.id !== dragState.id) return el;
          if (dragState.mode === 'drag') {
            return { ...el, x: dragState.initialElement.x + dx, y: dragState.initialElement.y + dy };
          } else {
            const initialRatio = dragState.initialElement.height / dragState.initialElement.width;
            const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
            const newWidth = Math.max(40, dragState.initialElement.width + delta);
            const newHeight = newWidth * initialRatio;
            return { ...el, width: newWidth, height: newHeight };
          }
        }));
      }

      // Handle cursor broadcast
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 50 && stompClientRef.current?.connected) {
         const rect = containerRef.current?.getBoundingClientRect();
         if (rect) {
             const x = e.clientX - rect.left;
             const y = e.clientY - rect.top;
             stompClientRef.current.publish({
                destination: `/app/document/${documentId}/cursor`,
                body: JSON.stringify({ documentId, senderEmail: getUser()?.email, x, y, userName: getUser()?.firstName })
             });
             lastCursorEmitRef.current = now;
         }
      }
    },
    onMouseUp: () => {
      if (dragState && stompClientRef.current?.connected) {
         // Fire UPDATE event when dragging or scaling stops
         const el = placedElements.find(e => e.id === dragState.id);
         if (el) {
             stompClientRef.current.publish({
                destination: `/app/document/${documentId}/event`,
                body: JSON.stringify({ action: 'UPDATE', senderEmail: getUser()?.email, element: el })
             });
         }
      }
      setDragState(null);
    }
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
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden', flexDirection: 'row-reverse' }}>
          
          {/* LEFT PANELS: Live Output Target */}
          <div style={{ flex: '1 1 50%', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
            <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: 'auto', marginLeft: '1rem', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Target Document</span>
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
                      <div onMouseDown={(e) => { if (!isViewer) docHandlers.onBoxMouseDown(e, el); }} key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, border: isSelected ? '2px dashed #3b82f6' : '1px dashed transparent', outline: isSelected ? 'none' : (!isViewer ? '2px dashed rgba(16, 185, 129, 0.4)' : 'none'), cursor: isViewer ? 'default' : (dragState?.id === el.id && dragState.mode === 'drag' ? 'grabbing' : 'grab'), display: 'flex', zIndex: 10 }}>
                         
                         {el.type === 'TEXT' ? (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', color: el.color, fontSize: `${(el.width / Math.max(10, el.signatureData.length))}px`, whiteSpace: 'nowrap', opacity: isSelected ? 1 : 0.95, fontFamily: el.fontName === 'COURIER' ? 'monospace' : el.fontName === 'TIMES_ROMAN' ? 'serif' : 'Arial, sans-serif', fontStyle: el.fontName === 'HELVETICA_OBLIQUE' || el.fontName === 'TIMES_ITALIC' ? 'italic' : 'normal', fontWeight: el.fontName?.includes('BOLD') ? 'bold' : 'normal', pointerEvents: 'none' }}>{el.signatureData}</div>
                         ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={el.signatureData} alt="Element" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isSelected ? 1 : 0.95, pointerEvents: 'none' }} draggable={false}/>
                         )}
                         
                         {isSelected && (
                           <>
                             <div onMouseDown={(e) => docHandlers.onResizeMouseDown(e, el)} style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', cursor: 'nwse-resize', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                             <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', background: 'rgba(20, 25, 35, 0.95)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 20 }}>
                               <button title="Duplicate" onMouseDown={(e) => { e.stopPropagation(); handleDuplicateElement(el); }} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '2px', display: 'flex' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                               <button title="Save Vault" onMouseDown={(e) => { e.stopPropagation(); handleSaveToVaultQuick(el); }} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: '2px', display: 'flex' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg></button>
                               <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                               <button title="Delete" onMouseDown={(e) => { 
                                  e.stopPropagation(); 
                                  setPlacedElements(prev => prev.filter(p => p.id !== el.id)); 
                                  setSelectedElementId(null); 
                                  if (stompClientRef.current?.connected) {
                                      stompClientRef.current.publish({
                                         destination: `/app/document/${documentId}/event`,
                                         body: JSON.stringify({ action: 'DELETE', senderEmail: getUser()?.email, element: { id: el.id } })
                                      });
                                  }
                               }} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '2px', display: 'flex' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                             </div>
                           </>
                         )}
                      </div>
                    )})}

                    {/* Render Foreign Cursors */}
                    {Object.values(liveCursors).map((cursor, idx) => (
                      <div key={idx} style={{ position: 'absolute', left: cursor.x, top: cursor.y, pointerEvents: 'none', zIndex: 100, transition: 'all 0.05s linear' }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.84c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 00-.85.35z" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                         </svg>
                         <div style={{ position: 'absolute', top: '24px', left: '12px', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                           {cursor.name}
                         </div>
                      </div>
                    ))}
                  </div>
                </Document>
              )}
            </div>
          </div>

          {/* RIGHT PANELS: Input Method (Now Left Sidebar via row-reverse) */}
          {isViewer ? (
            <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(20, 25, 35, 0.4)', borderRadius: '12px', border: '1px solid var(--color-border)', backdropFilter: 'blur(10px)', padding: '2rem', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
               <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--color-text-muted)" strokeWidth={1.5} style={{ marginBottom: '1rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
               <h3 style={{ color: 'var(--color-text-main)', margin: '0 0 1rem 0' }}>View Only</h3>
               <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>You have Viewer privileges for this workspace.<br/><br/>The editing toolkit and signing features are disabled to protect the integrity of the document.</p>
            </div>
          ) : (
          <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(20, 25, 35, 0.4)', borderRadius: '12px', border: '1px solid var(--color-border)', backdropFilter: 'blur(10px)' }}>
            
            {/* Tab Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-border)', gap: '1px', background: 'var(--color-border)' }}>
              {['draw', 'upload', 'text', 'tools', 'vault', 'extract'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  style={{ padding: '0.8rem 0.5rem', background: activeTab === tab ? 'rgba(16, 185, 129, 0.1)' : 'rgba(20, 25, 35, 1)', border: 'none', color: activeTab === tab ? '#10b981' : 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', fontSize: '0.80rem', borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'rgba(20, 25, 35, 1)' }}
                >
                  {tab === 'vault' ? 'Vault' : tab === 'extract' ? 'PDF Extractor' : tab === 'tools' ? 'Quick Tools' : tab}
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

              {/* TAB 1.5: UPLOAD */}
              {activeTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: 0, textAlign: 'center' }}>Upload a picture of your seal, signature, or stamp directly.</p>
                  <label style={{ border: '2px dashed var(--color-accent)', borderRadius: '12px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: 'var(--color-accent)', background: 'rgba(59, 130, 246, 0.05)', width: '100%', transition: 'all 0.2s' }}>
                    <input type="file" accept="image/png, image/jpeg" onChange={handleUploadImage} style={{ display: 'none' }} />
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span style={{ marginTop: '1rem', fontWeight: 600 }}>Click to Browse Local Image</span>
                  </label>
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
                      <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Font Vector</label>
                      <select 
                        value={textStyle.pdf} 
                        onChange={e => {
                           const pdf = e.target.value;
                           const css = e.target.options[e.target.selectedIndex].getAttribute('data-css') || 'sans-serif';
                           setTextStyle(prev => ({ ...prev, pdf, css }));
                        }}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--glass-bg)', color: 'var(--color-text-main)', outline: 'none', fontFamily: textStyle.css }}
                      >
                        <option value="HELVETICA" data-css="Helvetica, Arial, sans-serif" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>Helvetica (Clean Standard)</option>
                        <option value="HELVETICA_BOLD" data-css="Helvetica, Arial, sans-serif" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 'bold' }}>Helvetica Bold (Headline)</option>
                        <option value="HELVETICA_OBLIQUE" data-css="cursive" style={{ fontFamily: 'cursive', fontStyle: 'italic' }}>Cursive (Signature Emulation)</option>
                        <option value="TIMES_ROMAN" data-css="Times New Roman, serif" style={{ fontFamily: 'Times New Roman, serif' }}>Times Roman (Formal Document)</option>
                        <option value="TIMES_BOLD" data-css="Times New Roman, serif" style={{ fontFamily: 'Times New Roman, serif', fontWeight: 'bold' }}>Times Bold (Formal Heavy)</option>
                        <option value="COURIER" data-css="Courier, monospace" style={{ fontFamily: 'Courier, monospace' }}>Courier (Typewriter / Mono)</option>
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

              {/* TAB 5: QUICK TOOLS */}
              {activeTab === 'tools' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Instantly drop common properties directly onto the document.</p>
                  
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>Date Stamp</h4>
                      <button onClick={handleAutoDate} style={{ width: '100%', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '8px', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Insert Today's Date
                      </button>
                    </div>

                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />

                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>Checkmarks & Forms</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button onClick={() => handleInsertIcon('check')} style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#10b981', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Checkmark
                        </button>
                        <button onClick={() => handleInsertIcon('cross')} style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#ef4444', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          Cross X
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}


            </div>

            {/* Action Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button disabled={signing || placedElements.length === 0} onClick={handleSign} style={{ width: '100%', padding: '1rem', borderRadius: '10px', background: (placedElements.length === 0 || signing) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)', border: (placedElements.length === 0 || signing) ? '1px solid var(--color-border)' : 'none', color: (placedElements.length === 0 || signing) ? 'var(--color-text-muted)' : 'white', cursor: (placedElements.length === 0 || signing) ? 'not-allowed' : 'pointer', fontWeight: 600, boxShadow: (placedElements.length === 0 || signing) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)', transition: 'all 0.2s', fontSize: '1rem' }}>
                {signing ? 'Working...' : `Stamp ${placedElements.length} Elements`}
              </button>
              <button disabled={signing} onClick={onClose} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                Discard Changes
              </button>
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
