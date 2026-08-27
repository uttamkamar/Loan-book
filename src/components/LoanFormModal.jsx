import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Upload, Sparkles, DollarSign, Calendar, FileText, Camera, Clock, Zap } from 'lucide-react';

export default function LoanFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    loan_taker: '',
    guarantor_name: '',
    loan_amount: '',
    payment_mode: 'Gpay',
    interest_rate: '15',
    urgent_fee: '',
    interest_tenure: '/Month',
    date_given: new Date().toISOString().split('T')[0],
    return_date: '',
    remark: '',
    collateral_item_name: '',
    collateral_description: '',
    collateral_estimated_value: ''
  });

  const [wantCollateral, setWantCollateral] = useState(true);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');

  const [documentFiles, setDocumentFiles] = useState([]);
  const [collateralPhotos, setCollateralPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState('');

  const [tenureUnit, setTenureUnit] = useState('/Month');
  const [tenureCount, setTenureCount] = useState('1');

  useEffect(() => {
    if (initialData) {
      let pm = initialData.payment_mode || 'Gpay';
      let cAmt = '';
      let uAmt = '';
      if (pm.includes('Cash + UPI')) {
        const cashMatch = pm.match(/Cash:\s*₹?([\d,]+(?:\.\d+)?)/i);
        const upiMatch = pm.match(/UPI:\s*₹?([\d,]+(?:\.\d+)?)/i);
        if (cashMatch) cAmt = cashMatch[1].replace(/,/g, '');
        if (upiMatch) uAmt = upiMatch[1].replace(/,/g, '');
        pm = 'Cash + UPI';
      }
      setCashAmount(cAmt);
      setUpiAmount(uAmt);

      setFormData({
        loan_taker: initialData.loan_taker || '',
        guarantor_name: initialData.guarantor_name || '',
        loan_amount: initialData.loan_amount || '',
        payment_mode: pm,
        interest_rate: initialData.interest_rate || '15',
        urgent_fee: initialData.urgent_fee || '',
        interest_tenure: initialData.interest_tenure || '/Month',
        date_given: initialData.date_given || new Date().toISOString().split('T')[0],
        return_date: initialData.return_date || '',
        remark: initialData.remark || '',
        collateral_item_name: initialData.collaterals?.[0]?.item_name || '',
        collateral_description: initialData.collaterals?.[0]?.description || '',
        collateral_estimated_value: initialData.collaterals?.[0]?.estimated_value || ''
      });

      const initialAmt = parseFloat(initialData.loan_amount) || 0;
      setWantCollateral(
        initialData.requires_collateral === 1 || 
        (initialData.collaterals && initialData.collaterals.length > 0) ||
        (initialData.documents && initialData.documents.length > 0) ||
        !(initialData.remark || '').includes('[HIGH RISK]')
      );

      // Parse tenure unit and count from existing tenure string if available
      const tenureStr = initialData.interest_tenure || '/Month';
      if (tenureStr.includes('/week') || tenureStr.includes('week')) {
        setTenureUnit('/week');
        const match = tenureStr.match(/\d+/);
        setTenureCount(match ? match[0] : '1');
      } else if (tenureStr.includes('/Month') || tenureStr.includes('month')) {
        setTenureUnit('/Month');
        const match = tenureStr.match(/\d+/);
        setTenureCount(match ? match[0] : '1');
      } else if (tenureStr.toLowerCase().includes('day')) {
        setTenureUnit('day');
        const match = tenureStr.match(/\d+/);
        setTenureCount(match ? match[0] : '1');
      } else {
        setTenureUnit('Custom');
        setTenureCount('1');
      }

      setDocumentFiles([]);
      setCollateralPhotos([]);
      setPhotoPreviews([]);
      setPaymentProofFile(null);
      setPaymentProofPreview(initialData.proof_path || '');
    } else {
      setFormData({
        loan_taker: '',
        guarantor_name: '',
        loan_amount: '',
        payment_mode: 'Gpay',
        interest_rate: '15',
        urgent_fee: '',
        interest_tenure: '/Month',
        date_given: new Date().toISOString().split('T')[0],
        return_date: '',
        remark: '',
        collateral_item_name: '',
        collateral_description: '',
        collateral_estimated_value: ''
      });
      setTenureUnit('/Month');
      setTenureCount('1');
      setDocumentFiles([]);
      setCollateralPhotos([]);
      setPhotoPreviews([]);
      setPaymentProofFile(null);
      setPaymentProofPreview('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Helper to calculate auto return date suggestion
  const calculateSuggestedReturnDate = (dateGivenStr, unit, countNum) => {
    if (!dateGivenStr) return '';
    try {
      const d = new Date(dateGivenStr);
      if (isNaN(d.getTime())) return '';
      const count = parseInt(countNum, 10) || 1;

      if (unit === '/week') {
        d.setDate(d.getDate() + (count * 7));
      } else if (unit === '/Month') {
        d.setMonth(d.getMonth() + count);
      } else if (unit === 'day') {
        d.setDate(d.getDate() + count);
      } else {
        return '';
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  const numAmount = parseFloat(formData.loan_amount) || 0;
  const numBaseRate = parseFloat(formData.interest_rate) || 0;
  const numUrgentFee = parseFloat(formData.urgent_fee) || 0;
  const numCount = parseFloat(tenureCount) || 1;
  const ratePerPeriod = Math.round((numBaseRate + numUrgentFee) * 100) / 100;
  
  const numTotalRate = tenureUnit === 'Custom' 
    ? ratePerPeriod 
    : Math.round((ratePerPeriod * numCount) * 100) / 100;

  const isHighValue = numAmount >= 30000;

  // Real-time calculation
  const calculatedInterest = Math.round((numAmount * (numTotalRate / 100)) * 100) / 100;
  const calculatedTotal = Math.round((numAmount + calculatedInterest) * 100) / 100;

  const getDerivedTenureText = (unit, count, baseRate) => {
    const c = parseInt(count, 10) || 1;
    if (unit === '/week') {
      return c === 1 ? '/week' : `for ${c} weeks (${baseRate}%/wk)`;
    } else if (unit === '/Month') {
      return c === 1 ? '/Month' : `for ${c} months (${baseRate}%/mo)`;
    } else if (unit === 'day') {
      return c === 1 ? 'For 1 day' : `for ${c} days`;
    }
    return formData.interest_tenure || '/Month';
  };

  const applyPreset = (baseRate, unit, count = 1) => {
    const tenureText = getDerivedTenureText(unit, count, baseRate);
    setTenureUnit(unit);
    setTenureCount(String(count));
    
    const suggestedReturn = calculateSuggestedReturnDate(formData.date_given, unit, count);

    setFormData(prev => ({
      ...prev,
      interest_rate: baseRate,
      interest_tenure: tenureText,
      return_date: suggestedReturn || prev.return_date
    }));
  };

  const handleUnitChange = (newUnit) => {
    setTenureUnit(newUnit);
    if (newUnit !== 'Custom') {
      const tenureText = getDerivedTenureText(newUnit, tenureCount, formData.interest_rate);
      const suggestedReturn = calculateSuggestedReturnDate(formData.date_given, newUnit, tenureCount);
      setFormData(prev => ({
        ...prev,
        interest_tenure: tenureText,
        return_date: suggestedReturn || prev.return_date
      }));
    }
  };

  const handleCountChange = (newCount) => {
    setTenureCount(newCount);
    if (tenureUnit !== 'Custom') {
      const tenureText = getDerivedTenureText(tenureUnit, newCount, formData.interest_rate);
      const suggestedReturn = calculateSuggestedReturnDate(formData.date_given, tenureUnit, newCount);
      setFormData(prev => ({
        ...prev,
        interest_tenure: tenureText,
        return_date: suggestedReturn || prev.return_date
      }));
    }
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setDocumentFiles(files);
  };

  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    setCollateralPhotos(files);
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const payload = new FormData();

    const formattedTenure = tenureUnit !== 'Custom' 
      ? getDerivedTenureText(tenureUnit, tenureCount, formData.interest_rate) 
      : formData.interest_tenure;

    let finalPaymentMode = formData.payment_mode;
    if (formData.payment_mode === 'Cash + UPI') {
      const c = parseFloat(cashAmount) || 0;
      const u = parseFloat(upiAmount) || 0;
      finalPaymentMode = `Cash + UPI (Cash: ₹${c.toLocaleString('en-IN')}, UPI: ₹${u.toLocaleString('en-IN')})`;
    }

    const isHighValueLoan = numAmount >= 30000;
    const reqCollateral = isHighValueLoan ? (wantCollateral ? 1 : 0) : (formData.collateral_item_name ? 1 : 0);
    const riskTag = (isHighValueLoan && !wantCollateral) ? 'High Risk' : 'Normal';

    let finalRemark = formData.remark || '';
    if (isHighValueLoan && !wantCollateral && !finalRemark.includes('[HIGH RISK]')) {
      finalRemark = `[HIGH RISK] ${finalRemark}`.trim();
    }

    const finalPayload = {
      ...formData,
      payment_mode: finalPaymentMode,
      requires_collateral: reqCollateral,
      risk_level: riskTag,
      remark: finalRemark,
      interest_rate: numTotalRate,
      interest_tenure: formattedTenure
    };

    Object.keys(finalPayload).forEach(key => {
      payload.append(key, finalPayload[key]);
    });

    if (paymentProofFile) {
      payload.append('payment_proof', paymentProofFile);
    }

    if (isHighValueLoan && wantCollateral) {
      documentFiles.forEach(file => {
        payload.append('document_files', file);
      });

      collateralPhotos.forEach(file => {
        payload.append('collateral_photos', file);
      });
    }

    onSubmit(payload);
  };

  const isOnlinePayment = (formData.payment_mode || '').toLowerCase() !== 'cash';

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ padding: '1.75rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {initialData ? 'Edit Loan Record' : 'Create New Loan Entry'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Record borrower details, interest tenure presets & security collateral
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmitForm}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Borrower Name */}
            <div className="form-group">
              <label className="form-label">Borrower Name (Loan Taker) *</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Bubai Da Wife, Rajesh Sharma"
                required
                value={formData.loan_taker}
                onChange={(e) => setFormData({ ...formData, loan_taker: e.target.value })}
              />
            </div>

            {/* Guarantor Name */}
            <div className="form-group">
              <label className="form-label">Guarantor Name (Optional)</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Subhash Uncle, Friend Ref"
                value={formData.guarantor_name}
                onChange={(e) => setFormData({ ...formData, guarantor_name: e.target.value })}
              />
            </div>

            {/* Loan Principal Amount */}
            <div className="form-group">
              <label className="form-label">Loan Principal Amount (₹) *</label>
              <input 
                type="number" 
                step="any"
                className="form-input mono"
                placeholder="e.g. 10000 or 50000"
                required
                value={formData.loan_amount}
                onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
              />
            </div>

            {/* Payment Mode */}
            <div className="form-group">
              <label className="form-label">Payment Disbursed Via</label>
              <select 
                className="form-select"
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              >
                <option value="Gpay">Gpay / UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cash + UPI">Cash + UPI (Split Payment)</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* CASH + UPI SPLIT BREAKDOWN INPUTS */}
            {formData.payment_mode === 'Cash + UPI' && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: 'rgba(99, 102, 241, 0.08)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <label className="form-label" style={{ color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>💵 + 📱 Split Payment Breakdown (Cash + UPI)</span>
                  <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Total: ₹{numAmount.toLocaleString('en-IN')}</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.35rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Amount (₹)</label>
                    <input 
                      type="number"
                      step="any"
                      className="form-input mono"
                      placeholder="e.g. 2000"
                      value={cashAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCashAmount(val);
                        if (numAmount > 0 && val !== '') {
                          const remaining = Math.max(0, numAmount - (parseFloat(val) || 0));
                          setUpiAmount(String(remaining));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>UPI Amount (₹)</label>
                    <input 
                      type="number"
                      step="any"
                      className="form-input mono"
                      placeholder="e.g. 3000"
                      value={upiAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUpiAmount(val);
                        if (numAmount > 0 && val !== '') {
                          const remaining = Math.max(0, numAmount - (parseFloat(val) || 0));
                          setCashAmount(String(remaining));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT PROOF SECTION FOR ONLINE TRANSACTION vs CASH */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              {isOnlinePayment ? (
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <label className="form-label" style={{ color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                        setPaymentProofFile(file);
                        if (file.type.startsWith('image/')) {
                          setPaymentProofPreview(URL.createObjectURL(file));
                        }
                      }
                    }}
                  />
                  {paymentProofPreview && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={paymentProofPreview} alt="Payment Proof Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--accent-neon)' }} />
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ Proof file selected
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

            {/* QUICK PRESETS TEASER BUTTONS */}
            <div className="form-group" style={{ gridColumn: 'span 2', background: 'var(--bg-primary)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Zap size={14} color="#f59e0b" />
                  <span>Quick Preset Tenure & Rates (1-Touch Multipliers)</span>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => applyPreset('16', '/Month', 1)}
                  className={`btn ${tenureUnit === '/Month' && tenureCount === '1' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  1 Mo (16%)
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('16', '/Month', 2)}
                  className={`btn ${tenureUnit === '/Month' && tenureCount === '2' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  2 Mos (16%/mo = 32%)
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('10', '/week', 1)}
                  className={`btn ${tenureUnit === '/week' && tenureCount === '1' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  1 Wk (10%)
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('10', '/week', 2)}
                  className={`btn ${tenureUnit === '/week' && tenureCount === '2' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  2 Wks (10%/wk = 20%)
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('8.80', 'day', 3)}
                  className={`btn ${tenureUnit === 'day' && tenureCount === '3' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  3 Days (8.8%)
                </button>
                <button 
                  type="button" 
                  onClick={() => applyPreset('8', 'day', 1)}
                  className={`btn ${tenureUnit === 'day' && tenureCount === '1' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '0.35rem', justifyContent: 'center' }}
                >
                  1 Day (8%)
                </button>
              </div>
            </div>

            {/* Base Interest Rate & Tenure Selection */}
            <div className="form-group">
              <label className="form-label">Base Interest Rate (% per period)</label>
              <input 
                type="number" 
                step="any"
                className="form-input mono"
                placeholder="e.g. 16 or 10"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Urgent Processing Fee Rate (+%)</label>
              <input 
                type="number" 
                step="any"
                className="form-input mono"
                placeholder="e.g. 1.5 or 0"
                value={formData.urgent_fee}
                onChange={(e) => setFormData({ ...formData, urgent_fee: e.target.value })}
              />
            </div>

            {/* Tenure Unit Selector */}
            <div className="form-group">
              <label className="form-label">Tenure Rate Period (Unit)</label>
              <select 
                className="form-select"
                value={tenureUnit}
                onChange={(e) => handleUnitChange(e.target.value)}
              >
                <option value="/Month">Per Month (/Month)</option>
                <option value="/week">Per Week (/week)</option>
                <option value="day">Per Day (days)</option>
                <option value="Custom">Custom Freeform Text</option>
              </select>
            </div>

            {/* Tenure Duration Count Multiplier */}
            {tenureUnit !== 'Custom' ? (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tenure Duration ({tenureUnit === '/week' ? 'Weeks' : tenureUnit === '/Month' ? 'Months' : 'Days'})</span>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                    {numCount > 1 ? `${numCount}x Multiplier` : 'Single Period'}
                  </span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  step="1"
                  className="form-input mono"
                  placeholder="e.g. 1, 2, 3, 4"
                  value={tenureCount}
                  onChange={(e) => handleCountChange(e.target.value)}
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Custom Tenure Text Label</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. for 12 hours, 3-7 Aug"
                  value={formData.interest_tenure}
                  onChange={(e) => setFormData({ ...formData, interest_tenure: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Disbursement Date</label>
              <input 
                type="date" 
                className="form-input"
                value={formData.date_given}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData(prev => {
                    const suggestedReturn = calculateSuggestedReturnDate(newDate, tenureUnit, tenureCount);
                    return {
                      ...prev,
                      date_given: newDate,
                      return_date: suggestedReturn || prev.return_date
                    };
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Promised Return Date</span>
                {tenureUnit !== 'Custom' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const sugg = calculateSuggestedReturnDate(formData.date_given, tenureUnit, tenureCount);
                      if (sugg) setFormData({ ...formData, return_date: sugg });
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                  >
                    Auto-Suggest
                  </button>
                )}
              </label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. 24-Aug-2026 or 31st Aug"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
              />
            </div>

            {/* REAL TIME INTEREST CALCULATOR DISPLAY */}
            {numAmount > 0 && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: 'rgba(34, 197, 94, 0.08)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Effective Total Rate: <strong style={{ color: 'var(--accent-neon)' }}>{numTotalRate}% {tenureUnit !== 'Custom' ? getDerivedTenureText(tenureUnit, tenureCount, ratePerPeriod) : formData.interest_tenure}</strong>
                    {numCount > 1 && tenureUnit !== 'Custom' && (
                      <span style={{ fontSize: '0.72rem', color: '#a855f7', marginLeft: '0.4rem' }}>({ratePerPeriod}% × {numCount})</span>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Interest: <strong className="mono" style={{ color: '#6366f1' }}>+₹{calculatedInterest.toLocaleString('en-IN')}</strong></span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Total Due: <strong className="mono" style={{ color: 'var(--accent-neon)', fontSize: '1rem' }}>₹{calculatedTotal.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            )}

            {/* Remarks / Terms */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Remarks / Special Terms</label>
              <textarea 
                className="form-textarea"
                rows="2"
                placeholder="e.g. urgent arrangement fee 1% applied, return date 31st August"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              ></textarea>
            </div>

            {/* PAPERWORK & COLLATERAL SECTIONS ONLY FOR LOANS >= 30,000 */}
            {isHighValue ? (
              <>
                {/* HIGH VALUE TOGGLE CONTROL BOX */}
                <div style={{
                  gridColumn: 'span 2',
                  padding: '1rem 1.25rem',
                  background: wantCollateral ? 'rgba(168, 85, 247, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: wantCollateral ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: wantCollateral ? '#a855f7' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <ShieldAlert size={18} />
                      <span>High Value Security Check (&ge; ₹30,000)</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      {wantCollateral 
                        ? 'Paperwork upload & pledged collateral options are active for this loan.' 
                        : 'Collateral & Paperwork skipped. This loan entry will be labeled as HIGH RISK.'}
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none', fontWeight: 700, fontSize: '0.825rem', whiteSpace: 'nowrap', background: 'var(--bg-primary)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span>Require Paperwork & Collateral?</span>
                    <input 
                      type="checkbox"
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#a855f7' }}
                      checked={wantCollateral}
                      onChange={(e) => setWantCollateral(e.target.checked)}
                    />
                  </label>
                </div>

                {wantCollateral ? (
                  <>
                    {/* Paperwork Upload (1 to 5 files at once) */}
                    <div className="form-group" style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <label className="form-label" style={{ color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Upload Agreement / ID Documents (&ge; 30k)</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Upload 1-5 files at once</span>
                      </label>
                      <input 
                        type="file" 
                        multiple
                        accept="image/*,application/pdf"
                        className="form-input"
                        onChange={handleDocumentChange}
                      />
                      {documentFiles.length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                          <strong>{documentFiles.length} file(s) selected:</strong>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            {documentFiles.map((f, i) => (
                              <span key={i} style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                {f.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COLLATERAL SECTION FOR HIGH VALUE (>= 30K) LOANS */}
                    <div style={{
                      gridColumn: 'span 2',
                      padding: '1.25rem',
                      background: 'rgba(168, 85, 247, 0.08)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(168, 85, 247, 0.4)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ShieldAlert size={18} color="#a855f7" />
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Security Collateral Vault <span className="badge badge-highvalue" style={{ marginLeft: '0.5rem' }}>Active (&ge; 30k)</span>
                          </h3>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Pledged Collateral Item Name</label>
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="e.g. Gold Necklace, iPhone 15 Pro, Bike R/C"
                            value={formData.collateral_item_name}
                            onChange={(e) => setFormData({ ...formData, collateral_item_name: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Estimated Valuation (₹)</label>
                          <input 
                            type="number" 
                            step="any"
                            className="form-input mono"
                            placeholder="e.g. 50000"
                            value={formData.collateral_estimated_value}
                            onChange={(e) => setFormData({ ...formData, collateral_estimated_value: e.target.value })}
                          />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label">Collateral Description & Physical Condition</label>
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="e.g. 22K Gold 10g with bill, Sealed box phone with IMEI"
                            value={formData.collateral_description}
                            onChange={(e) => setFormData({ ...formData, collateral_description: e.target.value })}
                          />
                        </div>

                        {/* MULTIPLE COLLATERAL SECURITY PHOTOS (1 to 10 AT ONCE) */}
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Upload Collateral Security Photos</span>
                            <span style={{ fontSize: '0.72rem', color: '#a855f7' }}>Upload 1-10 photos at once</span>
                          </label>
                          <input 
                            type="file" 
                            multiple
                            accept="image/*"
                            className="form-input"
                            onChange={handlePhotosChange}
                          />
                          {photoPreviews.length > 0 && (
                            <div style={{ marginTop: '0.6rem' }}>
                              <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '0.4rem' }}>
                                <strong>{photoPreviews.length} photo(s) selected:</strong>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {photoPreviews.map((src, idx) => (
                                  <img key={idx} src={src} alt={`Preview ${idx + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent-purple)' }} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: 'span 2', background: 'rgba(239, 68, 68, 0.08)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={16} />
                    <span>Notice: Normal entry mode without security collateral. This loan will be tagged as <strong>HIGH RISK</strong>.</span>
                  </div>
                )}
              </>
            ) : null}

          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Sparkles size={16} />
              <span>{initialData ? 'Save Changes' : 'Create Loan Entry'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
