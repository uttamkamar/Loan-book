import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Camera, AlertOctagon, Tag, 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, 
  Download, Plus, Trash2, Maximize2, Upload, Sparkles 
} from 'lucide-react';

export default function CollateralGalleryModal({ 
  isOpen, 
  onClose, 
  loan, 
  onUpdateCollateral, 
  onAddCollateral, 
  onDeleteCollateral 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Add new collateral form state (Batch 1-10 photos)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemVal, setNewItemVal] = useState('');
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  
  // Edit existing collateral state
  const [editingCollateral, setEditingCollateral] = useState(null);
  const [status, setStatus] = useState('pledged');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);

  const collaterals = loan?.collaterals || [];
  const maxReached = collaterals.length >= 10;
  const isCarousel = collaterals.length > 3;

  useEffect(() => {
    setCurrentIndex(0);
    setZoomImage(null);
    setZoomLevel(1);
    setShowAddForm(false);
    setEditingCollateral(null);
    setNewPhotoFiles([]);
    setPhotoPreviews([]);
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  // Carousel navigation
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? collaterals.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === collaterals.length - 1 ? 0 : prev + 1));
  };

  // Image Download Helper
  const handleDownload = (e, url, fileName) => {
    e.stopPropagation();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'collateral_image.jpg';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add Collateral Submit (Batch Photos 1-10)
  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('item_name', newItemName || 'Pledged Collateral Security');
    formData.append('description', newItemDesc || '');
    formData.append('estimated_value', newItemVal || '');

    newPhotoFiles.forEach(file => {
      formData.append('photos', file);
    });

    if (onAddCollateral) {
      await onAddCollateral(loan.id, formData);
    }
    setNewItemName('');
    setNewItemDesc('');
    setNewItemVal('');
    setNewPhotoFiles([]);
    setPhotoPreviews([]);
    setShowAddForm(false);
  };

  // Edit Collateral Submit
  const startEdit = (col) => {
    setEditingCollateral(col);
    setStatus(col.status || 'pledged');
    setSalePrice(col.sale_price || '');
    setNotes(col.notes || '');
    setPhotoFile(null);
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!editingCollateral) return;

    const formData = new FormData();
    formData.append('status', status);
    formData.append('sale_price', salePrice);
    formData.append('notes', notes);
    if (photoFile) formData.append('photo', photoFile);

    onUpdateCollateral(editingCollateral.id, formData);
    setEditingCollateral(null);
  };

  const activeCol = collaterals[currentIndex] || collaterals[0];

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ padding: '1.75rem', maxWidth: '750px', width: '95%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} color="#a855f7" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Security Collateral Vault
              </h2>
              <span className={`badge ${maxReached ? 'badge-overdue' : 'badge-active'}`} style={{ fontSize: '0.7rem' }}>
                {collaterals.length} / 10 Photos
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Borrower: <strong style={{ color: 'var(--text-primary)' }}>{loan.loan_taker}</strong> | Loan: <strong style={{ color: '#10b981' }}>₹{parseFloat(loan.loan_amount).toLocaleString('en-IN')}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!maxReached && (
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                <Plus size={14} />
                <span>{showAddForm ? 'Close Form' : 'Add Photos (1-10)'}</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Warning Forfeiture Rule */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.85rem',
          marginBottom: '1.25rem',
          fontSize: '0.78rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertOctagon size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Collateral Rule:</strong> Upload up to 10 photos at once. Details are optional if uploading photos of the same item.
          </div>
        </div>

        {/* Add New Collateral Form (Select 1-10 Photos at once) */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-cyan)', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} />
              <span>Add Collateral Photos (Select 1 to 10 at once)</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pledged Item Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Gold Necklace / Jewelry Set" 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Estimated Value (₹) (Optional)</label>
                <input 
                  type="number" 
                  className="form-input mono" 
                  placeholder="e.g. 45000"
                  value={newItemVal}
                  onChange={(e) => setNewItemVal(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Description & Physical Condition (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 22K Gold 15g with bill"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Select Collateral Security Photos *</span>
                  <span style={{ color: '#a855f7' }}>Select 1 to {10 - collaterals.length} photos</span>
                </label>
                <input 
                  type="file" 
                  multiple
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files).slice(0, 10 - collaterals.length);
                    setNewPhotoFiles(files);
                    setPhotoPreviews(files.map(f => URL.createObjectURL(f)));
                  }}
                />
                {photoPreviews.length > 0 && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '0.4rem' }}>
                      <strong>{photoPreviews.length} photo(s) selected:</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {photoPreviews.map((src, i) => (
                        <img key={i} src={src} alt={`Preview ${i + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent-cyan)' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                Upload Selected Photos
              </button>
            </div>
          </form>
        )}

        {/* Collateral Content: Empty State vs Grid vs Carousel */}
        {collaterals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
            <Camera size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <div>No security collateral photos uploaded yet.</div>
            <button 
              onClick={() => setShowAddForm(true)} 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} />
              <span>Add Collateral Photos</span>
            </button>
          </div>
        ) : isCarousel ? (
          /* CAROUSEL VIEW (> 3 IMAGES) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Carousel View (&gt;3 Collateral Items)</span>
              <span><strong>Item {currentIndex + 1}</strong> of {collaterals.length}</span>
            </div>

            {/* Active Slide Showcase */}
            <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', padding: '1.25rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Prev / Next Nav Overlay Arrows */}
              <button 
                onClick={handlePrev} 
                className="btn btn-secondary"
                style={{ position: 'absolute', left: '10px', top: '40%', zIndex: 10, padding: '0.5rem', borderRadius: '50%', background: 'rgba(6, 10, 23, 0.75)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                title="Previous Image"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNext} 
                className="btn btn-secondary"
                style={{ position: 'absolute', right: '10px', top: '40%', zIndex: 10, padding: '0.5rem', borderRadius: '50%', background: 'rgba(6, 10, 23, 0.75)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                title="Next Image"
              >
                <ChevronRight size={20} />
              </button>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* Large Slide Image */}
                <div 
                  onClick={() => activeCol.photo_path && setZoomImage(activeCol.photo_path)}
                  style={{ 
                    width: '260px', 
                    height: '200px', 
                    flexShrink: 0, 
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    background: '#0b1126', 
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    cursor: activeCol.photo_path ? 'pointer' : 'default',
                    margin: '0 auto'
                  }}
                  title={activeCol.photo_path ? "Click to Zoom / Inspect Image" : "No photo attached"}
                >
                  {activeCol.photo_path ? (
                    <>
                      <img 
                        src={activeCol.photo_path} 
                        alt={activeCol.item_name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} 
                        onError={(e) => {
                          if (e.target.src.includes('/uploads/collateral/')) {
                            e.target.src = e.target.src.replace('/uploads/collateral/', '/uploads/documents/');
                          }
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Maximize2 size={12} />
                        <span>Zoom</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Camera size={32} style={{ marginBottom: '0.4rem' }} />
                      <div>No Photo Uploaded</div>
                    </div>
                  )}
                </div>

                {/* Slide Details */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {activeCol.item_name}
                    </h3>
                    <span className={`badge badge-${activeCol.status}`}>
                      {activeCol.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                    {activeCol.description || 'No description provided for this item.'}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    <div>Valuation: <strong className="mono" style={{ color: 'var(--text-primary)' }}>₹{activeCol.estimated_value?.toLocaleString('en-IN') || '-'}</strong></div>
                    {activeCol.sale_price > 0 && (
                      <div>Sale: <strong className="mono" style={{ color: '#10b981' }}>₹{activeCol.sale_price?.toLocaleString('en-IN')}</strong></div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {activeCol.photo_path && (
                      <>
                        <button 
                          onClick={() => setZoomImage(activeCol.photo_path)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <ZoomIn size={14} color="currentColor" />
                          <span>Zoom Image</span>
                        </button>
                        
                        <button 
                          onClick={(e) => handleDownload(e, activeCol.photo_path, `${activeCol.item_name}.jpg`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <Download size={14} color="currentColor" />
                          <span>Download</span>
                        </button>
                      </>
                    )}

                    <button 
                      onClick={() => startEdit(activeCol)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <span>Update Status</span>
                    </button>

                    {onDeleteCollateral && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete collateral item "${activeCol.item_name}"?`)) {
                            onDeleteCollateral(activeCol.id);
                            if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
                          }
                        }}
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                        title="Delete Collateral Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                </div>

              </div>

              {/* Carousel Thumbnail Strip Navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', justifyContent: 'center' }}>
                {collaterals.map((col, idx) => (
                  <div 
                    key={col.id || idx}
                    onClick={() => setCurrentIndex(idx)}
                    style={{ 
                      width: '54px', 
                      height: '54px', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      cursor: 'pointer',
                      border: idx === currentIndex ? '2px solid var(--accent-neon)' : '1px solid var(--border-color)',
                      opacity: idx === currentIndex ? 1 : 0.5,
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      background: '#060a17'
                    }}
                  >
                    {col.photo_path ? (
                      <img 
                        src={col.photo_path} 
                        alt={col.item_name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          if (e.target.src.includes('/uploads/collateral/')) {
                            e.target.src = e.target.src.replace('/uploads/collateral/', '/uploads/documents/');
                          }
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        #{idx + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        ) : (
          /* STANDARD GRID VIEW (<= 3 IMAGES) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            {collaterals.map((col, idx) => (
              <div 
                key={col.id || idx} 
                className="glass-card"
                style={{ padding: '1.1rem', background: 'var(--bg-primary)', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}
              >
                {/* Photo Preview */}
                <div 
                  onClick={() => col.photo_path && setZoomImage(col.photo_path)}
                  style={{ 
                    width: '110px', 
                    height: '110px', 
                    flexShrink: 0, 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: '1px solid var(--border-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: col.photo_path ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  title={col.photo_path ? "Click to Zoom / Inspect Image" : "No photo attached"}
                >
                  {col.photo_path ? (
                    <>
                      <img 
                        src={col.photo_path} 
                        alt={col.item_name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          if (e.target.src.includes('/uploads/collateral/')) {
                            e.target.src = e.target.src.replace('/uploads/collateral/', '/uploads/documents/');
                          }
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem' }}>
                        <Maximize2 size={10} />
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Camera size={24} style={{ marginBottom: '0.2rem' }} />
                      <div>No Photo</div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {col.item_name}
                    </h3>
                    <span className={`badge badge-${col.status}`}>
                      {col.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {col.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    <div>Valuation: <strong className="mono" style={{ color: 'var(--text-primary)' }}>₹{col.estimated_value?.toLocaleString('en-IN') || '-'}</strong></div>
                    {col.sale_price > 0 && (
                      <div>Recovered Sale: <strong className="mono" style={{ color: '#10b981' }}>₹{col.sale_price?.toLocaleString('en-IN')}</strong></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {col.photo_path && (
                      <>
                        <button 
                          onClick={() => setZoomImage(col.photo_path)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <ZoomIn size={13} color="currentColor" />
                          <span>Zoom</span>
                        </button>
                        
                        <button 
                          onClick={(e) => handleDownload(e, col.photo_path, `${col.item_name}.jpg`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Download size={13} color="currentColor" />
                          <span>Download</span>
                        </button>
                      </>
                    )}

                    <button 
                      onClick={() => startEdit(col)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Update Status
                    </button>

                    {onDeleteCollateral && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete collateral item "${col.item_name}"?`)) {
                            onDeleteCollateral(col.id);
                          }
                        }}
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

        {/* Collateral Edit Modal Form */}
        {editingCollateral && (
          <form onSubmit={handleSaveUpdate} style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-purple)', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e879f9', marginBottom: '1rem' }}>
              Update Security Status for "{editingCollateral.item_name}"
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="form-label">Security Status</label>
                <select 
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pledged">Pledged (Active Security)</option>
                  <option value="forfeited">Forfeited (Defaulted Loan)</option>
                  <option value="sold">Sold for Recovery</option>
                  <option value="returned">Returned to Borrower</option>
                </select>
              </div>

              {status === 'sold' && (
                <div className="form-group">
                  <label className="form-label">Sale Price Recovered (₹)</label>
                  <input 
                    type="number"
                    className="form-input mono"
                    placeholder="e.g. 48000"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Notes & Recovery Log</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sold item to gold buyer to settle overdue debt"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Update Item Photo</label>
                <input 
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setEditingCollateral(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Status
              </button>
            </div>

          </form>
        )}

      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX & ZOOM MODAL */}
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
          {/* Lightbox Controls Bar */}
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
              onClick={(e) => handleDownload(e, zoomImage, 'collateral_highres.jpg')}
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

          {/* Previous / Next Image Floating Navigation Arrows */}
          {collaterals.length > 1 && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIdx = currentIndex === 0 ? collaterals.length - 1 : currentIndex - 1;
                  setCurrentIndex(prevIdx);
                  setZoomImage(collaterals[prevIdx]?.photo_path);
                  setZoomLevel(1);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIdx = currentIndex === collaterals.length - 1 ? 0 : currentIndex + 1;
                  setCurrentIndex(nextIdx);
                  setZoomImage(collaterals[nextIdx]?.photo_path);
                  setZoomLevel(1);
                }}
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
              alt="Collateral High Res" 
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
