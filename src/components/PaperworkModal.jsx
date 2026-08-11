import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Download, ExternalLink, File, Plus, Trash2, 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function PaperworkModal({ 
  isOpen, 
  onClose, 
  loan, 
  onAddDocument, 
  onDeleteDocument 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [docName, setDocName] = useState('');
  const [docFiles, setDocFiles] = useState([]);
  
  // Lightbox Zoom State
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setShowAddForm(false);
    setDocName('');
    setDocFiles([]);
    setZoomImage(null);
    setZoomIndex(0);
    setZoomLevel(1);
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const documents = loan.documents || [];
  const imageDocs = documents.filter(d => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(d.file_path));
  const maxReached = documents.length >= 5;

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!docFiles.length) return;

    const formData = new FormData();
    formData.append('document_name', docName || '');

    docFiles.forEach(file => {
      formData.append('document_files', file);
    });

    if (onAddDocument) {
      await onAddDocument(loan.id, formData);
    }
    setDocName('');
    setDocFiles([]);
    setShowAddForm(false);
  };

  const isImageFile = (filePath) => {
    if (!filePath) return false;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filePath);
  };

  const openLightbox = (doc) => {
    const idx = imageDocs.findIndex(d => d.id === doc.id);
    setZoomIndex(idx >= 0 ? idx : 0);
    setZoomImage(doc.file_path);
    setZoomLevel(1);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (imageDocs.length <= 1) return;
    const prevIdx = zoomIndex === 0 ? imageDocs.length - 1 : zoomIndex - 1;
    setZoomIndex(prevIdx);
    setZoomImage(imageDocs[prevIdx]?.file_path);
    setZoomLevel(1);
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (imageDocs.length <= 1) return;
    const nextIdx = zoomIndex === imageDocs.length - 1 ? 0 : zoomIndex + 1;
    setZoomIndex(nextIdx);
    setZoomImage(imageDocs[nextIdx]?.file_path);
    setZoomLevel(1);
  };

  const handleDownload = (e, url, fileName) => {
    e.stopPropagation();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ padding: '1.75rem', maxWidth: '680px', width: '95%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <FileText size={22} color="#6366f1" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Agreement &amp; ID Paperwork
              </h2>
              <span className={`badge ${maxReached ? 'badge-overdue' : 'badge-active'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                {documents.length}/5 Docs
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Borrower: <strong style={{ color: 'var(--text-primary)' }}>{loan.loan_taker}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!maxReached && (
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
              >
                <Plus size={14} />
                <span>{showAddForm ? 'Cancel' : 'Upload Docs (1-5)'}</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Add Document Inline Form (Select 1-5 Files at once) */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} style={{ background: 'var(--bg-primary)', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-cyan)', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={15} />
              <span>Attach Paperwork / ID Documents (Select 1 to {5 - documents.length} files at once)</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Document Label / Group Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Aadhar & Loan Agreement"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select File(s) (Image / PDF) *</label>
                <input 
                  type="file" 
                  multiple
                  accept="image/*,application/pdf"
                  className="form-input" 
                  required
                  onChange={(e) => {
                    const files = Array.from(e.target.files).slice(0, 5 - documents.length);
                    setDocFiles(files);
                  }}
                />
              </div>
            </div>

            {docFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                <strong>{docFiles.length} file(s) selected:</strong>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {docFiles.map((f, idx) => (
                    <span key={idx} style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                Upload Selected Files
              </button>
            </div>
          </form>
        )}

        {/* Document List */}
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
            <FileText size={32} style={{ opacity: 0.5, marginBottom: '0.4rem' }} />
            <div>No paperwork documents uploaded for this loan.</div>
            <button 
              onClick={() => setShowAddForm(true)} 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', fontSize: '0.78rem' }}
            >
              <Plus size={14} />
              <span>Upload First Document</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {documents.map((doc) => {
              const isImg = isImageFile(doc.file_path);
              return (
                <div 
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    gap: '1rem'
                  }}
                >
                  {/* Left: Icon & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    {isImg ? (
                      <div 
                        onClick={() => openLightbox(doc)}
                        style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--accent-blue)', flexShrink: 0 }}
                        title="Click to Zoom Image"
                      >
                        <img src={doc.file_path} alt={doc.document_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', flexShrink: 0 }}>
                        <File size={20} />
                      </div>
                    )}
                    
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div 
                        style={{ 
                          fontWeight: 700, 
                          fontSize: '0.875rem', 
                          color: 'var(--text-primary)',
                          wordBreak: 'break-word',
                          lineHeight: '1.3'
                        }}
                        title={doc.document_name}
                      >
                        {doc.document_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Uploaded: {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons fixed cleanly */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {isImg && (
                      <button 
                        onClick={() => openLightbox(doc)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        <ZoomIn size={13} color="currentColor" />
                        <span>Zoom</span>
                      </button>
                    )}

                    <a 
                      href={doc.file_path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <ExternalLink size={13} />
                      <span>Open</span>
                    </a>

                    <button 
                      onClick={(e) => handleDownload(e, doc.file_path, `${doc.document_name}`)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <Download size={13} color="currentColor" />
                      <span>Save</span>
                    </button>

                    {onDeleteDocument && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete document "${doc.document_name}"?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX & ZOOM MODAL WITH NAVIGATION ARROWS */}
      {zoomImage && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999, 
            background: 'rgba(4, 8, 20, 0.95)', 
            backdropFilter: 'blur(16px)',
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => { setZoomImage(null); setZoomLevel(1); }}
        >
          {/* Lightbox Top Controls Bar */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem',
              zIndex: 10000 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>
              Zoom: {Math.round(zoomLevel * 100)}%
            </div>

            <button 
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}
              style={{
                padding: '0.5rem',
                borderRadius: '50%',
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Zoom In (+)"
            >
              <ZoomIn size={18} />
            </button>

            <button 
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))}
              style={{
                padding: '0.5rem',
                borderRadius: '50%',
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Zoom Out (-)"
            >
              <ZoomOut size={18} />
            </button>

            <button 
              onClick={() => setZoomLevel(1)}
              style={{
                padding: '0.5rem',
                borderRadius: '50%',
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Reset Zoom"
            >
              <RotateCcw size={18} />
            </button>

            <button 
              onClick={(e) => handleDownload(e, zoomImage, 'paperwork_document.jpg')}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            <button 
              onClick={() => { setZoomImage(null); setZoomLevel(1); }}
              className="btn btn-danger"
              style={{ padding: '0.5rem', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close Lightbox"
            >
              <X size={20} />
            </button>
          </div>

          {/* Previous / Next Image Navigation Arrows */}
          {imageDocs.length > 1 && (
            <>
              <button 
                onClick={handlePrevImage}
                style={{
                  position: 'absolute',
                  left: '25px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10000,
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
                title="Previous Image"
              >
                <ChevronLeft size={26} />
              </button>

              <button 
                onClick={handleNextImage}
                style={{
                  position: 'absolute',
                  right: '25px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10000,
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
                title="Next Image"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          {/* Zoomable Image View */}
          <div 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              overflow: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={zoomImage} 
              alt="Paperwork Document High Res" 
              style={{ 
                transform: `scale(${zoomLevel})`, 
                transition: 'transform 0.2s ease', 
                maxWidth: '100%', 
                maxHeight: '75vh', 
                borderRadius: '8px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)' 
              }} 
            />
          </div>

        </div>
      )}

    </div>
  );
}
