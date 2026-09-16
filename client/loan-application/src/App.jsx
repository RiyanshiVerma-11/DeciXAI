import { Routes, Route } from 'react-router-dom';
import { LoanApplicationProvider } from './context/LoanApplicationContext';
import LoanWizard from './pages/LoanWizard';
import OfferPage from './pages/OfferPage';

export default function App() {
  return (
    <LoanApplicationProvider>
      <Routes>
        <Route path="/" element={<LoanWizard />} />
        <Route path="/offer" element={<OfferPage />} />
      </Routes>
    </LoanApplicationProvider>
  );
}
