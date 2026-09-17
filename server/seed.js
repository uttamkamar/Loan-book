const { initDatabase, query } = require('./config/db');

async function seedData(options = {}) {
  const { force = false } = options;

  console.log('Initializing database connection for seeding...');
  await initDatabase();

  const [existing] = await query(`SELECT COUNT(*) as count FROM loans`);
  const count = existing[0]?.count || existing[0]?.['COUNT(*)'] || 0;

  if (count > 0 && !force) {
    console.error(`\n❌ SEED ABORTED: The database already contains ${count} loan record(s).`);
    console.error(`   Seeding is refused to protect existing real data.`);
    console.error(`   To seed sample data anyway without overwriting existing data, run with --force:\n`);
    console.error(`   npm run seed -- --force\n`);
    process.exit(1);
  }

  console.log('\n🌱 Explicitly seeding sample/demo loan data...');

  const sampleLoans = [
    {
      loan_taker: 'Bubai Da Wife [DEMO]',
      loan_amount: 6000,
      payment_mode: 'Gpay',
      interest_rate: 10,
      interest_tenure: '/week',
      date_given: '2026-07-30',
      return_date: '3-7 Aug 2026',
      interest_amount: 600,
      total_amount: 6600,
      balance_due: 0,
      status: 'received',
      remark: 'Completed loan [SAMPLE DATA]',
      requires_collateral: 0
    },
    {
      loan_taker: 'Bubai Da Wife [DEMO]',
      loan_amount: 10000,
      payment_mode: 'Gpay',
      interest_rate: 16,
      interest_tenure: '/Month',
      date_given: '2026-07-30',
      return_date: '31-Aug 2026',
      interest_amount: 1600,
      total_amount: 11600,
      balance_due: 9600,
      status: 'active',
      remark: '2000/- paid on 8.8.26 [SAMPLE DATA]',
      requires_collateral: 0
    },
    {
      loan_taker: 'Bubai Da Wife [DEMO]',
      loan_amount: 16000,
      payment_mode: 'Gpay',
      interest_rate: 8.80,
      interest_tenure: 'for 3days',
      date_given: '2026-08-04',
      return_date: '7th Aug 2026',
      interest_amount: 1408,
      total_amount: 17408,
      balance_due: 0,
      status: 'received',
      remark: 'If return date exid then take 10% interest [SAMPLE DATA]',
      requires_collateral: 0
    },
    {
      loan_taker: 'Bubai Da Wife [DEMO]',
      loan_amount: 5000,
      payment_mode: 'Gpay',
      interest_rate: 8,
      interest_tenure: 'For 1 day',
      date_given: '2026-08-06',
      return_date: '8th Aug 2026',
      interest_amount: 400,
      total_amount: 5400,
      balance_due: 0,
      status: 'received',
      remark: 'Returned on time [SAMPLE DATA]',
      requires_collateral: 0
    },
    {
      loan_taker: 'Bubai Da Wife [DEMO]',
      loan_amount: 4000,
      payment_mode: 'Gpay',
      interest_rate: 8,
      interest_tenure: 'for 12 hours',
      date_given: '2026-08-07',
      return_date: '7th Aug 2026',
      interest_amount: 320,
      total_amount: 4320,
      balance_due: 0,
      status: 'received',
      remark: 'Quick short loan [SAMPLE DATA]',
      requires_collateral: 0
    },
    {
      loan_taker: 'Vikram Singh [DEMO]',
      loan_amount: 45000,
      payment_mode: 'Bank Transfer',
      interest_rate: 5,
      interest_tenure: '/Month',
      date_given: '2026-08-08',
      return_date: '08-Sep-2026',
      interest_amount: 2250,
      total_amount: 47250,
      balance_due: 47250,
      status: 'active',
      remark: 'High value loan with security gold jewelry pledged [SAMPLE DATA]',
      requires_collateral: 1
    }
  ];

  let insertedCount = 0;
  for (let loan of sampleLoans) {
    const [res] = await query(`
      INSERT INTO loans (loan_taker, loan_amount, payment_mode, interest_rate, interest_tenure, date_given, return_date, interest_amount, total_amount, balance_due, status, remark, requires_collateral)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      loan.loan_taker, loan.loan_amount, loan.payment_mode, loan.interest_rate,
      loan.interest_tenure, loan.date_given, loan.return_date, loan.interest_amount,
      loan.total_amount, loan.balance_due, loan.status, loan.remark, loan.requires_collateral
    ]);

    const loanId = res.insertId;
    insertedCount++;

    if (loan.loan_amount === 10000) {
      await query(`
        INSERT INTO installments (loan_id, installment_no, payment_date, amount_paid, payment_mode, remaining_balance, remark)
        VALUES (?, 1, '2026-08-08', 2000, 'Gpay', 9600, 'First installment paid [SAMPLE DATA]')
      `, [loanId]);
    }

    if (loan.loan_amount === 45000) {
      await query(`
        INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, status, notes)
        VALUES (?, 'Gold Necklace & Ring (22K, 25g) [DEMO]', 'Handed over by borrower as security collateral. Valued at ~75,000 INR. [SAMPLE DATA]', 75000, 'pledged', 'Stored safely in locker #4')
      `, [loanId]);
    }
  }

  console.log(`✅ Successfully seeded ${insertedCount} demo loan records!\n`);
  return insertedCount;
}

// Run CLI if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  seedData({ force })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seeding error:', err.message);
      process.exit(1);
    });
}

module.exports = { seedData };
