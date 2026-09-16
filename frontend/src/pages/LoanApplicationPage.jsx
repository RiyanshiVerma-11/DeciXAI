import { LoanApplicationProvider } from '../loan-application/context/LoanApplicationContext'
import LoanWizard from '../loan-application/pages/LoanWizard'

export default function LoanApplicationPage() {
  return (
    <LoanApplicationProvider>
      <LoanWizard />
    </LoanApplicationProvider>
  )
}
