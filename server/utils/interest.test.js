const assert = require('assert');
const { calculateLoanTotals, replayLoanState } = require('./interest');

console.log('Running interest calculation unit tests...');

// Test Vector 1: Initial Loan Totals calculation
(function testCalculateLoanTotals() {
  const result = calculateLoanTotals(10000, 16, '/Month', 'reducing');
  assert.strictEqual(result.originalPrincipal, 10000);
  assert.strictEqual(result.activePrincipal, 10000);
  assert.strictEqual(result.interestAmount, 1600);
  assert.strictEqual(result.totalAmount, 11600);
  assert.strictEqual(result.balanceDue, 11600);
  console.log('✓ testCalculateLoanTotals passed');
})();

// Test Vector 2: Replay Loan State - Flat Interest
(function testReplayLoanStateFlat() {
  const loan = {
    loan_amount: 10000,
    interest_rate: 10,
    interest_type: 'flat',
    status: 'active'
  };
  const installments = [
    { amount_paid: 5000, discount_amount: 0 },
    { amount_paid: 6000, discount_amount: 0 }
  ];
  const state = replayLoanState(loan, installments);
  assert.strictEqual(state.interestAmount, 1000);
  assert.strictEqual(state.totalAmount, 11000);
  assert.strictEqual(state.balanceDue, 0);
  assert.strictEqual(state.status, 'received');
  console.log('✓ testReplayLoanStateFlat passed');
})();

// Test Vector 3: Replay Loan State - Reducing Balance
(function testReplayLoanStateReducing() {
  const loan = {
    loan_amount: 10000,
    interest_rate: 16,
    interest_type: 'reducing',
    status: 'active'
  };
  const installments = [
    { installment_no: 1, amount_paid: 2000, discount_amount: 0, payment_date: '2026-08-08' }
  ];
  const state = replayLoanState(loan, installments);
  // Initial interest: 1600. Paid: 2000 => Interest paid 1600, Principal paid 400.
  // Remaining Principal: 9600.
  assert.strictEqual(state.currentPrincipal, 9600);
  assert.strictEqual(state.status, 'partial');
  assert.strictEqual(state.balanceDue, 9600);
  console.log('✓ testReplayLoanStateReducing passed');
})();

// Test Vector 4: Multi-cycle Tenure Extension (Rekha Boudi case: 12k loan, 8% rate)
(function testReplayLoanStateMultiExtension() {
  const loan = {
    loan_amount: 12000,
    interest_rate: 8,
    interest_type: 'reducing',
    status: 'active'
  };
  const installments = [
    { installment_no: 1, amount_paid: 960, extension_interest: 960, extension_tenure: '7days', payment_date: '2026-08-31' },
    { installment_no: 2, amount_paid: 6960, extension_interest: 480, extension_tenure: '7days', payment_date: '2026-09-08' }
  ];
  const state = replayLoanState(loan, installments);
  // Inst 1: clears 960 cycle 1 interest, leaves 12,000 principal. Accrues 960 for cycle 2.
  // Inst 2: clears 960 cycle 2 interest, pays 6000 principal => Remaining principal = 6000. Accrues 480 for cycle 3.
  // Remaining Balance Due: 6000 + 480 = 6480. Total Payable = 7920 + 6480 = 14400.
  assert.strictEqual(state.currentPrincipal, 6000);
  assert.strictEqual(state.balanceDue, 6480);
  assert.strictEqual(state.totalAmount, 14400);
  assert.strictEqual(state.status, 'partial');
  console.log('✓ testReplayLoanStateMultiExtension passed');
})();

// Test Vector 5: Penalty Charged (10k loan at 16%, paid 2000 with 400 penalty)
(function testReplayLoanStatePenalty() {
  const loan = {
    loan_amount: 10000,
    interest_rate: 16,
    interest_type: 'reducing',
    status: 'active'
  };
  const installments = [
    { installment_no: 1, amount_paid: 2000, penalty_amount: 400, discount_amount: 0, payment_date: '2026-08-08' }
  ];
  const state = replayLoanState(loan, installments);
  // Initial interest: 1600. Paid: 2000. Penalty: 400.
  // 1600 clears interest, remaining 400 clears penalty fee, 0 clears principal.
  // Remaining Principal: 10000.
  assert.strictEqual(state.currentPrincipal, 10000);
  assert.strictEqual(state.status, 'partial');
  assert.strictEqual(state.balanceDue, 10000);
  console.log('✓ testReplayLoanStatePenalty passed');
})();

// Test Vector 6: User Scenario 1 & 2 (10k loan at 8% for 7 days, 2% penalty=200, paid 1000, extended 7 days)
(function testUserScenario1And2() {
  const loan = {
    loan_amount: 10000,
    interest_rate: 8,
    interest_type: 'reducing',
    status: 'active'
  };
  const installments = [
    { installment_no: 1, amount_paid: 1000, penalty_amount: 200, extension_tenure: '7days', payment_date: '2026-08-31' }
  ];
  const state = replayLoanState(loan, installments);
  // Initial interest: 800. Penalty: 200. Paid: 1000 => 800 clears interest, 200 clears penalty fee, 0 clears principal.
  // Remaining Principal = 10000. Next cycle interest (8% of 10000) = 800.
  // Next time balance due = 10000 + 800 = 10800.
  assert.strictEqual(state.currentPrincipal, 10000);
  assert.strictEqual(state.balanceDue, 10800);
  assert.strictEqual(state.status, 'partial');
  console.log('✓ testUserScenario1And2 passed');
})();

// Test Vector 7: Rinku 2-Month Loan Case (15k loan at 28% for 2 months, paid 2250 with 150 penalty)
(function testRinkuLoanPenaltyCase() {
  const loan = {
    loan_amount: 15000,
    interest_rate: 28,
    interest_type: 'reducing',
    status: 'active'
  };
  const installments = [
    { installment_no: 1, amount_paid: 2250, penalty_amount: 150, payment_date: '2026-09-12' }
  ];
  const state = replayLoanState(loan, installments);
  // Initial interest for 2 months: 4200 (2100/mo). Paid 2250 with 150 penalty fee.
  // 150 clears penalty fee, 2100 clears month 1 interest, 0 clears principal.
  // Remaining Principal: 15000. Month 2 Interest remaining: 2100.
  // Display Interest: 2100. Balance Due: 17100. Total Payable: 19350.
  assert.strictEqual(state.currentPrincipal, 15000);
  assert.strictEqual(state.interestAmount, 2100);
  assert.strictEqual(state.balanceDue, 17100);
  assert.strictEqual(state.totalAmount, 19350);
  assert.strictEqual(state.status, 'partial');
  console.log('✓ testRinkuLoanPenaltyCase passed');
})();

console.log('All financial interest unit tests passed successfully!');
