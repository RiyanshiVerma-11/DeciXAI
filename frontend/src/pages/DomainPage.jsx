import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import CareerDomain from '../domains/career'
import FinanceDomain from './LoanApplicationPage'
import StartupDomain from '../domains/startup'
import PolicyDomain from '../domains/policy'

export default function DomainPage() {
  const { domain } = useParams()
  const activeDomain = (domain || 'career').toLowerCase()

  switch (activeDomain) {
    case 'career':
      return <CareerDomain />
    case 'finance':
      return <FinanceDomain />
    case 'startup':
      return <StartupDomain />
    case 'policy':
      return <PolicyDomain />
    default:
      return <Navigate to="/dashboard/career" replace />
  }
}
