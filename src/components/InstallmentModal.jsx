import React, { useState, useEffect } from 'react';
import { formatTime12Hour } from '../utils/dateUtils';
import { 
  X, DollarSign, Calendar, PlusCircle, History, Sparkles, 
  TrendingDown, Edit3, Trash2, Clock, Calculator, AlertTriangle, 
  CheckCircle2, ToggleLeft, ToggleRight 
} from 'lucide-react';

function getCurrentTimeFormatted() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatTimeForInput(timeStr) {
  if (!timeStr) return getCurrentTimeFormatted();
  const trimmed = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1}:\d{2}$/.test(trimmed)) return `0${trimmed}`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.substring(0, 5);
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
}

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
  const [paymentTime, setPaymentTime] = useState(getCurrentTimeFormatted());
  const [paymentMode, setPaymentMode] = useState('Gpay');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');

  // Discount State (Optional % or Rupee Discount)
  const [discountType, setDiscountType] = useState('rupee'); // 'rupee' (₹) or 'percent' (%)
  const [discountValue, setDiscountValue] = useState('');

  // Penalty State (Optional % or Rupee Penalty)
  const [penaltyType, setPenaltyType] = useState('rupee'); // 'rupee' (₹) or 'percent' (%)
  const [penaltyValue, setPenaltyValue] = useState('');

  // Tenure Extension State
  const [showExtensionSection, setShowExtensionSection] = useState(false);
  const [extensionPreset, setExtensionPreset] = useState(null);
  const [extensionExtraInterest, setExtensionExtraInterest] = useState('');
  const [extensionTenureText, setExtensionTenureText] = useState('');

  // Manual Status Toggle & Warning Popup State
  const [showStatusWarningModal, setShowStatusWarningModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEditingInstId(null);
    setAmountPaid('');
    setPrincipalOverride('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentTime(getCurrentTimeFormatted());
    setPaymentMode('Gpay');
    setCashAmount('');
    setUpiAmount('');
    setRemark('');
    setProofFile(null);
    setProofPreview('');
    setDiscountType('rupee');
    setDiscountValue('');
    setPenaltyType('rupee');
    setPenaltyValue('');
    setShowExtensionSection(false);
    setExtensionPreset(null);
    setExtensionExtraInterest('');
    setExtensionTenureText('');
    setShowStatusWarningModal(false);
    setTargetStatus(null);
    setIsSubmitting(false);
  }, [isOpen, loan]);

  const installments = loan ? (loan.installments || []) : [];
  const activePrincipal = loan ? (parseFloat(loan.current_principal !== undefined && loan.current_principal !== null ? loan.current_principal : loan.loan_amount) || 0) : 0;
  const currentInterestDue = loan ? (parseFloat(loan.interest_amount) || 0) : 0;
  const totalPayableDue = loan ? (parseFloat(loan.balance_due) || 0) : 0;
  const totalLoanPayable = loan ? (parseFloat(loan.total_amount) || (parseFloat(loan.loan_amount) + parseFloat(loan.interest_amount)) || 0) : 0;

  // Discount calculation
  const rawDiscount = parseFloat(discountValue) || 0;
  const computedDiscountAmount = discountType === 'percent'
    ? Math.round((totalLoanPayable * (rawDiscount / 100)) * 100) / 100
    : rawDiscount;

  // Penalty calculation
  const rawPenalty = parseFloat(penaltyValue) || 0;
  const baseForPenaltyPercent = activePrincipal > 0 ? activePrincipal : totalPayableDue;
  const computedPenaltyAmount = penaltyType === 'percent'
    ? Math.round((baseForPenaltyPercent * (rawPenalty / 100)) * 100) / 100
    : rawPenalty;

  // Live recalculation simulation
  const numPaid = parseFloat(amountPaid) || 0;
  let simulatedInterestPaid = 0;
  let simulatedPenaltyPaid = 0;
  let simulatedPrincipalPaid = 0;

  if (principalOverride !== '') {
    simulatedPrincipalPaid = parseFloat(principalOverride) || 0;
    simulatedInterestPaid = Math.max(0, numPaid - simulatedPrincipalPaid);
  } else {
    simulatedInterestPaid = Math.min(numPaid, currentInterestDue);
    const remainingPaidAfterInterest = Math.max(0, numPaid - simulatedInterestPaid);
    simulatedPenaltyPaid = Math.min(remainingPaidAfterInterest, computedPenaltyAmount);
    simulatedPrincipalPaid = Math.max(0, remainingPaidAfterInterest - simulatedPenaltyPaid);
  }

  const nextSimulatedPrincipal = Math.max(0, Math.round((activePrincipal - simulatedPrincipalPaid) * 100) / 100);

  // Preset Calculator for remaining balance
  const applyPreset = (ratePercent, tenureStr, presetKey) => {
    const extra = Math.round((nextSimulatedPrincipal * (ratePercent / 100)) * 100) / 100;
    setExtensionPreset(presetKey);
    setExtensionExtraInterest(extra);
    setExtensionTenureText(tenureStr);
  };

  // Keep extension extra interest updated if preset is active and principal changes
  useEffect(() => {
    if (!extensionPreset) return;
    let ratePercent = 0;
    if (extensionPreset === 'same_rate') ratePercent = loan ? parseFloat(loan.interest_rate) || 8 : 8;
    else if (extensionPreset === 'month') ratePercent = 16;
    else if (extensionPreset === 'week') ratePercent = 10;
    else if (extensionPreset === 'days') ratePercent = 8;
    else if (extensionPreset === 'penalty') ratePercent = 1;

    if (ratePercent > 0) {
      const extra = Math.round((nextSimulatedPrincipal * (ratePercent / 100)) * 100) / 100;
      setExtensionExtraInterest(extra);
    }
  }, [nextSimulatedPrincipal, extensionPreset, loan]);

  if (!isOpen || !loan) return null;

  const handleStartEdit = (inst) => {
    setEditingInstId(inst.id);
    setAmountPaid(inst.amount_paid);
    setPrincipalOverride(inst.principal_paid > 0 ? inst.principal_paid : '');
    setPaymentDate(inst.payment_date || new Date().toISOString().split('T')[0]);
    setPaymentTime(formatTimeForInput(inst.payment_time));

    let pm = inst.payment_mode || 'Gpay';
    let cAmt = '';
    let uAmt = '';
    if (pm.includes('Cash + UPI')) {
      const cashMatch = pm.match(/Cash:\s*₹?([\d,]+(?:\.\d+)?)/i);
      const upiMatch = pm.match(/UPI:\s*₹?([\d,]+(?:\.\d+)?)/i);
      if (cashMatch) cAmt = cashMatch[1].replace(/,/g, '');
      if (upiMatch) uAmt = upiMatch[1].replace(/,/g, '');
      pm = 'Cash + UPI';
    }
    setPaymentMode(pm);
    setCashAmount(cAmt);
    setUpiAmount(uAmt);

    setRemark(inst.remark || '');
    setProofPreview(inst.proof_path || '');
    setProofFile(null);
    if (inst.discount_amount && parseFloat(inst.discount_amount) > 0) {
      setDiscountType('rupee');
      setDiscountValue(inst.discount_amount);
    } else {
      setDiscountValue('');
    }
    if (inst.penalty_amount && parseFloat(inst.penalty_amount) > 0) {
      setPenaltyType('rupee');
      setPenaltyValue(inst.penalty_amount);
    } else {
      setPenaltyValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingInstId(null);
    setAmountPaid('');
    setPrincipalOverride('');
    setCashAmount('');
    setUpiAmount('');
    setRemark('');
    setPaymentTime(getCurrentTimeFormatted());
    setProofFile(null);
    setProofPreview('');
    setDiscountType('rupee');
    setDiscountValue('');
    setPenaltyType('rupee');
    setPenaltyValue('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      alert('Please enter a valid Payment Amount (₹) greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDiscount = computedDiscountAmount > 0 ? computedDiscountAmount : 0;
      const finalPenalty = computedPenaltyAmount > 0 ? computedPenaltyAmount : 0;

      let finalMode = paymentMode;
      if (paymentMode === 'Cash + UPI') {
        const c = parseFloat(cashAmount) || 0;
        const u = parseFloat(upiAmount) || 0;
        finalMode = `Cash + UPI (Cash: ₹${c.toLocaleString('en-IN')}, UPI: ₹${u.toLocaleString('en-IN')})`;
      }

      let payload;
      if (proofFile) {
        payload = new FormData();
        payload.append('amount_paid', parseFloat(amountPaid));
        if (principalOverride !== '') payload.append('principal_paid_override', parseFloat(principalOverride));
        if (finalDiscount > 0) payload.append('discount_amount', finalDiscount);
        if (finalPenalty > 0) payload.append('penalty_amount', finalPenalty);
        payload.append('payment_date', paymentDate);
        payload.append('payment_time', paymentTime || '');
        payload.append('payment_mode', finalMode);
        payload.append('remark', remark || `Installment`);
        if (extensionExtraInterest !== '') payload.append('extension_interest_add', parseFloat(extensionExtraInterest));
        if (extensionTenureText) payload.append('extension_tenure', extensionTenureText);
        payload.append('payment_proof', proofFile);
      } else {
        payload = {
          amount_paid: parseFloat(amountPaid),
          principal_paid_override: principalOverride !== '' ? parseFloat(principalOverride) : null,
          discount_amount: finalDiscount,
          penalty_amount: finalPenalty,
          payment_date: paymentDate,
          payment_time: paymentTime || '',
          payment_mode: finalMode,
          remark: remark || `Installment`,
          extension_interest_add: extensionExtraInterest !== '' ? parseFloat(extensionExtraInterest) : null,
          extension_tenure: extensionTenureText || null
        };
      }

      if (editingInstId) {
        await onUpdateInstallment(editingInstId, payload);
      } else {
        await onSubmitInstallment(loan.id, payload);
      }

      setEditingInstId(null);
      setAmountPaid('');
      setPrincipalOverride('');
      setCashAmount('');
      setUpiAmount('');
      setRemark('');
      setProofFile(null);
      setProofPreview('');
      setDiscountType('rupee');
      setDiscountValue('');
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
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
          gridTemplateColumns: loan.discount_amount > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
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
          {parseFloat(loan.discount_amount || 0) > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Discount Given</div>
              <div className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7' }}>
                -₹{parseFloat(loan.discount_amount).toLocaleString('en-IN')}
              </div>
            </div>
          )}
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
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{inst.installment_no}</span> - {inst.payment_date} {inst.payment_time ? `at ${formatTime12Hour(inst.payment_time)}` : ''} ({inst.payment_mode})
                    {inst.remark && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{inst.remark}]</span>}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {parseFloat(inst.discount_amount || 0) > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        🏷️ Discount: ₹{parseFloat(inst.discount_amount).toLocaleString('en-IN')}
                      </span>
                    )}
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
            
            {/* ROW 1: PAYMENT AMOUNT & PAYMENT MODE */}
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
                <option value="Cash + UPI">Cash + UPI (Split Payment)</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* ROW 2: PENALTY CHARGED & DISCOUNT GIVEN (SIDE-BY-SIDE) */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span>Penalty Charged (Optional)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input 
                  type="number"
                  step="any"
                  min="0"
                  className="form-input mono"
                  style={{ flex: 1 }}
                  placeholder={penaltyType === 'percent' ? "e.g. 5 for 5%" : "e.g. 400 for ₹400"}
                  value={penaltyValue}
                  onChange={(e) => setPenaltyValue(e.target.value)}
                />
                <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)', height: '42px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setPenaltyType('rupee')}
                    title="Penalty in Rupee amount (₹)"
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      height: '100%',
                      background: penaltyType === 'rupee' ? '#ef4444' : 'transparent',
                      color: penaltyType === 'rupee' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenaltyType('percent')}
                    title="Penalty in Percentage (%)"
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      height: '100%',
                      background: penaltyType === 'percent' ? '#ef4444' : 'transparent',
                      color: penaltyType === 'percent' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    %
                  </button>
                </div>
              </div>
              {computedPenaltyAmount > 0 ? (
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, marginTop: '0.25rem' }}>
                  ⚠️ Charging ₹{computedPenaltyAmount.toLocaleString('en-IN')} penalty (Fee only, not principal)
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Optional penalty fee for late payment
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={14} color="#818cf8" />
                <span>Discount Given (Optional)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input 
                  type="number"
                  step="any"
                  min="0"
                  className="form-input mono"
                  style={{ flex: 1 }}
                  placeholder={discountType === 'percent' ? "e.g. 5 for 5%" : "e.g. 500 for ₹500"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
                <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)', height: '42px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('rupee')}
                    title="Discount in Rupee amount (₹)"
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      height: '100%',
                      background: discountType === 'rupee' ? '#6366f1' : 'transparent',
                      color: discountType === 'rupee' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ₹
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    title="Discount in Percentage (%)"
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      height: '100%',
                      background: discountType === 'percent' ? '#6366f1' : 'transparent',
                      color: discountType === 'percent' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    %
                  </button>
                </div>
              </div>
              {computedDiscountAmount > 0 ? (
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: '0.25rem' }}>
                  ✓ Granting ₹{computedDiscountAmount.toLocaleString('en-IN')} discount
                  {discountType === 'percent' ? ` (${rawDiscount}% of total)` : totalLoanPayable > 0 ? ` (~${((computedDiscountAmount / totalLoanPayable) * 100).toFixed(1)}%)` : ''}
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Optional discount requested by borrower
                </div>
              )}
            </div>

            {/* ROW 3: PAYMENT DATE + TIME & REMARK / NOTES */}
            <div className="form-group">
              <label className="form-label">Payment Date & Time</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input 
                  type="date"
                  className="form-input"
                  style={{ flex: '1.2', minWidth: 0 }}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  title="Payment Date"
                />
                <input 
                  type="time"
                  className="form-input"
                  style={{ flex: '1', minWidth: 0 }}
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  title="Payment Time (Editable)"
                />
              </div>
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

            {/* PAYMENT PROOF FIELD (REQUIRED FOR ONLINE, NO PROOF FOR CASH) */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              {(paymentMode || '').toLowerCase() !== 'cash' ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <label className="form-label" style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Upload Payment Proof (Online Transaction)</span>
                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Required for online transfers</span>
                  </label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    className="form-input"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setProofFile(file);
                        if (file.type.startsWith('image/')) {
                          setProofPreview(URL.createObjectURL(file));
                        }
                      }
                    }}
                  />
                  {proofPreview && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={proofPreview} alt="Proof preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--accent-neon)' }} />
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ Payment proof attached
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  💵 <strong>Cash Transaction:</strong> No payment proof required.
                </div>
              )}
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
                    onClick={() => applyPreset(loan ? parseFloat(loan.interest_rate) || 8 : 8, `${loan ? loan.interest_tenure : '7days'} (Ext)`, 'same_rate')}
                    className={`btn ${extensionPreset === 'same_rate' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.4rem', flexDirection: 'column', gap: '0.1rem' }}
                  >
                    <strong>+Ext ({loan ? loan.interest_rate : 8}%)</strong>
                    <span>Same Rate</span>
                  </button>

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

                {nextSimulatedPrincipal > 0 && parseFloat(extensionExtraInterest || 0) > 0 && (
                  <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    💡 <strong>Extension Calculation:</strong> Remaining Principal (₹{nextSimulatedPrincipal.toLocaleString('en-IN')}) + Extension Interest (₹{parseFloat(extensionExtraInterest).toLocaleString('en-IN')}) = <strong>Next Projected Balance Due: ₹{(nextSimulatedPrincipal + parseFloat(extensionExtraInterest)).toLocaleString('en-IN')}</strong>
                  </div>
                )}

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
            <button type="submit" disabled={isSubmitting} className="btn btn-success">
              <PlusCircle size={16} />
              <span>{isSubmitting ? 'Recording...' : (editingInstId ? 'Save Installment Changes' : 'Record Payment & Submit')}</span>
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
