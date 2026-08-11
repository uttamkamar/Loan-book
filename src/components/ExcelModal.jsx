import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2 } from 'lucide-react';
import { getExportUrl, importExcel } from '../api/client';

export default function ExcelModal({ isOpen, onClose, onImportSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const res = await importExcel(selectedFile);
      setMessage({ type: 'success', text: res.message });
      onImportSuccess();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ padding: '1.75rem', maxWidth: '550px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Excel Import & Export
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Seamlessly sync with your Microsoft Excel ledger files.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Export */}
        <div style={{
          background: 'var(--bg-primary)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Export Loan Ledger
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Download all loan records, interest details, balance due, and security collateral tags as an `.xlsx` Excel sheet.
          </p>
          <a href={getExportUrl()} download className="btn btn-primary" style={{ display: 'inline-flex' }}>
            <Download size={16} />
            <span>Download Excel Ledger (.xlsx)</span>
          </a>
        </div>

        {/* Section 2: Import */}
        <div style={{
          background: 'var(--bg-primary)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
            Import Existing Excel Ledger
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Upload an existing Excel file to automatically convert spreadsheet rows into dashboard entries.
          </p>

          <form onSubmit={handleImport}>
            <div className="form-group">
              <input 
                type="file"
                accept=".xlsx, .xls, .csv"
                className="form-input"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </div>

            {message && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: message.type === 'success' ? '#10b981' : '#ef4444',
                border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
              }}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={!selectedFile || isUploading}
              className="btn btn-success"
              style={{ opacity: !selectedFile ? 0.6 : 1 }}
            >
              <Upload size={16} />
              <span>{isUploading ? 'Importing...' : 'Upload & Import Entries'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
