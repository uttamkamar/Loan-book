import React from 'react';
import { DollarSign, TrendingUp, ShieldCheck, CheckCircle2, Receipt } from 'lucide-react';

// Helper to calculate exact interest actually received in cash for a loan
function calculateEarnedInterest(loan) {
  if (!loan) return 0;
  const principal = parseFloat(loan.loan_amount) || 0;
  const installments = loan.installments || [];
  const rate = parseFloat(loan.interest_rate) || 0;

  // 1. Fully Completed / Settled Loans (Option A: Earned Interest = Total Paid - Net Principal)
  if (loan.status === 'received') {
    const totalPaid = installments.length > 0
      ? installments.reduce((acc, i) => acc + (parseFloat(i.amount_paid) || 0), 0)
      : Math.max(0, (parseFloat(loan.total_amount) || (principal + (parseFloat(loan.interest_amount) || 0))) - (parseFloat(loan.discount_amount) || 0));
    
    const totalDiscount = (installments || []).reduce((acc, i) => acc + (parseFloat(i.discount_amount) || 0), 0) + (parseFloat(loan.discount_amount) || 0);
    const effectivePrincipal = Math.max(0, principal - totalDiscount);
    
    return Math.max(0, Math.round((totalPaid - effectivePrincipal) * 100) / 100);
  }

  // 2. Active / Partial Loans with Installment Payments (Extract Interest Paid, ignoring principal returns)
  if (installments.length > 0) {
    if (loan.interest_type === 'flat') {
      const totalPaid = installments.reduce((acc, i) => acc + (parseFloat(i.amount_paid) || 0), 0);
      const fixedInterest = Math.round((principal * (rate / 100)) * 100) / 100;
      return Math.min(totalPaid, fixedInterest);
    }

    let currentPrincipal = principal;
    let initialInterest = Math.round((principal * (rate / 100)) * 100) / 100;
    let unpaidInterestAccrued = initialInterest;
    let earnedInterest = 0;

    const sortedInsts = [...installments].sort((a, b) => {
      const dateA = new Date(a.payment_date || a.created_at || 0).getTime();
      const dateB = new Date(b.payment_date || b.created_at || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.installment_no || 0) - (b.installment_no || 0);
    });

    for (const inst of sortedInsts) {
      const paid = parseFloat(inst.amount_paid) || 0;
      const discount = parseFloat(inst.discount_amount) || 0;
      
      const rawPrincipalPaid = inst.principal_paid !== undefined && inst.principal_paid !== null && inst.principal_paid !== ''
        ? parseFloat(inst.principal_paid)
        : null;

      let interestPaid = 0;
      let principalPaid = 0;

      const isExplicitOverride = Boolean(inst.is_override) || (
        rawPrincipalPaid !== null && 
        rawPrincipalPaid > 0 && 
        (rawPrincipalPaid !== paid || unpaidInterestAccrued === 0)
      );

      if (isExplicitOverride) {
        principalPaid = Math.min(currentPrincipal, rawPrincipalPaid);
        interestPaid = Math.max(0, paid - principalPaid);
      } else {
        interestPaid = Math.min(paid, unpaidInterestAccrued);
        principalPaid = Math.max(0, paid - interestPaid);
      }

      earnedInterest += interestPaid;
      unpaidInterestAccrued = Math.max(0, Math.round((unpaidInterestAccrued - interestPaid) * 100) / 100);
      currentPrincipal = Math.max(0, Math.round((currentPrincipal - principalPaid - discount) * 100) / 100);

      if (unpaidInterestAccrued === 0 && currentPrincipal > 0) {
        const extVal = inst.extension_interest !== undefined && inst.extension_interest !== null && inst.extension_interest !== ''
          ? parseFloat(inst.extension_interest)
          : null;
        if (extVal !== null && !isNaN(extVal) && extVal > 0) {
          unpaidInterestAccrued = extVal;
        }
      }
    }

    return Math.round(earnedInterest * 100) / 100;
  }

  return 0;
}

export default function StatsOverview({ loans = [], isGlobalPrivacyOn = false }) {
  const totalPrincipal = loans.reduce((acc, l) => acc + (parseFloat(l.loan_amount) || 0), 0);
  
  // Total Interest ACTUALLY RECEIVED so far (from installment payments & settled loans)
  const totalReceivedInterest = loans.reduce((acc, l) => acc + calculateEarnedInterest(l), 0);
  
  // Pending Interest (from active & partial loans)
  const pendingLoans = loans.filter(l => l.status === 'active' || l.status === 'partial');
  const totalPendingInterest = pendingLoans.reduce((acc, l) => acc + (parseFloat(l.interest_amount) || 0), 0);

  const totalBalanceDue = loans.reduce((acc, l) => acc + (parseFloat(l.balance_due) || 0), 0);
  const totalActivePrincipal = pendingLoans.reduce((acc, l) => acc + (parseFloat(l.current_principal !== undefined && l.current_principal !== null ? l.current_principal : l.loan_amount) || 0), 0);
  
  const activeCount = pendingLoans.length;
  const receivedCount = loans.filter(l => l.status === 'received').length;
  const highValueCount = loans.filter(l => l.requires_collateral || parseFloat(l.loan_amount) >= 30000).length;
  const pledgedCollaterals = loans.reduce((acc, l) => acc + (l.collaterals?.length || 0), 0);

  const formatCurrency = (val) => {
    if (isGlobalPrivacyOn) return '₹ •••••';
    const num = Number(val || 0);
    const hasDecimals = num % 1 !== 0;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem'
    }}>
      
      {/* Total Principal Disbursed */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Disbursed</span>
          <div className="stat-icon-float" style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <DollarSign size={18} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {formatCurrency(totalPrincipal)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Across {loans.length} total loan entries
        </div>
      </div>

      {/* Total Received Interest (Earned Profit) */}
      <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(34, 197, 94, 0.25)', boxShadow: '0 0 20px rgba(34, 197, 94, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Earned Interest</span>
          <div className="stat-icon-float" style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: '#00ff66' }}>
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00ff66' }}>
          {formatCurrency(totalReceivedInterest)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Realized profit from settlements & installments
        </div>
      </div>

      {/* Balance Due (Outstanding) */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Outstanding Due</span>
          <div className="stat-icon-float" style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Receipt size={18} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
          {formatCurrency(totalBalanceDue)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {activeCount} active / partial (Prin: {formatCurrency(totalActivePrincipal)})
        </div>
      </div>

      {/* Loans >30k & Collateral Pledges */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>High Value (&gt;30k)</span>
          <div className="stat-icon-float" style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7' }}>
          {highValueCount} Loans
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {pledgedCollaterals} pledged collateral items
        </div>
      </div>

      {/* Completed / Received Loans */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Repaid Loans</span>
          <div className="stat-icon-float" style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
          {receivedCount} Settled
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Fully paid back entries
        </div>
      </div>

    </div>
  );
}
