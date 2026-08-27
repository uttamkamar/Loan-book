/**
 * Calculates interest amount, total amount, and balance due for a loan entry.
 * Initial Setup:
 * Interest = Loan Amount * (Interest Rate / 100)
 * Total Payable = Loan Amount + Interest Amount
 * Balance Due = Total Payable
 */
function calculateLoanTotals(loanAmount, interestRate, tenureStr, interestType = 'reducing') {
  const originalPrincipal = parseFloat(loanAmount) || 0;
  const rate = parseFloat(interestRate) || 0;
  
  const interestAmount = Math.round((originalPrincipal * (rate / 100)) * 100) / 100;
  const totalAmount = Math.round((originalPrincipal + interestAmount) * 100) / 100;
  
  return {
    originalPrincipal,
    activePrincipal: originalPrincipal,
    interestAmount,
    totalAmount,
    balanceDue: totalAmount
  };
}

/**
 * Re-evaluates loan state after installment payments.
 * Supports Reducing Balance (Diminishing Principal) and Flat Interest methods.
 * 
 * Reducing Balance Example:
 * Loan: 10,000 at 16%. Month 1 interest = 1,600. Total due = 11,600.
 * Installment: 6,000.
 * Interest paid = 1,600. Principal paid = 6,000 - 1,600 = 4,400.
 * Remaining Principal = 10,000 - 4,400 = 5,600.
 * Month 2 interest (16% of 5,600) = 896.
 * Balance due = 5,600 + 896 = 6,496.
 */
function replayLoanState(loan, installments = []) {
  if (!loan) {
    throw new Error('Associated loan record not found');
  }

  const origPrincipal = parseFloat(loan.loan_amount) || 0;
  const rate = parseFloat(loan.interest_rate) || 0;
  const isFlat = loan.interest_type === 'flat';

  let currentPrincipal = origPrincipal;
  let totalPaid = 0;
  let totalDiscount = 0;
  let totalInterestAccumulated = 0;
  let unpaidInterestAccrued = 0;

  if (isFlat) {
    const fixedInterest = Math.round((origPrincipal * (rate / 100)) * 100) / 100;
    const totalPayable = Math.round((origPrincipal + fixedInterest) * 100) / 100;

    totalPaid = (installments || []).reduce((acc, inst) => acc + (parseFloat(inst.amount_paid) || 0), 0);
    totalDiscount = (installments || []).reduce((acc, inst) => acc + (parseFloat(inst.discount_amount) || 0), 0);
    const balanceDue = Math.max(0, Math.round((totalPayable - totalPaid - totalDiscount) * 100) / 100);

    let newStatus = loan.status || 'active';
    if (loan.status === 'received' || loan.status === 'forfeited') {
      newStatus = loan.status;
    } else if (balanceDue <= 0) {
      newStatus = 'received';
    } else if (totalPaid > 0 || totalDiscount > 0) {
      newStatus = 'partial';
    }

    return {
      currentPrincipal: origPrincipal,
      interestAmount: fixedInterest,
      totalAmount: totalPayable,
      discountAmount: totalDiscount,
      balanceDue,
      status: newStatus
    };
  }

  // Reducing Balance (Diminishing Principal) Logic
  const sortedInsts = [...(installments || [])].sort((a, b) => {
    const dateA = new Date(a.payment_date || a.created_at || 0).getTime();
    const dateB = new Date(b.payment_date || b.created_at || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (a.installment_no || 0) - (b.installment_no || 0);
  });

  // Calculate cycle 1 initial interest on full principal
  let cycleInterest = Math.round((origPrincipal * (rate / 100)) * 100) / 100;
  unpaidInterestAccrued = cycleInterest;
  totalInterestAccumulated = cycleInterest;

  for (const inst of sortedInsts) {
    const paid = parseFloat(inst.amount_paid) || 0;
    const discount = parseFloat(inst.discount_amount) || 0;
    totalPaid += paid;
    totalDiscount += discount;

    let interestPaid = 0;
    let principalPaid = 0;

    const rawPrincipalPaid = inst.principal_paid !== undefined && inst.principal_paid !== null && inst.principal_paid !== ''
      ? parseFloat(inst.principal_paid)
      : null;

    // An installment is only an explicit override if flagged as such, or if explicitly different from full paid amount when interest is accrued
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

    unpaidInterestAccrued = Math.max(0, Math.round((unpaidInterestAccrued - interestPaid) * 100) / 100);
    currentPrincipal = Math.max(0, Math.round((currentPrincipal - principalPaid - discount) * 100) / 100);
  }

  let totalUnpaidInterest = 0;
  let activeCycleInterest = 0;

  if (unpaidInterestAccrued > 0) {
    totalUnpaidInterest = unpaidInterestAccrued;
    activeCycleInterest = unpaidInterestAccrued;
  } else if (currentPrincipal > 0) {
    activeCycleInterest = Math.round((currentPrincipal * (rate / 100)) * 100) / 100;
    totalUnpaidInterest = activeCycleInterest;
  }

  const balanceDue = currentPrincipal > 0 
    ? Math.round((currentPrincipal + totalUnpaidInterest) * 100) / 100
    : 0;

  const totalPayable = Math.round((totalPaid + balanceDue) * 100) / 100;

  let newStatus = loan.status || 'active';
  if (loan.status === 'received' || loan.status === 'forfeited') {
    newStatus = loan.status;
  } else if (balanceDue <= 0) {
    newStatus = 'received';
  } else if (totalPaid > 0 || totalDiscount > 0) {
    newStatus = 'partial';
  }

  // If totalPaid is 0 but loan is marked as received (e.g. initial seed data), infer paid amount from total_amount
  const effectivePaid = (newStatus === 'received' && totalPaid === 0) 
    ? Math.max(0, (parseFloat(loan.total_amount) || 0) - (parseFloat(loan.discount_amount) || 0))
    : totalPaid;

  const realizedInterest = Math.max(0, Math.round((effectivePaid - origPrincipal) * 100) / 100);

  const displayInterest = (newStatus === 'received' || balanceDue <= 0)
    ? (realizedInterest || initialInterest || activeCycleInterest)
    : activeCycleInterest;

  return {
    currentPrincipal,
    interestAmount: displayInterest,
    totalAmount: totalPayable,
    discountAmount: totalDiscount,
    balanceDue,
    status: newStatus
  };
}

module.exports = {
  calculateLoanTotals,
  replayLoanState
};
