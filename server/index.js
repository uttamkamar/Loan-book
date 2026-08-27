const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDatabase, query, getDbType } = require('./config/db');
const upload = require('./middleware/upload');
const { calculateLoanTotals, replayLoanState } = require('./utils/interest');
const { parseExcelLoans, generateLoansExcel } = require('./utils/excel');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to sanitize error messages so sensitive secrets, connection strings, or credentials never leak to API responses or logs
function sanitizeError(err) {
  if (!err) return 'An unexpected error occurred';
  const raw = typeof err === 'string' ? err : (err.message || String(err));
  return raw
    .replace(/(password|secret|token|key|auth|bearer)=[^&\s]+/gi, '$1=****')
    .replace(/(mysql|postgres|mongodb|sqlite|redis):\/\/([^:]+):([^@]+)@/gi, '$1://$2:****@')
    .replace(/Access denied for user '[^']+'@'[^']+'/gi, 'Access denied for database user');
}

// Conditional upload middleware (only runs multer when request is multipart/form-data)
const handleUploadOrJson = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.any()(req, res, next);
  } else {
    next();
  }
};

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend build static files if present
const clientBuildPath = path.join(__dirname, '../dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// ----------------------------------------------------
// DATABASE INITIALIZATION & SEEDING
// ----------------------------------------------------
async function cleanOrphanedRecords() {
  try {
    await query(`DELETE FROM installments WHERE loan_id NOT IN (SELECT id FROM loans)`);
    await query(`DELETE FROM collateral_items WHERE loan_id NOT IN (SELECT id FROM loans)`);
    await query(`DELETE FROM documents WHERE loan_id NOT IN (SELECT id FROM loans)`);

    // Normalize all existing loan ledger records (clear un-overridden legacy principal_paid values equal to amount_paid)
    await query(`UPDATE installments SET principal_paid = NULL WHERE principal_paid = amount_paid`);

    const [allLoans] = await query(`SELECT * FROM loans`);
    for (let loan of (allLoans || [])) {
      const [insts] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loan.id]);
      const state = replayLoanState(loan, insts || []);
      await query(`
        UPDATE loans
        SET interest_amount = ?, total_amount = ?, balance_due = ?, current_principal = ?, status = ?
        WHERE id = ?
      `, [state.interestAmount, state.totalAmount, state.balanceDue, state.currentPrincipal, state.status, loan.id]);
    }
  } catch (e) {
    console.error('Clean error:', e);
  }
}

async function seedInitialData() {
  const [existing] = await query(`SELECT COUNT(*) as count FROM loans`);
  const count = existing[0]?.count || existing[0]?.['COUNT(*)'] || 0;

  if (count === 0) {
    console.log('Seeding initial sample loan data from Excel ledger...');
    const sampleLoans = [
      {
        loan_taker: 'Bubai Da Wife',
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
        remark: 'Completed loan',
        requires_collateral: 0
      },
      {
        loan_taker: 'Bubai Da Wife',
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
        remark: '2000/- paid on 8.8.26',
        requires_collateral: 0
      },
      {
        loan_taker: 'Bubai Da Wife',
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
        remark: 'If return date exid then take 10% interest',
        requires_collateral: 0
      },
      {
        loan_taker: 'Bubai Da Wife',
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
        remark: 'Returned on time',
        requires_collateral: 0
      },
      {
        loan_taker: 'Bubai Da Wife',
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
        remark: 'Quick short loan',
        requires_collateral: 0
      },
      {
        loan_taker: 'Vikram Singh',
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
        remark: 'High value loan with security gold jewelry pledged',
        requires_collateral: 1
      }
    ];

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

      // Seed installment for Bubai Da Wife 10000 loan
      if (loan.loan_amount === 10000) {
        await query(`
          INSERT INTO installments (loan_id, installment_no, payment_date, amount_paid, payment_mode, remaining_balance, remark)
          VALUES (?, 1, '2026-08-08', 2000, 'Gpay', 9600, 'First installment paid')
        `, [loanId]);
      }

      // Seed collateral item for >30k loan
      if (loan.loan_amount === 45000) {
        await query(`
          INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, status, notes)
          VALUES (?, 'Gold Necklace & Ring (22K, 25g)', 'Handed over by borrower as security collateral under >30k rule. Valued at ~75,000 INR.', 75000, 'pledged', 'Stored safely in locker #4')
        `, [loanId]);
      }
    }
    console.log('Sample data successfully seeded!');
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// System Health & DB Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    dbType: getDbType(),
    timestamp: new Date().toISOString()
  });
});

// GET all loans (Optimized with 4-Query Batch Pre-fetching - Solves N+1 Query Bottleneck)
app.get('/api/loans', async (req, res) => {
  try {
    const [loans] = await query(`SELECT * FROM loans ORDER BY id DESC`);
    if (!loans || loans.length === 0) return res.json([]);

    const [allInstallments] = await query(`SELECT * FROM installments ORDER BY loan_id ASC, installment_no ASC`);
    const [allCollaterals] = await query(`SELECT * FROM collateral_items ORDER BY loan_id ASC, id ASC`);
    const [allDocuments] = await query(`SELECT * FROM documents ORDER BY loan_id ASC, id ASC`);

    // Build O(1) in-memory lookup maps for instant relation assembly
    const installmentsMap = {};
    for (let inst of (allInstallments || [])) {
      if (!installmentsMap[inst.loan_id]) installmentsMap[inst.loan_id] = [];
      installmentsMap[inst.loan_id].push(inst);
    }

    const collateralsMap = {};
    for (let col of (allCollaterals || [])) {
      if (!collateralsMap[col.loan_id]) collateralsMap[col.loan_id] = [];
      collateralsMap[col.loan_id].push(col);
    }

    const documentsMap = {};
    for (let doc of (allDocuments || [])) {
      if (!documentsMap[doc.loan_id]) documentsMap[doc.loan_id] = [];
      documentsMap[doc.loan_id].push(doc);
    }

    const populatedLoans = loans.map((loan) => {
      const installments = installmentsMap[loan.id] || [];
      const collaterals = collateralsMap[loan.id] || [];
      const documents = documentsMap[loan.id] || [];

      const state = replayLoanState(loan, installments);

      return {
        ...loan,
        interest_amount: state.interestAmount,
        total_amount: state.totalAmount,
        discount_amount: state.discountAmount,
        balance_due: state.balanceDue,
        current_principal: state.currentPrincipal,
        status: state.status,
        installments,
        collaterals,
        documents
      };
    });

    res.json(populatedLoans);
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ error: 'Failed to fetch loan records', details: err.message });
  }
});

// GET single loan by ID
app.get('/api/loans/:id', async (req, res) => {
  try {
    const [rows] = await query(`SELECT * FROM loans WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });

    const loan = rows[0];
    const [installments] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loan.id]);
    const [collaterals] = await query(`SELECT * FROM collateral_items WHERE loan_id = ?`, [loan.id]);
    const [documents] = await query(`SELECT * FROM documents WHERE loan_id = ?`, [loan.id]);

    const state = replayLoanState(loan, installments || []);

    res.json({
      ...loan,
      interest_amount: state.interestAmount,
      total_amount: state.totalAmount,
      discount_amount: state.discountAmount,
      balance_due: state.balanceDue,
      current_principal: state.currentPrincipal,
      status: state.status,
      installments: installments || [],
      collaterals: collaterals || [],
      documents: documents || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new loan with file uploads (Documents & Collateral Photo)
app.post('/api/loans', handleUploadOrJson, async (req, res) => {
  try {
    const body = req.body || {};
    const {
      loan_taker,
      guarantor_name,
      loan_amount,
      payment_mode,
      interest_rate,
      interest_tenure,
      interest_type,
      date_given,
      return_date,
      remark,
      collateral_item_name,
      collateral_description,
      collateral_estimated_value
    } = body;

    const amount = parseFloat(loan_amount) || 0;
    const rate = parseFloat(interest_rate) || 0;
    const type = interest_type || 'reducing';
    const requiresCollateral = body.requires_collateral !== undefined 
      ? (parseInt(body.requires_collateral, 10) || body.requires_collateral === '1' || body.requires_collateral === true ? 1 : 0) 
      : (amount >= 30000 ? 1 : 0);

    const { interestAmount, totalAmount, balanceDue } = calculateLoanTotals(amount, rate, interest_tenure, type, amount);

    const [result] = await query(`
      INSERT INTO loans (loan_taker, guarantor_name, loan_amount, current_principal, payment_mode, interest_rate, interest_tenure, interest_type, date_given, return_date, interest_amount, total_amount, balance_due, status, remark, requires_collateral)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [
      loan_taker || 'Unknown Borrower', guarantor_name || null, amount, amount, payment_mode || 'Gpay', rate,
      interest_tenure || '/Month', type, date_given || new Date().toISOString().split('T')[0],
      return_date || '', interestAmount, totalAmount, balanceDue, remark || '', requiresCollateral
    ]);

    const loanId = result.insertId;

    const allFiles = req.files || [];

    // Handle Payment Proof for Initial Loan Disbursement
    const proofFile = allFiles.find(f => f.fieldname === 'payment_proof' || f.fieldname === 'proof_file' || f.fieldname === 'proof');
    if (proofFile) {
      const proofPath = '/uploads/documents/' + proofFile.filename;
      await query(`UPDATE loans SET proof_path = ? WHERE id = ?`, [proofPath, loanId]);
    }

    // Handle Multiple Paperwork Document Uploads (up to 5)
    const docFiles = allFiles.filter(f => f.fieldname === 'document_files' || f.fieldname === 'document_file');
    for (let docFile of docFiles.slice(0, 5)) {
      const relPath = '/uploads/documents/' + docFile.filename;
      await query(`
        INSERT INTO documents (loan_id, document_name, file_path, original_filename)
        VALUES (?, ?, ?, ?)
      `, [loanId, docFile.originalname, relPath, docFile.originalname]);
    }

    // Handle Multiple Collateral Pledged Photos (up to 10)
    const collateralPhotos = allFiles.filter(f => f.fieldname === 'collateral_photos' || f.fieldname === 'collateral_photo' || f.fieldname === 'photo' || f.fieldname === 'photos');
    if (collateralPhotos.length > 0) {
      for (let i = 0; i < Math.min(collateralPhotos.length, 10); i++) {
        const photo = collateralPhotos[i];
        const photoPath = '/uploads/collateral/' + photo.filename;
        const itemName = collateral_item_name 
          ? (collateralPhotos.length > 1 ? `${collateral_item_name} (Photo ${i + 1})` : collateral_item_name)
          : `Security Pledged Item ${i + 1}`;

        await query(`
          INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, photo_path, status, notes)
          VALUES (?, ?, ?, ?, ?, 'pledged', ?)
        `, [
          loanId,
          itemName,
          collateral_description || 'Handed over by borrower for loan security',
          parseFloat(collateral_estimated_value) || amount,
          photoPath,
          'Pledged at loan issuance'
        ]);
      }
    } else if (requiresCollateral || collateral_item_name) {
      await query(`
        INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, photo_path, status, notes)
        VALUES (?, ?, ?, ?, ?, 'pledged', ?)
      `, [
        loanId,
        collateral_item_name || 'Security Pledged Collateral Item',
        collateral_description || 'Handed over by borrower for loan security >30k',
        parseFloat(collateral_estimated_value) || amount,
        null,
        'Pledged at loan issuance'
      ]);
    }

    res.status(201).json({ message: 'Loan created successfully', loanId });
  } catch (err) {
    console.error('Error creating loan:', err);
    res.status(500).json({ error: err.message || 'Failed to create loan' });
  }
});

// ADD Installment Payment with Optional Tenure Extension Interest & Payment Proof
app.post('/api/loans/:id/installments', handleUploadOrJson, async (req, res) => {
  try {
    const loanId = req.params.id;
    const body = req.body || {};
    const { amount_paid, principal_paid_override, discount_amount, payment_date, payment_mode, remark, extension_interest_add, extension_tenure } = body;

    const [loans] = await query(`SELECT * FROM loans WHERE id = ?`, [loanId]);
    if (!loans || !loans.length) return res.status(404).json({ error: 'Loan not found' });

    let loan = loans[0];
    const [existingInsts] = await query(`SELECT * FROM installments WHERE loan_id = ?`, [loanId]);
    
    const installmentNo = (existingInsts.length || 0) + 1;
    const paidAmount = parseFloat(amount_paid) || 0;
    const discountVal = parseFloat(discount_amount) || 0;
    const principalPaid = principal_paid_override !== undefined && principal_paid_override !== null && principal_paid_override !== '' 
      ? parseFloat(principal_paid_override) 
      : null;

    // Check if payment proof image file was uploaded
    const allFiles = req.files || [];
    const proofFile = allFiles.find(f => f.fieldname === 'payment_proof' || f.fieldname === 'proof_file' || f.fieldname === 'proof') || (req.file && (req.file.fieldname === 'payment_proof' || req.file.fieldname === 'proof_file' || req.file.fieldname === 'proof') ? req.file : null);
    const proofPath = proofFile ? '/uploads/documents/' + proofFile.filename : null;

    // Record Installment Entry
    await query(`
      INSERT INTO installments (loan_id, installment_no, payment_date, amount_paid, principal_paid, interest_paid, discount_amount, payment_mode, remaining_balance, proof_path, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      loanId, 
      installmentNo, 
      payment_date || new Date().toISOString().split('T')[0], 
      paidAmount,
      principalPaid,
      Math.max(0, paidAmount - principalPaid),
      discountVal,
      payment_mode || 'Gpay', 
      0, 
      proofPath,
      remark || `Installment #${installmentNo}`
    ]);

    // Handle Extension Interest Addition if borrower requests more time
    if (extension_interest_add && parseFloat(extension_interest_add) > 0) {
      const extraInterest = parseFloat(extension_interest_add);
      const updatedInterestTotal = Math.round(((parseFloat(loan.interest_amount) || 0) + extraInterest) * 100) / 100;
      const updatedTenure = extension_tenure || loan.interest_tenure;

      await query(`
        UPDATE loans
        SET interest_amount = ?, interest_tenure = ?
        WHERE id = ?
      `, [updatedInterestTotal, updatedTenure, loanId]);

      loan.interest_amount = updatedInterestTotal;
      loan.interest_tenure = updatedTenure;
    }

    // Replay state across all installments
    const [allInsts] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loanId]);
    const updatedState = replayLoanState(loan, allInsts);

    await query(`
      UPDATE loans
      SET current_principal = ?, interest_amount = ?, total_amount = ?, discount_amount = ?, balance_due = ?, status = ?
      WHERE id = ?
    `, [updatedState.currentPrincipal, updatedState.interestAmount, updatedState.totalAmount, updatedState.discountAmount, updatedState.balanceDue, updatedState.status, loanId]);

    res.json({ 
      message: 'Installment recorded & loan ledger recalculated!', 
      remainingBalance: updatedState.balanceDue, 
      status: updatedState.status 
    });
  } catch (err) {
    console.error('Error adding installment:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE Installment Payment (Fix mistakes & update proof)
app.put('/api/installments/:id', handleUploadOrJson, async (req, res) => {
  try {
    const instId = req.params.id;
    const body = req.body || {};
    const { amount_paid, principal_paid_override, discount_amount, payment_date, payment_mode, remark } = body;

    const [insts] = await query(`SELECT * FROM installments WHERE id = ?`, [instId]);
    if (!insts || !insts.length) {
      return res.status(404).json({ error: 'Installment entry not found' });
    }

    const currentInst = insts[0];
    const loanId = currentInst.loan_id;

    // Verify associated loan exists
    const [loans] = await query(`SELECT * FROM loans WHERE id = ?`, [loanId]);
    if (!loans || !loans.length || !loans[0]) {
      // Clean up orphaned entry
      await query(`DELETE FROM installments WHERE id = ?`, [instId]);
      return res.status(404).json({ error: 'Associated loan record no longer exists' });
    }

    const loan = loans[0];

    // Check for updated payment proof image
    const allFiles = req.files || [];
    const proofFile = allFiles.find(f => f.fieldname === 'payment_proof' || f.fieldname === 'proof_file' || f.fieldname === 'proof') || (req.file && (req.file.fieldname === 'payment_proof' || req.file.fieldname === 'proof_file' || req.file.fieldname === 'proof') ? req.file : null);
    const updatedProofPath = proofFile ? '/uploads/documents/' + proofFile.filename : currentInst.proof_path;

    // Update Installment Entry
    await query(`
      UPDATE installments
      SET amount_paid = ?, principal_paid = ?, discount_amount = ?, payment_date = ?, payment_mode = ?, proof_path = ?, remark = ?
      WHERE id = ?
    `, [
      parseFloat(amount_paid) || currentInst.amount_paid,
      principal_paid_override !== undefined && principal_paid_override !== null && principal_paid_override !== '' ? parseFloat(principal_paid_override) : null,
      discount_amount !== undefined && discount_amount !== null && discount_amount !== '' ? parseFloat(discount_amount) : (currentInst.discount_amount || 0),
      payment_date || currentInst.payment_date,
      payment_mode || currentInst.payment_mode,
      updatedProofPath,
      remark !== undefined ? remark : currentInst.remark,
      instId
    ]);

    const [allInsts] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loanId]);

    const updatedState = replayLoanState(loan, allInsts || []);

    await query(`
      UPDATE loans
      SET current_principal = ?, interest_amount = ?, total_amount = ?, discount_amount = ?, balance_due = ?, status = ?
      WHERE id = ?
    `, [updatedState.currentPrincipal, updatedState.interestAmount, updatedState.totalAmount, updatedState.discountAmount, updatedState.balanceDue, updatedState.status, loanId]);

    res.json({ message: 'Installment updated and loan ledger recalculated!', state: updatedState });
  } catch (err) {
    console.error('Error updating installment:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE Installment Payment (Remove mistaken payment)
app.delete('/api/installments/:id', async (req, res) => {
  try {
    const instId = req.params.id;
    const [insts] = await query(`SELECT * FROM installments WHERE id = ?`, [instId]);
    if (!insts || !insts.length) {
      return res.status(404).json({ error: 'Installment entry not found' });
    }

    const loanId = insts[0].loan_id;

    // Delete Installment
    await query(`DELETE FROM installments WHERE id = ?`, [instId]);

    // Re-eval loan state across remaining installments
    const [loans] = await query(`SELECT * FROM loans WHERE id = ?`, [loanId]);
    if (!loans || !loans.length) {
      return res.status(404).json({ error: 'Associated loan record not found' });
    }

    const [allInsts] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loanId]);

    const updatedState = replayLoanState(loans[0], allInsts || []);

    await query(`
      UPDATE loans
      SET current_principal = ?, interest_amount = ?, total_amount = ?, discount_amount = ?, balance_due = ?, status = ?
      WHERE id = ?
    `, [updatedState.currentPrincipal, updatedState.interestAmount, updatedState.totalAmount, updatedState.discountAmount, updatedState.balanceDue, updatedState.status, loanId]);

    res.json({ message: 'Installment deleted & loan ledger recalculated!', state: updatedState });
  } catch (err) {
    console.error('Error deleting installment:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE Collateral Item Status (e.g. Forfeited / Sold to recover loan)
app.put('/api/collateral/:id', handleUploadOrJson, async (req, res) => {
  try {
    const collateralId = req.params.id;
    const { status, sale_price, notes } = req.body || {};

    let photoClause = '';
    let params = [status, parseFloat(sale_price) || 0, notes || ''];

    const file = (req.files && req.files[0]) || null;
    if (file) {
      const photoPath = '/uploads/collateral/' + file.filename;
      photoClause = `, photo_path = ?`;
      params.splice(2, 0, photoPath);
    }

    params.push(collateralId);

    await query(`
      UPDATE collateral_items
      SET status = ?, sale_price = ? ${photoClause}, notes = ?
      WHERE id = ?
    `, params);

    // If collateral is forfeited / sold, update loan status to 'forfeited' or 'received' based on recovery
    const [collaterals] = await query(`SELECT loan_id FROM collateral_items WHERE id = ?`, [collateralId]);
    if (collaterals.length && status === 'forfeited') {
      await query(`UPDATE loans SET status = 'forfeited' WHERE id = ?`, [collaterals[0].loan_id]);
    } else if (collaterals.length && status === 'sold') {
      const [loanRows] = await query(`SELECT remark FROM loans WHERE id = ?`, [collaterals[0].loan_id]);
      const currentRemark = (loanRows[0] && loanRows[0].remark) || '';
      const newRemark = currentRemark 
        ? `${currentRemark} | Collateral sold for recovery: ${sale_price || 0}`
        : `Collateral sold for recovery: ${sale_price || 0}`;
      await query(`UPDATE loans SET status = 'received', remark = ? WHERE id = ?`, [newRemark, collaterals[0].loan_id]);
    }

    res.json({ message: 'Collateral updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD NEW Collateral Items for existing loan (Supports 1-10 photos at once, Max 10 total limit)
app.post('/api/loans/:id/collateral', handleUploadOrJson, async (req, res) => {
  try {
    const loanId = req.params.id;
    const [existing] = await query(`SELECT COUNT(*) as count FROM collateral_items WHERE loan_id = ?`, [loanId]);
    const count = existing[0]?.count || existing[0]?.['COUNT(*)'] || 0;

    const files = req.files || [];
    if (count >= 10) {
      return res.status(400).json({ error: 'Maximum limit of 10 collateral photos reached for this loan.' });
    }

    if (count + files.length > 10) {
      return res.status(400).json({ error: `Cannot upload ${files.length} photos. Maximum limit of 10 collateral photos reached (currently ${count}/10).` });
    }

    const { item_name, description, estimated_value, notes } = req.body || {};

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const photoPath = '/uploads/collateral/' + file.filename;
        const title = item_name 
          ? (files.length > 1 ? `${item_name} (Photo ${i + 1})` : item_name)
          : `Collateral Security Photo ${count + i + 1}`;

        await query(`
          INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, photo_path, status, notes)
          VALUES (?, ?, ?, ?, ?, 'pledged', ?)
        `, [
          loanId,
          title,
          description || 'Uploaded security collateral',
          parseFloat(estimated_value) || 0,
          photoPath,
          notes || ''
        ]);
      }
    } else {
      await query(`
        INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, photo_path, status, notes)
        VALUES (?, ?, ?, ?, ?, 'pledged', ?)
      `, [
        loanId,
        item_name || `Collateral Item ${count + 1}`,
        description || 'Uploaded security collateral',
        parseFloat(estimated_value) || 0,
        null,
        notes || ''
      ]);
    }

    await query(`UPDATE loans SET requires_collateral = 1 WHERE id = ?`, [loanId]);

    res.json({ message: 'Collateral item(s) added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Collateral Item
app.delete('/api/collateral/:id', async (req, res) => {
  try {
    const collateralId = req.params.id;
    const [items] = await query(`SELECT photo_path FROM collateral_items WHERE id = ?`, [collateralId]);
    if (items && items.length > 0 && items[0].photo_path) {
      const fullPath = path.join(__dirname, '..', items[0].photo_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
    await query(`DELETE FROM collateral_items WHERE id = ?`, [collateralId]);
    res.json({ message: 'Collateral item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err) });
  }
});

// ADD NEW Document(s) for existing loan (Supports 1-5 files at once, Max 5 total limit)
app.post('/api/loans/:id/documents', handleUploadOrJson, async (req, res) => {
  try {
    const loanId = req.params.id;
    const [existing] = await query(`SELECT COUNT(*) as count FROM documents WHERE loan_id = ?`, [loanId]);
    const count = existing[0]?.count || existing[0]?.['COUNT(*)'] || 0;

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No document files uploaded.' });
    }

    if (count + files.length > 5) {
      return res.status(400).json({ error: `Cannot upload ${files.length} documents. Maximum limit of 5 paperwork documents reached (currently ${count}/5).` });
    }

    const { document_name } = req.body;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = '/uploads/documents/' + file.filename;
      const title = document_name 
        ? (files.length > 1 ? `${document_name} (${i + 1})` : document_name)
        : file.originalname;

      await query(`
        INSERT INTO documents (loan_id, document_name, file_path, original_filename)
        VALUES (?, ?, ?, ?)
      `, [
        loanId,
        title,
        filePath,
        file.originalname
      ]);
    }

    res.json({ message: 'Document(s) uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err) });
  }
});

// DELETE Document
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const [docs] = await query(`SELECT file_path FROM documents WHERE id = ?`, [docId]);
    if (docs && docs.length > 0 && docs[0].file_path) {
      const fullPath = path.join(__dirname, '..', docs[0].file_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      }
    }
    await query(`DELETE FROM documents WHERE id = ?`, [docId]);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err) });
  }
});

// UPDATE Loan Details & optionally attach documents/photos
app.put('/api/loans/:id', handleUploadOrJson, async (req, res) => {
  try {
    const loanId = req.params.id;
    const body = req.body || {};
    const { 
      status, 
      remark, 
      return_date, 
      interest_rate, 
      interest_tenure, 
      guarantor_name,
      loan_taker,
      loan_amount,
      payment_mode,
      date_given
    } = body;

    const [loans] = await query(`SELECT * FROM loans WHERE id = ?`, [loanId]);
    if (!loans || !loans.length) return res.status(404).json({ error: 'Loan not found' });
    const loan = loans[0];

    const updatedLoanTaker = loan_taker !== undefined && loan_taker !== null ? loan_taker : loan.loan_taker;
    const updatedGuarantor = guarantor_name !== undefined && guarantor_name !== null ? guarantor_name : loan.guarantor_name;
    const updatedAmount = loan_amount !== undefined && loan_amount !== null && loan_amount !== '' ? parseFloat(loan_amount) : loan.loan_amount;
    const updatedPaymentMode = payment_mode !== undefined && payment_mode !== null ? payment_mode : loan.payment_mode;
    const updatedRate = interest_rate !== undefined && interest_rate !== null && interest_rate !== '' ? parseFloat(interest_rate) : loan.interest_rate;
    const updatedTenure = interest_tenure !== undefined && interest_tenure !== null ? interest_tenure : loan.interest_tenure;
    const updatedDateGiven = date_given !== undefined && date_given !== null ? date_given : loan.date_given;
    const updatedReturnDate = return_date !== undefined && return_date !== null ? return_date : loan.return_date;
    const updatedRemark = remark !== undefined && remark !== null ? remark : loan.remark;
    const updatedStatus = status !== undefined && status !== null ? status : loan.status;

    // Fetch existing installments to replay loan state with new amount/rate
    const [installments] = await query(`SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no ASC`, [loanId]);

    const tempLoanObj = {
      ...loan,
      loan_amount: updatedAmount,
      interest_rate: updatedRate,
      interest_tenure: updatedTenure,
      status: updatedStatus
    };

    const state = replayLoanState(tempLoanObj, installments || []);
    const requiresCollateral = updatedAmount > 30000 ? 1 : 0;

    await query(`
      UPDATE loans
      SET loan_taker = ?, guarantor_name = ?, loan_amount = ?, current_principal = ?, payment_mode = ?, interest_rate = ?, interest_tenure = ?, date_given = ?, return_date = ?, interest_amount = ?, total_amount = ?, balance_due = ?, status = ?, remark = ?, requires_collateral = ?
      WHERE id = ?
    `, [
      updatedLoanTaker, 
      updatedGuarantor, 
      updatedAmount, 
      state.currentPrincipal, 
      updatedPaymentMode, 
      updatedRate, 
      updatedTenure, 
      updatedDateGiven, 
      updatedReturnDate, 
      state.interestAmount, 
      state.totalAmount, 
      state.balanceDue, 
      state.status, 
      updatedRemark, 
      requiresCollateral, 
      loanId
    ]);

    // Handle any uploaded files during update
    const allFiles = req.files || [];
    const docFiles = allFiles.filter(f => f.fieldname === 'document_files' || f.fieldname === 'document_file');
    for (let docFile of docFiles.slice(0, 5)) {
      const relPath = '/uploads/documents/' + docFile.filename;
      await query(`
        INSERT INTO documents (loan_id, document_name, file_path, original_filename)
        VALUES (?, ?, ?, ?)
      `, [loanId, docFile.originalname, relPath, docFile.originalname]);
    }

    const collateralPhotos = allFiles.filter(f => f.fieldname === 'collateral_photos' || f.fieldname === 'collateral_photo' || f.fieldname === 'photo' || f.fieldname === 'photos');
    for (let i = 0; i < Math.min(collateralPhotos.length, 10); i++) {
      const photo = collateralPhotos[i];
      const photoPath = '/uploads/collateral/' + photo.filename;
      await query(`
        INSERT INTO collateral_items (loan_id, item_name, description, estimated_value, photo_path, status, notes)
        VALUES (?, ?, ?, ?, ?, 'pledged', ?)
      `, [
        loanId,
        req.body.collateral_item_name || `Pledged Security Photo ${i + 1}`,
        req.body.collateral_description || 'Uploaded during loan update',
        parseFloat(req.body.collateral_estimated_value) || updatedAmount,
        photoPath,
        'Pledged during loan update'
      ]);
    }

    res.json({ message: 'Loan updated successfully' });
  } catch (err) {
    console.error('Error updating loan:', err);
    res.status(500).json({ error: err.message || 'Failed to update loan' });
  }
});

// DELETE Loan
app.delete('/api/loans/:id', async (req, res) => {
  try {
    const loanId = req.params.id;
    // Purge associated collateral photo files from disk
    const [collaterals] = await query(`SELECT photo_path FROM collateral_items WHERE loan_id = ?`, [loanId]);
    for (let c of (collaterals || [])) {
      if (c.photo_path) {
        const fullPath = path.join(__dirname, '..', c.photo_path);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }
      }
    }
    // Purge associated document PDF/image files from disk
    const [documents] = await query(`SELECT file_path FROM documents WHERE loan_id = ?`, [loanId]);
    for (let d of (documents || [])) {
      if (d.file_path) {
        const fullPath = path.join(__dirname, '..', d.file_path);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }
      }
    }
    // Cascade delete database records
    await query(`DELETE FROM installments WHERE loan_id = ?`, [loanId]);
    await query(`DELETE FROM collateral_items WHERE loan_id = ?`, [loanId]);
    await query(`DELETE FROM documents WHERE loan_id = ?`, [loanId]);
    await query(`DELETE FROM loans WHERE id = ?`, [loanId]);
    res.json({ message: 'Loan and all associated records/files deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: sanitizeError(err) });
  }
});

// EXPORT Loans to Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const [loans] = await query(`SELECT * FROM loans ORDER BY id DESC`);
    const excelBuffer = generateLoansExcel(loans);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Loans_Ledger_Report.xlsx"');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// IMPORT Loans from Excel file
app.post('/api/import/excel', upload.single('excel_file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    const buffer = fs.readFileSync(req.file.path);
    const importedLoans = parseExcelLoans(buffer);

    for (let loan of importedLoans) {
      await query(`
        INSERT INTO loans (loan_taker, guarantor_name, loan_amount, payment_mode, interest_rate, interest_tenure, date_given, return_date, interest_amount, total_amount, balance_due, status, remark, requires_collateral)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        loan.loan_taker, loan.guarantor_name || null, loan.loan_amount, loan.payment_mode, loan.interest_rate,
        loan.interest_tenure, loan.date_given, loan.return_date, loan.interest_amount,
        loan.total_amount, loan.balance_due, loan.status, loan.remark, loan.requires_collateral
      ]);
    }

    // Clean up temporary uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ message: `Successfully imported ${importedLoans.length} loan records!` });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const safeMessage = sanitizeError(err);
  console.error('Global Express Error:', safeMessage);
  res.status(err.status || 500).json({ error: safeMessage });
});

// Catch-all route to serve SPA frontend in production
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  }
  if (fs.existsSync(path.join(clientBuildPath, 'index.html'))) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  } else {
    res.send('Loan Management API is running. Launch Vite dev server for frontend UI.');
  }
});

// START SERVER
initDatabase()
  .then(() => seedInitialData())
  .then(() => cleanOrphanedRecords())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`⚡ Loan Dashboard Server running on http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });
