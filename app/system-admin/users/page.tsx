"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole =
  | "DONOR"
  | "MEDICAL_STAFF"
  | "LAB_TECHNICIAN"
  | "HEALTH_INSTITUTE_ADMIN"
  | "SYSTEM_ADMIN";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type CurrentUserResponse = {
  user?: {
    id: string;
    role: UserRole;
  };
};

type UsersResponse = {
  users?: User[];
  error?: string;
};

type UpdateUserResponse = {
  user?: User;
  error?: string;
};

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setIsLoading(true);
      setError("");

      const [usersResponse, currentUserResponse] = await Promise.all([
        fetch("/api/system-admin/users", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const usersData: UsersResponse = await usersResponse
        .json()
        .catch(() => ({}));

      if (!usersResponse.ok) {
        throw new Error(
          usersData.error ?? "Unable to load platform users."
        );
      }

      const currentUserData: CurrentUserResponse =
        await currentUserResponse.json().catch(() => ({}));

      if (!currentUserResponse.ok || !currentUserData.user) {
        throw new Error(
          "Unable to identify the current system administrator."
        );
      }

      if (currentUserData.user.role !== "SYSTEM_ADMIN") {
        throw new Error(
          "You are not authorised to manage platform users."
        );
      }

      setUsers(usersData.users ?? []);
      setCurrentUserId(currentUserData.user.id);
    } catch (error) {
      console.error("LOAD MANAGE USERS PAGE ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load platform users."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function updateUserStatus(
    userId: string,
    nextIsActive: boolean
  ) {
    if (userId === currentUserId) {
      setError("You cannot change the active status of your own account here.");
      return;
    }

    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      setError("The selected user could not be found.");
      return;
    }

    const action = nextIsActive ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${targetUser.firstName} ${targetUser.lastName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/system-admin/users/${userId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextIsActive,
          }),
        }
      );

      const data: UpdateUserResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.user) {
        throw new Error(
          data.error ?? "Unable to update user."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? data.user! : user
        )
      );

      setSuccessMessage(
        `${data.user.firstName} ${data.user.lastName} has been ${
          data.user.isActive ? "activated" : "deactivated"
        }.`
      );
    } catch (error) {
      console.error("UPDATE USER ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update user."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        user.firstName.toLowerCase().includes(searchValue) ||
        user.lastName.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue) ||
        (user.phoneNumber ?? "").toLowerCase().includes(searchValue);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading platform users...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            System administration
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Manage users
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            View platform accounts and control whether each account can access BloodBridge.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total users" value={totalUsers} />
          <SummaryCard label="Active users" value={activeUsers} />
          <SummaryCard label="Inactive users" value={inactiveUsers} />
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="ALL">All roles</option>
            <option value="DONOR">Donor</option>
            <option value="MEDICAL_STAFF">Medical staff</option>
            <option value="LAB_TECHNICIAN">
              Laboratory technician
            </option>
            <option value="HEALTH_INSTITUTE_ADMIN">
              Institute admin
            </option>
            <option value="SYSTEM_ADMIN">System admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Platform users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>

            <button
              type="button"
              onClick={loadPageData}
              className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto"
            >
              Refresh
            </button>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-800">
                No users found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing the search text or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Registered</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isCurrentAdmin =
                      user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-950 text-sm font-semibold text-white">
                              {getInitials(
                                user.firstName,
                                user.lastName
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-950">
                                  {user.firstName} {user.lastName}
                                </p>

                                {isCurrentAdmin && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    You
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {user.phoneNumber || "Not provided"}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {formatRole(user.role)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isCurrentAdmin ? (
                            <span className="text-sm font-medium text-slate-400">
                              Current admin
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={updatingUserId === user.id}
                              onClick={() =>
                                updateUserStatus(
                                  user.id,
                                  !user.isActive
                                )
                              }
                              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                user.isActive
                                  ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                                  : "bg-red-950 text-white hover:bg-red-900"
                              }`}
                            >
                              {updatingUserId === user.id
                                ? "Updating..."
                                : user.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function formatRole(role: UserRole) {
  const labels: Record<UserRole, string> = {
    DONOR: "Donor",
    MEDICAL_STAFF: "Medical staff",
    LAB_TECHNICIAN: "Laboratory technician",
    HEALTH_INSTITUTE_ADMIN: "Institute admin",
    SYSTEM_ADMIN: "System admin",
  };

  return labels[role];
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}