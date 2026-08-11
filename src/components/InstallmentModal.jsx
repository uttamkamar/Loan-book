import React, { useState, useEffect } from 'react';
import { 
  X, DollarSign, Calendar, PlusCircle, History, Sparkles, 
  TrendingDown, Edit3, Trash2, Clock, Calculator, AlertTriangle, 
  CheckCircle2, ToggleLeft, ToggleRight 
} from 'lucide-react';

export default function InstallmentModal({ 
  isOpen, 
  onClose, 
  loan, 
  onSubmitInstallment, 
  onUpdateInstallment, 
  onDeleteInstallment,
  onUpdateLoanStatus
}) {
  const [editingInstId, setEditingInstId] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [principalOverride, setPrincipalOverride] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Gpay');
  const [remark, setRemark] = useState('');

  // Tenure Extension State
  const [showExtensionSection, setShowExtensionSection] = useState(false);
  const [extensionPreset, setExtensionPreset] = useState(null);
  const [extensionExtraInterest, setExtensionExtraInterest] = useState('');
  const [extensionTenureText, setExtensionTenureText] = useState('');

  // Manual Status Toggle & Warning Popup State
  const [showStatusWarningModal, setShowStatusWarningModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);

  useEffect(() => {
    setEditingInstId(null);
    setAmountPaid('');
    setPrincipalOverride('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Gpay');
    setRemark('');
    setShowExtensionSection(false);
    setExtensionPreset(null);
    setExtensionExtraInterest('');
    setExtensionTenureText('');
    setShowStatusWarningModal(false);
    setTargetStatus(null);
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const installments = loan.installments || [];
  const activePrincipal = parseFloat(loan.current_principal !== undefined && loan.current_principal !== null ? loan.current_principal : loan.loan_amount) || 0;
  const currentInterestDue = parseFloat(loan.interest_amount) || 0;
  const totalPayableDue = parseFloat(loan.balance_due) || 0;

  // Live recalculation simulation
  const numPaid = parseFloat(amountPaid) || 0;
  let simulatedPrincipalPaid = 0;
  let simulatedInterestPaid = 0;

  if (principalOverride !== '') {
    simulatedPrincipalPaid = parseFloat(principalOverride) || 0;
    simulatedInterestPaid = Math.max(0, numPaid - simulatedPrincipalPaid);
  } else {
    simulatedInterestPaid = Math.min(numPaid, currentInterestDue);
    simulatedPrincipalPaid = Math.max(0, numPaid - simulatedInterestPaid);
  }

  const nextSimulatedPrincipal = Math.max(0, Math.round((activePrincipal - simulatedPrincipalPaid) * 100) / 100);

  // Preset Calculator for remaining balance
  const applyPreset = (ratePercent, tenureStr, presetKey) => {
    const extra = Math.round((nextSimulatedPrincipal * (ratePercent / 100)) * 100) / 100;
    setExtensionPreset(presetKey);
    setExtensionExtraInterest(extra);
    setExtensionTenureText(tenureStr);
  };

  const handleStartEdit = (inst) => {
    setEditingInstId(inst.id);
    setAmountPaid(inst.amount_paid);
    setPrincipalOverride(inst.principal_paid > 0 ? inst.principal_paid : '');
    setPaymentDate(inst.payment_date || new Date().toISOString().split('T')[0]);
    setPaymentMode(inst.payment_mode || 'Gpay');
    setRemark(inst.remark || '');
  };

  const handleCancelEdit = () => {
    setEditingInstId(null);
    setAmountPaid('');
    setPrincipalOverride('');
    setRemark('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amountPaid || parseFloat(amountPaid) <= 0) return;

    const payload = {
      amount_paid: parseFloat(amountPaid),
      principal_paid_override: principalOverride !== '' ? parseFloat(principalOverride) : null,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      remark: remark || `Installment`,
      extension_interest_add: extensionExtraInterest !== '' ? parseFloat(extensionExtraInterest) : null,
      extension_tenure: extensionTenureText || null
    };

    if (editingInstId) {
      onUpdateInstallment(editingInstId, payload);
    } else {
      onSubmitInstallment(loan.id, payload);
    }

    setEditingInstId(null);
    setAmountPaid('');
    setPrincipalOverride('');
    setRemark('');
  };

  // Status toggle handler
  const handleToggleStatusClick = (newStatus) => {
    setTargetStatus(newStatus);
    setShowStatusWarningModal(true);
  };

  const confirmStatusChange = () => {
    if (onUpdateLoanStatus && targetStatus) {
      onUpdateLoanStatus(loan.id, targetStatus);
    }
    setShowStatusWarningModal(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ padding: '1.75rem', maxWidth: '680px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingInstId ? 'Edit Installment Payment' : 'Record Payment & Status'}
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Borrower: <strong style={{ color: 'var(--text-primary)' }}>{loan.loan_taker}</strong> | Rate: <strong style={{ color: '#6366f1' }}>{loan.interest_rate}% {loan.interest_tenure}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* MANUAL RECEIVED / ACTIVE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => handleToggleStatusClick(loan.status === 'received' ? 'active' : 'received')}
              className={`btn ${loan.status === 'received' ? 'btn-success' : 'btn-warning'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
              title="Click to manually toggle status between Received and Active"
            >
              {loan.status === 'received' ? (
                <>
                  <ToggleRight size={16} />
                  <span>Mark Active</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={16} />
                  <span>Mark Received</span>
                </>
              )}
            </button>

            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Current Active Loan Summary Cards */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '0.75rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loan Amount</div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ₹{parseFloat(loan.loan_amount).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Interest Amount</div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1' }}>
              +₹{currentInterestDue.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remaining Due</div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>
              ₹{totalPayableDue.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ledger Status</div>
            <div style={{ marginTop: '0.15rem' }}>
              <span className={`badge badge-${loan.status}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                {loan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History List */}
        {installments.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={14} />
              <span>Payment History & Management ({installments.length})</span>
            </h4>
            <div style={{ maxHeight: '130px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              {installments.map((inst, index) => (
                <div 
                  key={inst.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderBottom: index !== installments.length - 1 ? '1px solid var(--border-color)' : 'none',
                    fontSize: '0.8rem',
                    backgroundColor: editingInstId === inst.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{inst.installment_no}</span> - {inst.payment_date} ({inst.payment_mode})
                    {inst.remark && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{inst.remark}]</span>}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="mono" style={{ fontWeight: 800, color: '#10b981' }}>
                      ₹{parseFloat(inst.amount_paid).toLocaleString('en-IN')}
                    </span>
                    
                    <button 
                      type="button"
                      onClick={() => handleStartEdit(inst)}
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    >
                      <Edit3 size={12} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this payment entry? The loan ledger will be automatically updated.')) {
                          onDeleteInstallment(inst.id);
                        }
                      }}
                      className="btn btn-danger"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Installment & Extension Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input 
                type="number"
                step="any"
                className="form-input mono"
                placeholder="e.g. 6000 or 2000"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select 
                className="form-select"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="Gpay">Gpay / UPI</option>
                <option value="Cash">Cash</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input 
                type="date"
                className="form-input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Remark / Notes</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Paid 6k on 31st Aug"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>

          </div>

          {/* TENURE EXTENSION & INTEREST CALCULATOR ACCORDION */}
          <div style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.875rem', background: 'var(--bg-primary)' }}>
            <div 
              onClick={() => setShowExtensionSection(!showExtensionSection)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#a855f7' }}>
                <Clock size={16} />
                <span>Need Extension? Calculate Next Period Interest on Remaining Principal</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 700 }}>
                {showExtensionSection ? '▲ Hide' : '▼ Add Extension Rate'}
              </span>
            </div>

            {showExtensionSection && (
              <div style={{ marginTop: '0.875rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.875rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>
                  Select borrower's requested extension time for the remaining principal balance:
                </p>

                {/* Preset Buttons Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <button 
                    type="button"
                    onClick={() => applyPreset(16, '/Month (Ext)', 'month')}
                    className={`btn ${extensionPreset === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.4rem', flexDirection: 'column', gap: '0.1rem' }}
                  >
                    <strong>+1 Month (16%)</strong>
                    <span>Ext. Interest</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => applyPreset(10, '/week (Ext)', 'week')}
                    className={`btn ${extensionPreset === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.4rem', flexDirection: 'column', gap: '0.1rem' }}
                  >
                    <strong>+1 Week (10%)</strong>
                    <span>Ext. Interest</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => applyPreset(8, 'for 3 days (Ext)', 'days')}
                    className={`btn ${extensionPreset === 'days' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.4rem', flexDirection: 'column', gap: '0.1rem' }}
                  >
                    <strong>+2-3 Days (8%)</strong>
                    <span>Ext. Interest</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => applyPreset(1, '/day penalty (1%)', 'penalty')}
                    className={`btn ${extensionPreset === 'penalty' ? 'btn-warning' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.4rem', flexDirection: 'column', gap: '0.1rem' }}
                  >
                    <strong>Exceeded Penalty</strong>
                    <span>1% Daily</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Add Extra Extension Interest (₹)</label>
                    <input 
                      type="number"
                      step="any"
                      className="form-input mono"
                      placeholder="e.g. 640 or 400"
                      value={extensionExtraInterest}
                      onChange={(e) => setExtensionExtraInterest(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>New Tenure Label</label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="e.g. /Month (Ext)"
                      value={extensionTenureText}
                      onChange={(e) => setExtensionTenureText(e.target.value)}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            {editingInstId ? (
              <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel Edit
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-success">
              <PlusCircle size={16} />
              <span>{editingInstId ? 'Save Installment Changes' : 'Record Payment & Submit'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* STATUS CHANGE CONFIRMATION WARNING MODAL POPUP */}
      {showStatusWarningModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div 
            className="modal-container" 
            style={{ 
              maxWidth: '500px', 
              padding: '1.5rem', 
              border: '1px solid var(--accent-warning)', 
              background: 'var(--bg-secondary)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f59e0b' }}>
              <AlertTriangle size={32} style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Confirm Loan Status Change
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Loan ID #{loan.id} - {loan.loan_taker}
                </span>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.35)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.85rem', 
              color: 'var(--text-primary)', 
              marginBottom: '1.25rem',
              lineHeight: '1.5'
            }}>
              <strong>⚠️ STATUS WARNING:</strong>
              <br /><br />
              {targetStatus === 'received' ? (
                <span>
                  Are you sure you want to manually mark this loan as <strong>RECEIVED (Fully Settled)</strong>?
                  <br /><br />
                  <em>"Mark active if clear all the payment or not clear the payment you took the pledge. Please verify whether all principal + interest payments are cleared or if pledged collateral items were returned."</em>
                </span>
              ) : (
                <span>
                  Are you sure you want to mark this loan as <strong>ACTIVE</strong>?
                  <br /><br />
                  <em>"Mark active if all payments are NOT clear or if you still hold the security collateral pledged by the borrower."</em>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => setShowStatusWarningModal(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmStatusChange} 
                className={`btn ${targetStatus === 'received' ? 'btn-success' : 'btn-warning'}`}
              >
                Confirm & Mark {targetStatus.toUpperCase()}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
