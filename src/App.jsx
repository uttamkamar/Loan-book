import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import LoanTable from './components/LoanTable';
import LoanFormModal from './components/LoanFormModal';
import InstallmentModal from './components/InstallmentModal';
import CollateralGalleryModal from './components/CollateralGalleryModal';
import PaperworkModal from './components/PaperworkModal';
import ExcelModal from './components/ExcelModal';
import FullLoanDetailsModal from './components/FullLoanDetailsModal';
import PaymentProofGalleryModal from './components/PaymentProofGalleryModal';

import { 
  fetchHealth, 
  fetchLoans, 
  fetchLoanById,
  createLoan, 
  updateLoan, 
  deleteLoan, 
  addInstallment, 
  updateInstallment,
  deleteInstallment,
  updateCollateral,
  addCollateralItem,
  deleteCollateralItem,
  addDocument,
  deleteDocument
} from './api/client';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [dbInfo, setDbInfo] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGlobalPrivacyOn, setIsGlobalPrivacyOn] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  
  const [activeInstallmentLoan, setActiveInstallmentLoan] = useState(null);
  const [activeCollateralLoan, setActiveCollateralLoan] = useState(null);
  const [activePaperworkLoan, setActivePaperworkLoan] = useState(null);
  const [activeProofLoan, setActiveProofLoan] = useState(null);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [activeFullDetailsLoanId, setActiveFullDetailsLoanId] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const activeFullDetailsLoan = loans.find(l => String(l.id) === String(activeFullDetailsLoanId)) || null;

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleGlobalPrivacy = () => {
    setIsGlobalPrivacyOn(prev => !prev);
  };

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [health, loanList] = await Promise.all([
        fetchHealth().catch(() => ({ status: 'offline', dbType: 'unknown' })),
        fetchLoans().catch(() => [])
      ]);
      setDbInfo(health);
      setLoans(loanList);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleSaveLoan = async (formData) => {
    try {
      if (editingLoan) {
        await updateLoan(editingLoan.id, formData);
      } else {
        await createLoan(formData);
      }
      setIsAddModalOpen(false);
      setEditingLoan(null);
      await loadData();
    } catch (err) {
      alert('Error saving loan: ' + err.message);
    }
  };

  const handleDeleteLoan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this loan entry?')) return;
    try {
      await deleteLoan(id);
      await loadData();
    } catch (err) {
      alert('Failed to delete loan: ' + err.message);
    }
  };

  const handleRecordInstallment = async (loanId, installmentData) => {
    try {
      await addInstallment(loanId, installmentData);
      setActiveInstallmentLoan(null);
      await loadData();
    } catch (err) {
      alert('Failed to record installment: ' + err.message);
    }
  };

  const handleUpdateInstallment = async (installmentId, installmentData) => {
    try {
      await updateInstallment(installmentId, installmentData);
      setActiveInstallmentLoan(null);
      await loadData();
    } catch (err) {
      alert('Failed to update installment: ' + err.message);
    }
  };

  const handleDeleteInstallment = async (installmentId) => {
    try {
      await deleteInstallment(installmentId);
      setActiveInstallmentLoan(null);
      await loadData();
    } catch (err) {
      alert('Failed to delete installment: ' + err.message);
    }
  };

  const handleUpdateCollateral = async (collateralId, formData) => {
    try {
      await updateCollateral(collateralId, formData);
      if (activeCollateralLoan) {
        const updated = await fetchLoanById(activeCollateralLoan.id);
        setActiveCollateralLoan(updated);
      }
      await loadData();
    } catch (err) {
      alert('Failed to update collateral: ' + err.message);
    }
  };

  const handleAddCollateralItem = async (loanId, formData) => {
    try {
      await addCollateralItem(loanId, formData);
      await loadData();
      const updated = await fetchLoanById(loanId);
      setActiveCollateralLoan(updated);
    } catch (err) {
      alert('Failed to add collateral photo: ' + err.message);
    }
  };

  const handleDeleteCollateralItem = async (collateralId) => {
    try {
      await deleteCollateralItem(collateralId);
      if (activeCollateralLoan) {
        const updated = await fetchLoanById(activeCollateralLoan.id);
        setActiveCollateralLoan(updated);
      }
      await loadData();
    } catch (err) {
      alert('Failed to delete collateral item: ' + err.message);
    }
  };

  const handleAddDocument = async (loanId, formData) => {
    try {
      await addDocument(loanId, formData);
      await loadData();
      const updated = await fetchLoanById(loanId);
      setActivePaperworkLoan(updated);
    } catch (err) {
      alert('Failed to upload document: ' + err.message);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      if (activePaperworkLoan) {
        const updated = await fetchLoanById(activePaperworkLoan.id);
        setActivePaperworkLoan(updated);
      }
      await loadData();
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  const handleUpdateLoanStatus = async (loanId, status) => {
    try {
      await updateLoan(loanId, { status });
      setActiveInstallmentLoan(null);
      await loadData();
    } catch (err) {
      alert('Failed to update loan status: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      
      {/* Header Navigation */}
      <Navbar 
        dbInfo={dbInfo}
        theme={theme}
        onToggleTheme={toggleTheme}
        isGlobalPrivacyOn={isGlobalPrivacyOn}
        onToggleGlobalPrivacy={toggleGlobalPrivacy}
        onOpenAddModal={() => {
          setEditingLoan(null);
          setIsAddModalOpen(true);
        }}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
      />

      {/* KPI Stats Overview */}
      <StatsOverview loans={loans} isGlobalPrivacyOn={isGlobalPrivacyOn} />

      {/* Main Ledger Table */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading loan ledger from database...
        </div>
      ) : (
        <LoanTable 
          loans={loans}
          isGlobalPrivacyOn={isGlobalPrivacyOn}
          onOpenInstallmentModal={(loan) => setActiveInstallmentLoan(loan)}
          onOpenCollateralModal={(loan) => setActiveCollateralLoan(loan)}
          onOpenPaperworkModal={(loan) => setActivePaperworkLoan(loan)}
          onOpenProofModal={(loan, index = 0) => {
            setActiveProofLoan(loan);
            setActiveProofIndex(index);
          }}
          onOpenFullDetailsModal={(loan) => setActiveFullDetailsLoanId(loan.id)}
          onEditLoan={(loan) => {
            setEditingLoan(loan);
            setIsAddModalOpen(true);
          }}
          onDeleteLoan={handleDeleteLoan}
        />
      )}

      {/* Modals */}
      <LoanFormModal 
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLoan(null);
        }}
        onSubmit={handleSaveLoan}
        initialData={editingLoan}
      />

      <InstallmentModal 
        isOpen={!!activeInstallmentLoan}
        onClose={() => setActiveInstallmentLoan(null)}
        loan={activeInstallmentLoan}
        onSubmitInstallment={handleRecordInstallment}
        onUpdateInstallment={handleUpdateInstallment}
        onDeleteInstallment={handleDeleteInstallment}
        onUpdateLoanStatus={handleUpdateLoanStatus}
      />

      <CollateralGalleryModal 
        isOpen={!!activeCollateralLoan}
        onClose={() => setActiveCollateralLoan(null)}
        loan={activeCollateralLoan}
        onUpdateCollateral={handleUpdateCollateral}
        onAddCollateral={handleAddCollateralItem}
        onDeleteCollateral={handleDeleteCollateralItem}
      />

      <PaperworkModal 
        isOpen={!!activePaperworkLoan}
        onClose={() => setActivePaperworkLoan(null)}
        loan={activePaperworkLoan}
        onAddDocument={handleAddDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      <FullLoanDetailsModal 
        isOpen={!!activeFullDetailsLoan}
        onClose={() => setActiveFullDetailsLoanId(null)}
        loan={activeFullDetailsLoan}
        onOpenInstallmentModal={(loan) => setActiveInstallmentLoan(loan)}
        onOpenCollateralModal={(loan) => setActiveCollateralLoan(loan)}
        onOpenProofModal={(loan, index = 0) => {
          setActiveProofLoan(loan);
          setActiveProofIndex(index);
        }}
      />

      <PaymentProofGalleryModal 
        isOpen={!!activeProofLoan}
        onClose={() => setActiveProofLoan(null)}
        loan={activeProofLoan}
        initialIndex={activeProofIndex}
      />

      <ExcelModal 
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={() => loadData()}
      />

    </div>
  );
}
