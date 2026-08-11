/**
 * Calculates interest amount, total amount, and balance due for a loan entry.
 * Simple Flat & Clean Accounting:
 * Interest = Loan Amount * (Interest Rate / 100)
 * Total Payable = Loan Amount + Interest Amount
 * Balance Due = Total Payable - Total Paid
 */
function calculateLoanTotals(loanAmount, interestRate, tenureStr) {
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
 * 
 * Example:
 * Loan Amount: 10,000. Rate: 16%. 
 * Interest = 1,600. Total Payable = 11,600.
 * Payment #1: 2,000.
 * Balance Due = 11,600 - 2,000 = 9,600.
 */
function replayLoanState(loan, installments = []) {
  if (!loan) {
    throw new Error('Associated loan record not found');
  }

  const origPrincipal = parseFloat(loan.loan_amount) || 0;
  const rate = parseFloat(loan.interest_rate) || 0;
  
  // Clean fixed calculations
  const totalInterest = Math.round((origPrincipal * (rate / 100)) * 100) / 100;
  const totalPayable = Math.round((origPrincipal + totalInterest) * 100) / 100;

  const totalPaid = (installments || []).reduce((acc, inst) => acc + (parseFloat(inst.amount_paid) || 0), 0);
  const balanceDue = Math.max(0, Math.round((totalPayable - totalPaid) * 100) / 100);

  let newStatus = loan.status || 'active';
  // Preserve explicit user manual statuses ('received', 'forfeited')
  if (loan.status === 'received' || loan.status === 'forfeited') {
    newStatus = loan.status;
  } else if (balanceDue <= 0) {
    newStatus = 'received';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  }

  return {
    currentPrincipal: origPrincipal,
    interestAmount: totalInterest,
    totalAmount: totalPayable,
    balanceDue,
    status: newStatus
  };
}

module.exports = {
  calculateLoanTotals,
  replayLoanState
};
