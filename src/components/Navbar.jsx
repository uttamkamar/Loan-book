import React from 'react';
import { Landmark, Plus, FileSpreadsheet, Sun, Moon, Database, Eye, EyeOff } from 'lucide-react';

export default function Navbar({ 
  dbInfo, 
  theme, 
  onToggleTheme, 
  isGlobalPrivacyOn,
  onToggleGlobalPrivacy,
  onOpenAddModal, 
  onOpenExcelModal 
}) {
  return (
    <header className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #00ff66 100%)',
            padding: '0.625rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
          }}>
            <Landmark size={24} color="#04180d" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                LendSmart
              </h1>
              <span className="badge badge-received" style={{ fontSize: '0.65rem' }}>Ledger</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Loan Management & Security Collateral Ledger
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* DB Server Indicator (Pulsing Live Badge) */}
          <div className="live-pill">
            <span className="live-dot"></span>
            <span>DB: <strong style={{ textTransform: 'uppercase' }}>{dbInfo?.dbType || 'SQLITE'}</strong> ACTIVE</span>
          </div>

          {/* GLOBAL PRIVACY MODE TOGGLE */}
          <button 
            onClick={onToggleGlobalPrivacy}
            className={`btn ${isGlobalPrivacyOn ? 'btn-warning' : 'btn-secondary'}`}
            title={isGlobalPrivacyOn ? "Privacy Mode ON (Click to Reveal All)" : "Privacy Mode OFF (Click to Mask All Sensitive Details)"}
            style={{ fontWeight: 700 }}
          >
            {isGlobalPrivacyOn ? <EyeOff size={18} color="currentColor" /> : <Eye size={18} color="currentColor" />}
            <span>{isGlobalPrivacyOn ? 'Privacy: MASKED ****' : 'Privacy Mode'}</span>
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={onToggleTheme}
            className="btn btn-secondary"
            title="Toggle Light/Dark Theme"
            style={{ padding: '0.5rem', borderRadius: '50%' }}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* Excel Import/Export */}
          <button onClick={onOpenExcelModal} className="btn btn-secondary">
            <FileSpreadsheet size={16} color="#10b981" />
            <span>Excel Tools</span>
          </button>

          {/* Create Loan */}
          <button onClick={onOpenAddModal} className="btn btn-primary">
            <Plus size={18} />
            <span>New Loan Entry</span>
          </button>

        </div>

      </div>
    </header>
  );
}
