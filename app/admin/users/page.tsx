'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconUsersGroupRounded,
  IconUser,
  IconShield,
  IconEdit,
  IconEye,
  IconRefresh,
} from '@/components/ui/icons';
import { AdminTable, Column } from '@/components/admin/admin-table';
import { AdminSearch } from '@/components/admin/admin-search';
import { AdminFilters } from '@/components/admin/admin-filters';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Role mutation dialog state
  const [dialogUser, setDialogUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        role: selectedRole,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalUsers(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, selectedRole]);

  const handleRoleChangeSubmit = async () => {
    if (!dialogUser) return;
    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${dialogUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === dialogUser.id ? { ...u, role: newRole } : u))
        );
        setDialogUser(null);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'User Account',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-slate-300">
            {row.displayName?.charAt(0) || row.username?.charAt(0) || <IconUser className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-white leading-tight">{row.displayName || row.username}</div>
            <div className="text-[11px] text-slate-400 font-mono">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role / Access',
      render: (row) => <StatusBadge variant={row.role || 'user'} />,
    },
    {
      key: 'defaultQuality',
      header: 'Playback Defaults',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-200">{row.defaultQuality || '1080p'}</div>
          <div className="text-[10px] text-slate-500">{row.preferredLanguage || 'English'}</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Member Since',
      render: (row) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Jan 2024'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDialogUser(row);
              setNewRole(row.role === 'admin' ? 'user' : 'admin');
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
            title="Modify Permissions"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Role</span>
          </button>

          <Link href={`/admin/users/${row.id}`}>
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-slate-300 hover:text-primary transition-colors text-xs flex items-center gap-1"
              title="Inspect User Details"
            >
              <IconEye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View</span>
            </button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconUsersGroupRounded className="w-7 h-7 text-primary" />
            User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect activity, and adjust role-based access control (RBAC).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={loading}
          className="gap-1.5 text-xs w-full sm:w-auto"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Users
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <AdminSearch
            value={searchQuery}
            onSearch={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search by email, name, or username..."
          />
        </div>

        <AdminFilters
          options={[
            { label: 'All Roles', value: 'all' },
            { label: 'Admins', value: 'admin' },
            { label: 'Moderators', value: 'moderator' },
            { label: 'Users', value: 'user' },
          ]}
          selectedValue={selectedRole}
          onSelectValue={(val) => {
            setSelectedRole(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Table */}
      <AdminTable columns={columns} data={users} isLoading={loading} />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalUsers}
        pageSize={10}
        onPageChange={setCurrentPage}
      />

      {/* Role Change Modal */}
      {dialogUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
                <IconShield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Adjust User Role</h3>
                <p className="text-xs text-slate-400">{dialogUser.email}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300">Select Privilege Level:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['user', 'moderator', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                      newRole === r
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogUser(null)}
                disabled={isUpdatingRole}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRoleChangeSubmit}
                disabled={isUpdatingRole}
                className="text-xs font-bold"
              >
                {isUpdatingRole ? 'Updating...' : 'Save Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
