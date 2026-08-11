import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ShieldAlert, FileText, Camera, PlusCircle, 
  CheckCircle, Clock, Trash2, Edit3, Eye, EyeOff, FolderOpen 
} from 'lucide-react';

function formatNiceDate(dateStr) {
  if (!dateStr) return '-';
  if (/[a-zA-Z]/.test(dateStr) && dateStr.includes(' ')) return dateStr;

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[monthIdx] || parts[1];

      const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
        : (day === 2 || day === 22) ? 'nd'
        : (day === 3 || day === 23) ? 'rd' : 'th';

      return `${day}${suffix} ${month} ${year}`;
    }
  } catch (e) {}

  return dateStr;
}

export default function LoanTable({ 
  loans = [], 
  isGlobalPrivacyOn = false,
  onOpenInstallmentModal, 
  onOpenCollateralModal, 
  onOpenPaperworkModal, 
  onOpenFullDetailsModal,
  onEditLoan, 
  onDeleteLoan 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highValueOnly, setHighValueOnly] = useState(false);

  // Per-row privacy state overrides
  const [toggledRows, setToggledRows] = useState(new Set());

  const toggleRowPrivacy = (loanId) => {
    setToggledRows(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const isRowMasked = (loanId) => {
    if (isGlobalPrivacyOn) {
      return !toggledRows.has(loanId);
    } else {
      return toggledRows.has(loanId);
    }
  };

  // Compact space-saving Privacy Masking (e.g. B** D** W**)
  const maskName = (name) => {
    if (!name) return 'B**';
    const parts = name.trim().split(/\s+/);
    return parts.map(p => p.length > 0 ? p[0] + '**' : '*').join(' ');
  };

  const formatCurrency = (val, masked) => {
    if (masked) return '₹ •••••';
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  // Memoized Filtering Logic for fast instant search & filter
  const filteredLoans = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return loans.filter(loan => {
      const matchesSearch = !term ||
        (loan.loan_taker || '').toLowerCase().includes(term) ||
        (loan.guarantor_name || '').toLowerCase().includes(term) ||
        (loan.remark || '').toLowerCase().includes(term) ||
        (loan.payment_mode || '').toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
      const matchesHighValue = !highValueOnly || (loan.requires_collateral || loan.loan_amount > 30000);

      return matchesSearch && matchesStatus && matchesHighValue;
    });
  }, [loans, searchTerm, statusFilter, highValueOnly]);

  return (
    <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
      
      {/* Search & Filter Header Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
            placeholder="Search loan taker, remarks, payment mode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          
          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="var(--text-secondary)" />
            <select 
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="received">Received / Paid</option>
              <option value="overdue">Overdue</option>
              <option value="forfeited">Forfeited Collateral</option>
            </select>
          </div>

          {/* Toggle >30k High Value Filter */}
          <button 
            onClick={() => setHighValueOnly(!highValueOnly)}
            className={`btn ${highValueOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
          >
            <ShieldAlert size={14} />
            <span>&gt; 30k Loans Only</span>
          </button>

        </div>

      </div>

      {/* Main Ledger Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, width: '40px' }}>Privacy</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, width: '95px', whiteSpace: 'nowrap' }}>Date</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '120px' }}>Loan Taker</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '90px', whiteSpace: 'nowrap' }}>Amount</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '95px', whiteSpace: 'nowrap' }}>Rate & Tenure</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '85px', whiteSpace: 'nowrap' }}>Return Date</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '95px', whiteSpace: 'nowrap' }}>Interest</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '105px', whiteSpace: 'nowrap' }}>Total / Due</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '115px', whiteSpace: 'nowrap' }}>Installments</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '90px' }}>Security & Papers</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, width: '75px' }}>Status</th>
              <th style={{ padding: '0.75rem 0.4rem', fontWeight: 700, minWidth: '115px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No loan records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const isHighValue = loan.requires_collateral || loan.loan_amount >= 30000;
                const hasCollateral = (loan.collaterals && loan.collaterals.length > 0);
                const hasDocs = (loan.documents && loan.documents.length > 0);
                const installmentsPaid = (loan.installments || []).reduce((acc, i) => acc + (parseFloat(i.amount_paid) || 0), 0);
                const masked = isRowMasked(loan.id);
                const firstInst = loan.installments && loan.installments.length > 0 ? loan.installments[0] : null;

                return (
                  <tr 
                    key={loan.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                      backgroundColor: masked ? 'rgba(15, 23, 42, 0.2)' : isHighValue ? 'rgba(168, 85, 247, 0.03)' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = masked ? 'rgba(15, 23, 42, 0.2)' : isHighValue ? 'rgba(168, 85, 247, 0.03)' : 'transparent'}
                  >
                    
                    {/* Individual Row Privacy Eye Toggle */}
                    <td style={{ padding: '0.75rem 0.4rem' }}>
                      <button 
                        onClick={() => toggleRowPrivacy(loan.id)}
                        className={`btn ${masked ? 'btn-warning' : 'btn-secondary'}`}
                        style={{ padding: '0.25rem 0.45rem' }}
                        title={masked ? "Click to Show Details for this Borrower" : "Click to Hide Details for this Borrower"}
                      >
                        {masked ? <EyeOff size={15} color="currentColor" /> : <Eye size={15} color="currentColor" />}
                      </button>
                    </td>

                    {/* Formatted Nice Date (e.g. 30th Jul 2026) */}
                    <td style={{ padding: '0.75rem 0.4rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {formatNiceDate(loan.date_given)}
                    </td>

                    {/* Loan Taker (Name Masked Compactly as B** D**) */}
                    <td style={{ padding: '0.75rem 0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div>{masked ? maskName(loan.loan_taker) : loan.loan_taker}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        Mode: <span style={{ color: 'var(--text-secondary)' }}>{loan.payment_mode || 'Gpay'}</span>
                        {loan.guarantor_name && (
                          <span style={{ marginLeft: '0.4rem', color: '#a855f7' }}>
                            | G: {masked ? maskName(loan.guarantor_name) : loan.guarantor_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Loan Amount */}
                    <td style={{ padding: '0.75rem 0.4rem', fontWeight: 800, whiteSpace: 'nowrap' }} className="mono">
                      <div style={{ color: 'var(--text-primary)' }}>{formatCurrency(loan.loan_amount, masked)}</div>
                      {isHighValue && (
                        <span className="badge badge-highvalue" style={{ fontSize: '0.58rem', marginTop: '0.15rem', padding: '0.1rem 0.35rem' }}>
                          &gt;30K Security
                        </span>
                      )}
                    </td>

                    {/* Interest Rate & Tenure */}
                    <td style={{ padding: '0.75rem 0.4rem', whiteSpace: 'nowrap' }}>
                      <div className="mono" style={{ fontWeight: 700, color: '#6366f1' }}>
                        {masked ? '••%' : `${loan.interest_rate}%`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{loan.interest_tenure}</div>
                    </td>

                    {/* Return Date */}
                    <td style={{ padding: '0.75rem 0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {loan.return_date || '-'}
                    </td>

                    {/* Interest Amount (Always 1 Single Line) */}
                    <td style={{ padding: '0.75rem 0.4rem', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }} className="mono">
                      +{formatCurrency(loan.interest_amount, masked)}
                    </td>

                    {/* Total Amount & Remaining Due */}
                    <td style={{ padding: '0.75rem 0.4rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Original Total:</div>
                      <div className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {formatCurrency(loan.total_amount, masked)}
                      </div>
                      <div style={{ marginTop: '0.2rem' }}>
                        {loan.balance_due <= 0 ? (
                          <span className="badge badge-received" style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}>Paid in Full</span>
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>Remaining Due:</div>
                            <div className="mono" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 800 }}>
                              {formatCurrency(loan.balance_due, masked)}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* INSTALLMENTS CELL */}
                    <td style={{ padding: '0.75rem 0.4rem', whiteSpace: 'nowrap' }}>
                      {installmentsPaid > 0 ? (
                        <div>
                          <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                            {formatCurrency(installmentsPaid, masked)} paid
                          </div>
                          
                          {firstInst && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              1st: {formatCurrency(firstInst.amount_paid, masked)} on {formatNiceDate(firstInst.payment_date)}
                            </div>
                          )}

                          {loan.installments.length > 1 && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenFullDetailsModal(loan);
                              }}
                              style={{ 
                                fontSize: '0.68rem', 
                                color: '#818cf8', 
                                marginTop: '0.2rem', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontWeight: 600
                              }}
                            >
                              <span>({loan.installments.length} payments 📁)</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>

                    {/* Security Collateral Vault & Paperwork Badges */}
                    <td style={{ padding: '0.75rem 0.4rem' }}>
                      {isHighValue || hasCollateral || hasDocs ? (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {hasCollateral ? (
                            <button 
                              onClick={() => !masked && onOpenCollateralModal(loan)}
                              disabled={masked}
                              className="btn btn-secondary"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', opacity: masked ? 0.35 : 1, cursor: masked ? 'not-allowed' : 'pointer' }}
                              title={masked ? "Privacy Active: Unmask borrower eye toggle to view collateral" : "View Security Collateral Item & Photos"}
                            >
                              <Camera size={11} color={masked ? "var(--text-muted)" : "#a855f7"} />
                              <span>Collateral ({loan.collaterals.length})</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => !masked && onOpenCollateralModal(loan)}
                              disabled={masked}
                              className="btn btn-warning"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', opacity: masked ? 0.35 : 1, cursor: masked ? 'not-allowed' : 'pointer' }}
                              title={masked ? "Privacy Active: Unmask borrower eye toggle to add collateral" : "Add Security Collateral"}
                            >
                              <PlusCircle size={11} />
                              <span>Add Security</span>
                            </button>
                          )}

                          {hasDocs ? (
                            <button 
                              onClick={() => !masked && onOpenPaperworkModal(loan)}
                              disabled={masked}
                              className="btn btn-secondary"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', opacity: masked ? 0.35 : 1, cursor: masked ? 'not-allowed' : 'pointer' }}
                              title={masked ? "Privacy Active: Unmask borrower eye toggle to view documents" : "View Attached Paperwork Documents"}
                            >
                              <FileText size={11} color={masked ? "var(--text-muted)" : "#6366f1"} />
                              <span>Papers ({loan.documents.length})</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* Status Badge (Reduced Text Size) */}
                    <td style={{ padding: '0.75rem 0.4rem' }}>
                      <span className={`badge badge-${loan.status}`} style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem' }}>
                        {loan.status === 'received' && <CheckCircle size={11} />}
                        {loan.status === 'active' && <Clock size={11} />}
                        {loan.status === 'forfeited' && <ShieldAlert size={11} />}
                        {loan.status}
                      </span>
                    </td>

                    {/* Row Actions (Disabled when privacy is active for this row) */}
                    <td style={{ padding: '0.75rem 0.4rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                        
                        {/* Compact Master View File Icon Button */}
                        <button 
                          onClick={() => !masked && onOpenFullDetailsModal(loan)}
                          disabled={masked}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.3rem 0.45rem',
                            background: masked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.15)',
                            color: masked ? 'var(--text-muted)' : '#818cf8',
                            border: masked ? '1px solid var(--border-color)' : '1px solid rgba(99, 102, 241, 0.3)',
                            opacity: masked ? 0.35 : 1,
                            cursor: masked ? 'not-allowed' : 'pointer',
                            filter: masked ? 'grayscale(1)' : 'none'
                          }}
                          title={masked ? "Privacy Active: Unmask borrower eye toggle to open Master Loan File" : "Open Master Loan File"}
                        >
                          <FolderOpen size={14} />
                        </button>

                        {/* Record Installment (Pay Button) */}
                        {loan.status !== 'received' && (
                          <button 
                            onClick={() => !masked && onOpenInstallmentModal(loan)}
                            disabled={masked}
                            className="btn btn-success"
                            style={{
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.72rem',
                              opacity: masked ? 0.35 : 1,
                              cursor: masked ? 'not-allowed' : 'pointer',
                              filter: masked ? 'grayscale(1)' : 'none'
                            }}
                            title={masked ? "Privacy Active: Unmask borrower eye toggle to record payment" : "Record Payment Installment"}
                          >
                            <PlusCircle size={13} />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* Edit Loan Button */}
                        <button 
                          onClick={() => !masked && onEditLoan(loan)}
                          disabled={masked}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.3rem 0.45rem',
                            opacity: masked ? 0.35 : 1,
                            cursor: masked ? 'not-allowed' : 'pointer',
                            filter: masked ? 'grayscale(1)' : 'none'
                          }}
                          title={masked ? "Privacy Active: Unmask borrower eye toggle to edit loan details" : "Edit Loan Details"}
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Delete Loan Button */}
                        <button 
                          onClick={() => !masked && onDeleteLoan(loan.id)}
                          disabled={masked}
                          className="btn btn-danger"
                          style={{
                            padding: '0.3rem 0.45rem',
                            opacity: masked ? 0.35 : 1,
                            cursor: masked ? 'not-allowed' : 'pointer',
                            filter: masked ? 'grayscale(1)' : 'none'
                          }}
                          title={masked ? "Privacy Active: Unmask borrower eye toggle to delete entry" : "Delete Entry"}
                        >
                          <Trash2 size={13} />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
