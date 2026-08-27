import React, { useState } from 'react';
import { 
  X, FileText, Camera, DollarSign, Calendar, ShieldAlert, 
  CheckCircle2, Clock, ChevronDown, ChevronUp, Printer, File, ArrowRight, PlusCircle, FileCheck,
  ZoomIn, Download
} from 'lucide-react';
import { downloadPaymentProof } from './PaymentProofGalleryModal';

export default function FullLoanDetailsModal({ 
  isOpen, 
  onClose, 
  loan, 
  onOpenInstallmentModal, 
  onOpenCollateralModal,
  onOpenProofModal 
}) {
  const [showInstallmentAccordion, setShowInstallmentAccordion] = useState(true);

  if (!isOpen || !loan) return null;

  const isHighValue = loan.requires_collateral || parseFloat(loan.loan_amount) >= 30000;
  const installments = loan.installments || [];
  const collaterals = loan.collaterals || [];
  const documents = loan.documents || [];
  const hasProofs = loan.proof_path || installments.some(i => i.proof_path);

  const isHighRisk = parseFloat(loan.loan_amount) >= 30000 && (
    loan.risk_level === 'High Risk' || 
    (loan.remark || '').includes('[HIGH RISK]') || 
    (!collaterals.length && !documents.length && loan.requires_collateral === 0)
  );

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

  // Helper to calculate exact proof gallery index for an installment
  const getInstallmentProofIndex = (instId) => {
    let index = loan.proof_path ? 1 : 0;
    const installmentsWithProof = installments.filter(i => i.proof_path);
    const foundIdx = installmentsWithProof.findIndex(i => i.id === instId);
    return foundIdx !== -1 ? index + foundIdx : 0;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container printable-modal-content" style={{ padding: '2rem', maxWidth: '820px' }}>
        
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
                  isHighRisk ? (
                    <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                      ⚠️ High Risk
                    </span>
                  ) : (
                    <span className="badge badge-highvalue" style={{ fontSize: '0.6rem' }}>
                      🛡️ &gt;30K Security
                    </span>
                  )
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
          marginBottom: '1.25rem'
        }}>
          
          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Original Principal</div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {formatCurrency(loan.loan_amount)}
            </div>
          </div>

          {loan.current_principal !== undefined && loan.current_principal !== null && parseFloat(loan.current_principal) !== parseFloat(loan.loan_amount) && (
            <div className="glass-card" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>Active Principal</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#818cf8', marginTop: '0.25rem' }}>
                {formatCurrency(loan.current_principal)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Reduced balance</div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cycle Interest ({loan.interest_rate}%)</div>
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

          {parseFloat(loan.discount_amount || 0) > 0 && (
            <div className="glass-card" style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 600 }}>Discount Granted</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#a855f7', marginTop: '0.25rem' }}>
                -{formatCurrency(loan.discount_amount)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Offered to borrower</div>
            </div>
          )}

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
            marginBottom: '1.25rem',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Remarks / Terms:</strong> {loan.remark}
          </div>
        )}

        {/* DEDICATED SECTION 1: LOAN DISBURSED PAYMENT PROOF (Lender / Who Gave The Loan) */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          padding: '1.1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.92rem', color: '#818cf8' }}>
              <FileCheck size={18} />
              <span>Loan Disbursed Payment Proof (Lender / Who Gave Loan)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Disbursed via <strong>{loan.payment_mode || 'Gpay'}</strong> on {loan.date_given}
            </span>
          </div>

          {loan.proof_path ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <img 
                  src={loan.proof_path} 
                  alt="Lender Disbursement Proof" 
                  style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #818cf8', cursor: 'pointer' }}
                  onClick={() => onOpenProofModal && onOpenProofModal(loan, 0)}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    Lender Payment Proof Attached
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    ₹{parseFloat(loan.loan_amount).toLocaleString('en-IN')} transferred to {loan.loan_taker}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={() => onOpenProofModal && onOpenProofModal(loan, 0)}
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  <ZoomIn size={13} />
                  <span>View &amp; Zoom</span>
                </button>

                <button 
                  type="button"
                  onClick={() => downloadPaymentProof(loan.proof_path, loan.loan_taker, loan.id, loan.date_given)}
                  className="btn btn-primary" 
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {(loan.payment_mode || '').toLowerCase() === 'cash' ? (
                <span>💵 <strong>Cash Disbursed:</strong> No initial disbursement proof needed for Cash transaction.</span>
              ) : (
                <span>📷 No initial disbursement payment proof attached for lender.</span>
              )}
            </div>
          )}
        </div>

        {/* DEDICATED SECTION 2: ACCORDION INSTALLMENT REPAYMENT LOG (Who Took The Loan) */}
        <div style={{ marginBottom: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          
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
              <span>Installment Repayment Log (Borrower / Who Took Loan) ({installments.length})</span>
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
                No installment repayment entries recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {installments.map((inst, index) => (
                  <div 
                    key={inst.id || index}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        #{inst.installment_no}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Date: {inst.payment_date} ({inst.payment_mode})
                        </div>
                        {inst.remark && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{inst.remark}</div>}
                      </div>
                    </div>

                    {/* Right Side: Separate Proof Button for Each Installment + Amount */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {inst.proof_path ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img 
                            src={inst.proof_path} 
                            alt={`Installment #${inst.installment_no} Proof`}
                            style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #10b981', cursor: 'pointer' }}
                            onClick={() => onOpenProofModal && onOpenProofModal(loan, getInstallmentProofIndex(inst.id))}
                          />
                          <button 
                            type="button" 
                            onClick={() => onOpenProofModal && onOpenProofModal(loan, getInstallmentProofIndex(inst.id))}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '0.25rem 0.6rem', 
                              fontSize: '0.72rem', 
                              background: 'rgba(16, 185, 129, 0.15)', 
                              color: '#10b981', 
                              border: '1px solid rgba(16, 185, 129, 0.35)', 
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <FileCheck size={12} />
                            <span>View Proof Image</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => downloadPaymentProof(inst.proof_path, loan.loan_taker, loan.id, inst.payment_date)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem' }}
                            title="Download Proof Image"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {(inst.payment_mode || '').toLowerCase() === 'cash' ? 'Cash (No Proof)' : 'No Proof Uploaded'}
                        </span>
                      )}

                      {parseFloat(inst.discount_amount || 0) > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                          🏷️ Discount: {formatCurrency(inst.discount_amount)}
                        </span>
                      )}
                      <div className="mono" style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem', minWidth: '80px', textAlign: 'right' }}>
                        +{formatCurrency(inst.amount_paid)}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SECTION 3: SECURITY COLLATERAL & PAPERWORK ATTACHMENTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          {/* Collateral Vault */}
          <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#a855f7' }}>
                <Camera size={16} />
                <span>Collateral Vault</span>
              </div>
              <button onClick={() => onOpenCollateralModal(loan)} className="btn btn-secondary no-print" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem' }}>
                Manage
              </button>
            </div>

            {collaterals.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                {isHighValue ? 'No security item attached yet.' : 'Not required under 30k.'}
              </div>
            ) : (
              collaterals.map((col) => (
                <div key={col.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {col.photo_path && (
                    <img 
                      src={col.photo_path} 
                      alt={col.item_name} 
                      style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{col.item_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Valuation: <span className="mono" style={{ fontWeight: 700 }}>{formatCurrency(col.estimated_value)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paperwork Documents */}
          <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#6366f1' }}>
                <FileText size={16} />
                <span>Paperwork</span>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No agreement documents.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.25rem 0' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.document_name}</span>
                  <a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="no-print" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>
                    View PDF/Doc
                  </a>
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


