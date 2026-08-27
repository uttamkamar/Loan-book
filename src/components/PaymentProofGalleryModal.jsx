import React, { useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Download, ZoomIn, ZoomOut, RotateCcw, 
  ChevronLeft, ChevronRight, Calendar, DollarSign, ShieldCheck, FileCheck
} from 'lucide-react';

export function downloadPaymentProof(imageUrl, loanTaker, loanId, dateStr) {
  if (!imageUrl) return;

  // Determine file extension
  let ext = 'jpg';
  const cleanUrl = imageUrl.split('?')[0];
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    ext = match[1].toLowerCase();
  }

  // Format borrower name (remove special characters, replace spaces with underscores)
  const safeName = (loanTaker || 'Borrower')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');

  // Format date
  const safeDate = (dateStr || new Date().toISOString().split('T')[0])
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '_');

  // Construct filename: loan taker name followed by ID followed by date
  const fileName = `${safeName}_ID${loanId}_${safeDate}.${ext}`;

  fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      // Fallback
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

export default function PaymentProofGalleryModal({ isOpen, onClose, loan, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex || 0);
      setZoomLevel(1);
    }
  }, [isOpen, loan, initialIndex]);

  if (!isOpen || !loan) return null;

  // Gather all proof items
  const proofItems = [];

  // Initial disbursement proof
  if (loan.proof_path) {
    proofItems.push({
      type: 'Disbursement Proof',
      title: 'Initial Loan Disbursement Proof',
      date: loan.date_given,
      amount: loan.loan_amount,
      mode: loan.payment_mode || 'Gpay',
      url: loan.proof_path
    });
  }

  // Installment payment proofs
  (loan.installments || []).forEach((inst) => {
    if (inst.proof_path) {
      proofItems.push({
        type: `Installment #${inst.installment_no}`,
        title: `Payment #${inst.installment_no} Proof`,
        date: inst.payment_date,
        amount: inst.amount_paid,
        mode: inst.payment_mode || 'Gpay',
        remark: inst.remark,
        url: inst.proof_path
      });
    }
  });

  const activeItem = proofItems[currentIndex] || null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? proofItems.length - 1 : prev - 1));
    setZoomLevel(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === proofItems.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="modal-container" 
        style={{ 
          padding: '1.75rem', 
          maxWidth: '820px', 
          width: '95%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={22} color="#10b981" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Payment Proof Viewer
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Borrower: <strong style={{ color: 'var(--text-primary)' }}>{loan.loan_taker}</strong> | Loan ID: <strong style={{ color: '#6366f1' }}>#{loan.id}</strong>
            </p>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {proofItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
            <ImageIcon size={42} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No payment proof file uploaded for this transaction.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Proof uploads are required for online transactions (Gpay, PhonePe, Bank Transfer) when creating a loan or recording payment installments.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Top Toolbar: Details & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span className="badge badge-active" style={{ fontSize: '0.7rem', marginRight: '0.5rem' }}>
                  {activeItem.type}
                </span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  ₹{parseFloat(activeItem.amount).toLocaleString('en-IN')} via {activeItem.mode}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                  ({activeItem.date})
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                <button 
                  onClick={handleZoomIn} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>

                <button 
                  onClick={handleZoomOut} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>

                <button 
                  onClick={handleResetZoom} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>

                <button 
                  onClick={() => downloadPaymentProof(activeItem.url, loan.loan_taker, loan.id, activeItem.date)}
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  title={`Download formatted as ${loan.loan_taker.replace(/\s+/g, '_')}_ID${loan.id}_${activeItem.date}.jpg`}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Main Interactive Zoomable Lightbox Stage */}
            <div 
              style={{ 
                position: 'relative', 
                height: '450px', 
                background: '#040814', 
                borderRadius: 'var(--radius-lg)', 
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Image Container */}
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  overflow: 'auto', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '1rem'
                }}
              >
                <img 
                  src={activeItem.url} 
                  alt={activeItem.title}
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.2s ease',
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                  }}
                />
              </div>

              {/* Zoom Indicator Badge */}
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem' }}>
                Zoom: {Math.round(zoomLevel * 100)}%
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
