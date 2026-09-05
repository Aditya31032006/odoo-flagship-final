import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useStaff from '../hook/useStaff.js';
import useAuth from '../../auth/hook/useAuth.js';
import '../styles/staff.scss';

// Role definitions
const STAFF_ROLES = [
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'finance', label: 'Finance Controller' },
  { value: 'operations', label: 'Operations Lead' },
  { value: 'admin', label: 'System Administrator' },
];

function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRoleLabel(role) {
  const match = STAFF_ROLES.find((r) => r.value === role);
  return match ? match.label : role;
}

export default function StaffManagement() {
  const { user: currentUser } = useAuth();
  const { staffList, loading, error, fetchStaff, createStaff, toggleStatus, deleteStaff } = useStaff();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState({ type: '', text: '', tempPassword: '' });

  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form for staff invitation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      role: 'sales_rep',
    },
  });

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((member) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.mobile?.includes(searchQuery);

      const matchesRole =
        selectedRoleFilter === 'all' || member.role === selectedRoleFilter;

      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && member.is_active) ||
        (selectedStatusFilter === 'inactive' && !member.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Metrics counts
  const metrics = useMemo(() => {
    const total = staffList.length;
    const sales = staffList.filter((s) => s.role === 'sales_rep' || s.role === 'sales_manager').length;
    const ops = staffList.filter((s) => s.role === 'operations').length;
    const finance = staffList.filter((s) => s.role === 'finance').length;
    const admins = staffList.filter((s) => s.role === 'admin').length;
    return { total, sales, ops, finance, admins };
  }, [staffList]);

  // Submit invite staff form
  const onInviteSubmit = async (data) => {
    setIsSubmitting(true);
    setActionAlert({ type: '', text: '', tempPassword: '' });

    const res = await createStaff(data);
    setIsSubmitting(false);

    if (res?.success) {
      setActionAlert({
        type: 'success',
        text: `Staff member ${res.staff.name} created! An invitation email with temporary credentials has been sent.`,
        tempPassword: res.tempPassword,
      });
      reset();
      setIsInviteModalOpen(false);
    } else {
      setActionAlert({
        type: 'error',
        text: res?.error || 'Failed to invite staff member.',
      });
    }
  };

  // Toggle active status
  const handleToggleStatus = async (staffMember) => {
    const newStatus = !staffMember.is_active;
    const res = await toggleStatus(staffMember.id, newStatus);
    if (res?.success) {
      setActionAlert({
        type: 'success',
        text: `Status for ${staffMember.name} updated to ${newStatus ? 'Active' : 'Inactive'}.`,
      });
    } else {
      setActionAlert({
        type: 'error',
        text: res?.error || 'Failed to update status.',
      });
    }
  };

  // Confirm delete staff
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    const res = await deleteStaff(deletingStaff.id);
    setIsDeleting(false);
    setDeletingStaff(null);

    if (res?.success) {
      setActionAlert({
        type: 'success',
        text: res.message || 'Staff member removed successfully.',
      });
    } else {
      setActionAlert({
        type: 'error',
        text: res?.error || 'Failed to delete staff member.',
      });
    }
  };

  return (
    <div className="df-staff">
      <div className="df-staff__container">
        {/* Header Section */}
        <div className="df-staff__header">
          <div className="df-staff__header-left">
            <h1>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Manage Staff & Access
            </h1>
            <p>Invite organizational staff members, assign functional roles, and manage access privileges.</p>
          </div>

          <div className="df-staff__header-right">
            <button
              type="button"
              className="df-staff__btn-primary"
              onClick={() => {
                reset();
                setActionAlert({ type: '', text: '', tempPassword: '' });
                setIsInviteModalOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Invite Staff Member
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {actionAlert.text && (
          <div className={`df-staff__alert df-staff__alert--${actionAlert.type}`}>
            {actionAlert.type === 'success' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <div>
              <span>{actionAlert.text}</span>
              {actionAlert.tempPassword && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#38bdf8' }}>
                  🔑 Generated temporary password: <strong>{actionAlert.tempPassword}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metrics Overview Bar */}
        <div className="df-staff__metrics">
          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="metric-card-info">
              <span className="label">Total Staff</span>
              <span className="count">{metrics.total}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--sales">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="metric-card-info">
              <span className="label">Sales Team</span>
              <span className="count">{metrics.sales}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--ops">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <line x1="12" y1="12" x2="12" y2="22" />
              </svg>
            </div>
            <div className="metric-card-info">
              <span className="label">Operations</span>
              <span className="count">{metrics.ops}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--finance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="metric-card-info">
              <span className="label">Finance</span>
              <span className="count">{metrics.finance}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="metric-card-info">
              <span className="label">Admins</span>
              <span className="count">{metrics.admins}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="df-staff__controls">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search staff by name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {STAFF_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>
          </div>
        </div>

        {/* Staff Data Table */}
        <div className="df-staff__table-wrapper">
          {loading && staffList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Loading staff directory...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="df-staff__empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <h3>No Staff Members Found</h3>
              <p>Try refining your search terms or filter selection.</p>
            </div>
          ) : (
            <table className="df-staff__table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => {
                  const isSelf = currentUser?.id === member.id;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="df-staff__user-cell">
                          <div className="avatar">{getInitials(member.name)}</div>
                          <div className="user-info">
                            <span className="name">
                              {member.name} {isSelf && <span style={{ color: '#38bdf8', fontSize: '0.725rem' }}>(You)</span>}
                            </span>
                            <span className="email">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{member.mobile || '—'}</td>
                      <td>
                        <span className={`df-staff__role-badge df-staff__role-badge--${member.role}`}>
                          {formatRoleLabel(member.role)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={isSelf}
                          className={`df-staff__status-btn ${member.is_active ? 'df-staff__status-btn--active' : 'df-staff__status-btn--inactive'}`}
                          onClick={() => handleToggleStatus(member)}
                          title={isSelf ? 'Cannot deactivate your own account' : `Click to ${member.is_active ? 'deactivate' : 'activate'}`}
                        >
                          <span className="dot" />
                          <span>{member.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td>{member.created_at ? new Date(member.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <div className="df-staff__action-buttons">
                          <button
                            type="button"
                            disabled={isSelf}
                            className="btn-icon btn-icon--delete"
                            onClick={() => setDeletingStaff(member)}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete Staff Member'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
        <div className="df-staff__modal-backdrop" onClick={() => setIsInviteModalOpen(false)}>
          <div className="df-staff__modal" onClick={(e) => e.stopPropagation()}>
            <div className="df-staff__modal-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="11" x2="19" y2="17" />
                  <line x1="22" y1="14" x2="16" y2="14" />
                </svg>
                Invite Staff Member
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsInviteModalOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onInviteSubmit)} noValidate>
              <div className="df-staff__modal-body">
                <div className="df-staff__modal-info-banner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    A secure random password will be generated automatically and dispatched to the staff member's email address along with login instructions.
                  </span>
                </div>

                {/* Full Name */}
                <div className="df-staff__form-group">
                  <label htmlFor="staff_name">Full Name *</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="staff_name"
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      {...register('name', {
                        required: 'Full name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' },
                      })}
                    />
                  </div>
                  {errors.name && <span className="field-error">{errors.name.message}</span>}
                </div>

                {/* Email Address */}
                <div className="df-staff__form-group">
                  <label htmlFor="staff_email">Work Email *</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      id="staff_email"
                      type="email"
                      placeholder="sarah@dealflow360.com"
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid email address',
                        },
                      })}
                    />
                  </div>
                  {errors.email && <span className="field-error">{errors.email.message}</span>}
                </div>

                {/* Mobile Number */}
                <div className="df-staff__form-group">
                  <label htmlFor="staff_mobile">Mobile Number (Optional)</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <input
                      id="staff_mobile"
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      {...register('mobile', {
                        validate: (val) => {
                          if (!val || !val.trim()) return true;
                          const digits = val.replace(/\D/g, '');
                          if (digits.length !== 10) return 'Mobile must be 10 digits';
                          if (!/^[6-9]\d{9}$/.test(digits)) return 'Must start with 6, 7, 8, or 9';
                          return true;
                        },
                      })}
                    />
                  </div>
                  {errors.mobile && <span className="field-error">{errors.mobile.message}</span>}
                </div>

                {/* Staff Role Selector */}
                <div className="df-staff__form-group">
                  <label htmlFor="staff_role">Assigned Staff Role *</label>
                  <div className="input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <select id="staff_role" {...register('role', { required: 'Role is required' })}>
                      {STAFF_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.role && <span className="field-error">{errors.role.message}</span>}
                </div>
              </div>

              <div className="df-staff__modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner" />
                      <span>Sending Invitation...</span>
                    </>
                  ) : (
                    <span>Invite Staff Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="df-staff__modal-backdrop" onClick={() => setDeletingStaff(null)}>
          <div className="df-staff__modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="df-staff__modal-header">
              <h2 style={{ color: '#f87171' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ef4444' }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Staff Member
              </h2>
            </div>
            <div className="df-staff__modal-body">
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Are you sure you want to permanently delete <strong>{deletingStaff.name}</strong> ({deletingStaff.email})?
              </p>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.775rem' }}>
                This user will lose access to the platform immediately.
              </p>
            </div>
            <div className="df-staff__modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setDeletingStaff(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                style={{ background: '#ef4444' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
