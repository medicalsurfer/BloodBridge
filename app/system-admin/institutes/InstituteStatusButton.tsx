"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InstituteStatusButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStatusChange() {
    const action = isActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this institute?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/system-admin/institutes/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to update institute.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStatusChange}
      disabled={loading}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
        isActive
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {loading
        ? "Updating..."
        : isActive
          ? "Deactivate"
          : "Activate"}
    </button>
  );
}