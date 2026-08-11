import React from 'react';
import { DollarSign, TrendingUp, ShieldCheck, CheckCircle2, Receipt } from 'lucide-react';

export default function StatsOverview({ loans = [], isGlobalPrivacyOn = false }) {
  const totalPrincipal = loans.reduce((acc, l) => acc + (parseFloat(l.loan_amount) || 0), 0);
  
  // Total Interest RECEIVED (only from settled / received loans)
  const receivedLoans = loans.filter(l => l.status === 'received');
  const totalReceivedInterest = receivedLoans.reduce((acc, l) => acc + (parseFloat(l.interest_amount) || 0), 0);
  
  // Pending Interest (from active & partial loans)
  const pendingLoans = loans.filter(l => l.status === 'active' || l.status === 'partial');
  const totalPendingInterest = pendingLoans.reduce((acc, l) => acc + (parseFloat(l.interest_amount) || 0), 0);

  const totalBalanceDue = loans.reduce((acc, l) => acc + (parseFloat(l.balance_due) || 0), 0);
  
  const activeCount = pendingLoans.length;
  const receivedCount = receivedLoans.length;
  const highValueCount = loans.filter(l => l.requires_collateral || l.loan_amount > 30000).length;
  const pledgedCollaterals = loans.reduce((acc, l) => acc + (l.collaterals?.length || 0), 0);

  const formatCurrency = (val) => {
    if (isGlobalPrivacyOn) return '₹ •••••';
    return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
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
          Realized profit from completed loans ({receivedCount})
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
          {activeCount} active / partial loans
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
