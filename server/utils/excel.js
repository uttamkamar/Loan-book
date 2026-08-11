const XLSX = require('xlsx');

/**
 * Parses an uploaded Excel buffer into loan records
 */
function parseExcelLoans(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const loans = [];

  for (let row of rawRows) {
    // Map Excel header names (flexibly handling spacing / case)
    const getVal = (possibleKeys) => {
      for (let k of Object.keys(row)) {
        const cleanK = k.trim().toLowerCase();
        if (possibleKeys.some(pk => cleanK.includes(pk.toLowerCase()))) {
          return row[k];
        }
      }
      return '';
    };

    const loanTaker = getVal(['loan taker', 'taker', 'name', 'borrower']);
    const guarantorName = getVal(['guarantor name', 'guarantor', 'g name']);
    const loanAmount = parseFloat(getVal(['loan amount', 'amount'])) || 0;

    if (!loanTaker || loanAmount <= 0) continue; // Skip empty rows

    const dateGivenRaw = getVal(['date', 'date given']);
    const dateGiven = dateGivenRaw instanceof Date 
      ? dateGivenRaw.toISOString().split('T')[0] 
      : (typeof dateGivenRaw === 'string' && dateGivenRaw ? dateGivenRaw : new Date().toISOString().split('T')[0]);

    const paymentMode = getVal(['payment mode', 'mode']) || 'Gpay';
    const interestRateStr = String(getVal(['interest rate', 'rate'])).replace('%', '').trim();
    const interestRate = parseFloat(interestRateStr) || 0;
    const interestTenure = getVal(['interest tenure', 'tenure']) || '/Month';
    const returnDate = getVal(['return date', 'return']) || '';
    const interestAmount = parseFloat(getVal(['interest amount'])) || (loanAmount * (interestRate / 100));
    const totalAmount = parseFloat(getVal(['total'])) || (loanAmount + interestAmount);
    const installmentNotes = getVal(['installment payment', 'installment', 'first', 'second']);
    const remark = getVal(['remark', 'note']);
    const statusRaw = String(getVal(['status'])).trim().toLowerCase();
    
    let status = 'active';
    if (statusRaw.includes('received') || statusRaw.includes('paid') || statusRaw.includes('done')) {
      status = 'received';
    } else if (statusRaw.includes('overdue')) {
      status = 'overdue';
    } else if (statusRaw.includes('forfeited')) {
      status = 'forfeited';
    }

    loans.push({
      loan_taker: loanTaker,
      guarantor_name: guarantorName || '',
      loan_amount: loanAmount,
      payment_mode: paymentMode,
      interest_rate: interestRate,
      interest_tenure: interestTenure,
      date_given: dateGiven,
      return_date: returnDate,
      interest_amount: interestAmount,
      total_amount: totalAmount,
      balance_due: status === 'received' ? 0 : (installmentNotes ? Math.max(0, totalAmount - 2000) : totalAmount),
      status: status,
      remark: remark ? (installmentNotes ? `${remark} | Payment: ${installmentNotes}` : remark) : (installmentNotes || ''),
      requires_collateral: loanAmount > 30000 ? 1 : 0
    });
  }

  return loans;
}

/**
 * Exports loan array into Excel file buffer
 */
function generateLoansExcel(loans) {
  const exportData = loans.map(loan => ({
    'Date': loan.date_given,
    'Loan Taker': loan.loan_taker,
    'Guarantor Name': loan.guarantor_name || '-',
    'Original Loan Amount': loan.loan_amount,
    'Active Principal Balance': loan.current_principal !== undefined && loan.current_principal !== null ? loan.current_principal : loan.loan_amount,
    'Payment Mode': loan.payment_mode,
    'Interest Rate (%)': loan.interest_rate,
    'Interest Tenure': loan.interest_tenure,
    'Interest Method': loan.interest_type ? loan.interest_type.toUpperCase() : 'REDUCING',
    'Return Date': loan.return_date || '-',
    'Current Period Interest': loan.interest_amount,
    'Total Amount Payable': loan.total_amount,
    'Balance Due': loan.balance_due,
    'Status': loan.status.toUpperCase(),
    'Remarks': loan.remark || '',
    'Collateral Pledged (>30k)': loan.requires_collateral ? 'YES' : 'NO'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loans Ledger');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseExcelLoans,
  generateLoansExcel
};
