import React, { useState } from 'react';
import { 
  X, FileText, Camera, DollarSign, Calendar, ShieldAlert, 
  CheckCircle2, Clock, ChevronDown, ChevronUp, Printer, File, ArrowRight, PlusCircle 
} from 'lucide-react';

export default function FullLoanDetailsModal({ 
  isOpen, 
  onClose, 
  loan, 
  onOpenInstallmentModal, 
  onOpenCollateralModal 
}) {
  const [showInstallmentAccordion, setShowInstallmentAccordion] = useState(true);

  if (!isOpen || !loan) return null;

  const isHighValue = loan.requires_collateral || loan.loan_amount > 30000;
  const installments = loan.installments || [];
  const collaterals = loan.collaterals || [];
  const documents = loan.documents || [];

  const totalPaid = installments.reduce((acc, i) => acc + (parseFloat(i.amount_paid) || 0), 0);

  const formatCurrency = (val) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const safeName = (loan.loan_taker || 'Borrower')
      .trim()
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .replace(/\s+/g, '_');
    
    document.title = `${safeName}_Loan_#${loan.id}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container printable-modal-content" style={{ padding: '2rem', maxWidth: '780px' }}>
        
        {/* Print-Only Header Statement */}
        <div className="print-only-header" style={{ display: 'none', marginBottom: '1.25rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                LOAN FINANCIAL STATEMENT
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
                Official Settlement & Repayment Ledger Record
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#475569' }}>
              <div><strong>Printed On:</strong> {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div><strong>Document Ref:</strong> LOAN-#{loan.id}</div>
            </div>
          </div>
        </div>

        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              padding: '0.5rem 0.75rem',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              ID #{loan.id}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {loan.loan_taker}
                </h2>
                <span className={`badge badge-${loan.status}`}>
                  {loan.status}
                </span>
                {isHighValue && (
                  <span className="badge badge-highvalue" style={{ fontSize: '0.6rem' }}>
                    &gt;30K Security
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.45' }}>
                <div>
                  Loan Issued: <strong>{loan.date_given}</strong>
                  {loan.guarantor_name && <> | Guarantor: <strong style={{ color: '#a855f7' }}>{loan.guarantor_name}</strong></>}
                </div>
                <div>
                  Due Date: <strong>{loan.return_date || 'N/A'}</strong> | Mode: <strong>{loan.payment_mode || 'Gpay'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              <Printer size={15} />
              <span>Print File</span>
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Financial Summary Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          
          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Original Loan</div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {formatCurrency(loan.loan_amount)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Interest ({loan.interest_rate}%)</div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>
              +{formatCurrency(loan.interest_amount)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{loan.interest_tenure}</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Payable</div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {formatCurrency(loan.total_amount)}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
              {formatCurrency(totalPaid)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{installments.length} installment{installments.length > 1 ? 's' : ''}</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Remaining Due</div>
            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
              {formatCurrency(loan.balance_due)}
            </div>
          </div>

        </div>

        {loan.remark && (
          <div style={{
            background: 'var(--bg-primary)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Remarks / Terms:</strong> {loan.remark}
          </div>
        )}

        {/* SECTION 1: ACCORDION INSTALLMENT LEDGER */}
        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          
          <div 
            onClick={() => setShowInstallmentAccordion(!showInstallmentAccordion)}
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: 'var(--bg-secondary)',
              borderBottom: showInstallmentAccordion ? '1px solid var(--border-color)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <DollarSign size={18} color="#10b981" />
              <span>Installment Repayment Log ({installments.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="mono" style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>
                {formatCurrency(totalPaid)} total paid
              </span>
              <span className="no-print">
                {showInstallmentAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </div>
          </div>

          <div 
            className="installment-accordion-body"
            style={{ 
              padding: '1rem', 
              display: showInstallmentAccordion ? 'block' : 'none' 
            }}
          >
            {installments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No installment payments recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {installments.map((inst, index) => (
                  <div 
                    key={inst.id || index}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        #{inst.installment_no}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Date: {inst.payment_date} ({inst.payment_mode})
                        </div>
                        {inst.remark && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.remark}</div>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                        +{formatCurrency(inst.amount_paid)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SECTION 2: SECURITY COLLATERAL & PAPERWORK ATTACHMENTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          {/* Collateral Vault */}
          <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#a855f7' }}>
                <Camera size={16} />
                <span>Security Collateral Vault</span>
              </div>
              <button onClick={() => onOpenCollateralModal(loan)} className="btn btn-secondary no-print" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                Manage
              </button>
            </div>

            {collaterals.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                {isHighValue ? 'No security item attached yet.' : 'Not required for loans under 30k.'}
              </div>
            ) : (
              collaterals.map((col) => (
                <div key={col.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {col.photo_path && (
                    <img 
                      src={col.photo_path} 
                      alt={col.item_name} 
                      style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{col.item_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Valuation: <span className="mono" style={{ fontWeight: 700 }}>{formatCurrency(col.estimated_value)}</span> | Status: <span className={`badge badge-${col.status}`} style={{ fontSize: '0.55rem' }}>{col.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paperwork Documents */}
          <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#6366f1' }}>
                <FileText size={16} />
                <span>Paperwork & Agreements</span>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No agreement documents uploaded.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.document_name}</span>
                  <a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="no-print" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>
                    View PDF/Doc
                  </a>
                  <span className="print-only" style={{ display: 'none', fontSize: '0.75rem', color: '#64748b' }}>
                    {doc.file_path ? '(Attached Document)' : ''}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Print-Only Authorization / Signature Footer */}
        <div className="print-only-header" style={{ display: 'none', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              <div>Authorized Representative Signature</div>
              <div style={{ marginTop: '2rem', width: '200px', borderBottom: '1px dashed #94a3b8' }}></div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
              <div>Borrower / Guarantor Acknowledgment</div>
              <div style={{ marginTop: '2rem', width: '200px', borderBottom: '1px dashed #94a3b8' }}></div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close File
          </button>
          {loan.status !== 'received' && (
            <button 
              onClick={() => {
                onClose();
                onOpenInstallmentModal(loan);
              }}
              className="btn btn-success"
            >
              <PlusCircle size={16} />
              <span>Record New Payment</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

