import { useAppContext } from '../contexts/AppContext'

export function useRole() {
  const { currentUser } = useAppContext()
  const role = currentUser?.role

  return {
    canActivateContract:
      role === 'procurement_approver' ||
      role === 'entity_admin' ||
      role === 'platform_admin',

    canResolveDiscrepancy:
      role === 'procurement_officer' ||
      role === 'procurement_approver' ||
      role === 'entity_admin' ||
      role === 'platform_admin',

    isAdmin: role === 'entity_admin' || role === 'platform_admin',
  }
}
