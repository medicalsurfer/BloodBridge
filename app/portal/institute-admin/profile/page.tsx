"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  healthInstitute: {
    name: string;
    city: string;
    region: string | null;
  } | null;
};

const emptyForm = { firstName: "", lastName: "", phoneNumber: "" };
const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function InstituteAdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [visiblePasswordFields, setVisiblePasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  function togglePasswordVisibility(field: keyof typeof visiblePasswordFields) {
    setVisiblePasswordFields((current) => ({ ...current, [field]: !current[field] }));
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/institute-admin/profile", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Unable to load your profile.");
      }

      setProfile(data.user);
      setForm({
        firstName: data.user.firstName ?? "",
        lastName: data.user.lastName ?? "",
        phoneNumber: data.user.phoneNumber ?? "",
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/institute-admin/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phoneNumber: form.phoneNumber.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Unable to update your profile.");
      }

      setProfile(data.user);
      setMessage("Your profile has been updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/institute-admin/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to change your password.");
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordMessage("Your password has been changed successfully.");
    } catch (passwordSaveError) {
      setPasswordError(passwordSaveError instanceof Error ? passwordSaveError.message : "Unable to change your password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-100 p-4">
      <div className="mx-auto flex h-full max-w-375 flex-col">
        <ProfileHeader profile={profile} />

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-1 pr-1">
        <div className="grid h-full gap-5 lg:grid-cols-3">
          <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-950">Institute admin profile</p>
              <h1 className="mt-1 text-xl font-bold text-slate-950">Personal information</h1>
            </div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"><p className="text-xs font-semibold text-red-800">{error}</p></div>}
            {message && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-800">{message}</p></div>}

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="First name" htmlFor="firstName"><input id="firstName" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="formInput" /></FormField>
                <FormField label="Last name" htmlFor="lastName"><input id="lastName" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="formInput" /></FormField>
                <FormField label="Email address" htmlFor="email"><input id="email" type="email" value={profile?.email ?? ""} readOnly className="formInput cursor-not-allowed bg-slate-50 text-slate-500" /></FormField>
                <FormField label="Phone number" htmlFor="phoneNumber"><input id="phoneNumber" type="tel" placeholder="+237 6XX XXX XXX" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="formInput" /></FormField>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={loadProfile} disabled={isSaving} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSaving} style={{ backgroundColor: PRIMARY_RED }} className="h-10 rounded-xl px-5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : "Save profile"}</button>
              </div>
            </form>
          </section>

          <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-950">Security</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Change password</h2>
            </div>

            {passwordError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"><p className="text-xs font-semibold text-red-800">{passwordError}</p></div>}
            {passwordMessage && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-800">{passwordMessage}</p></div>}

            <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col gap-3">
              <FormField label="Current password" htmlFor="currentPassword">
                <PasswordInput
                  id="currentPassword"
                  autoComplete="current-password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  visible={visiblePasswordFields.currentPassword}
                  onToggleVisible={() => togglePasswordVisibility("currentPassword")}
                />
              </FormField>
              <FormField label="New password" htmlFor="newPassword">
                <PasswordInput
                  id="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  visible={visiblePasswordFields.newPassword}
                  onToggleVisible={() => togglePasswordVisibility("newPassword")}
                />
              </FormField>
              <FormField label="Confirm new password" htmlFor="confirmPassword">
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                  visible={visiblePasswordFields.confirmPassword}
                  onToggleVisible={() => togglePasswordVisibility("confirmPassword")}
                />
              </FormField>

              <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
                <button type="submit" disabled={isChangingPassword} style={{ backgroundColor: PRIMARY_RED }} className="h-10 w-full rounded-xl px-5 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60">{isChangingPassword ? "Changing..." : "Change password"}</button>
              </div>
            </form>
          </section>

          <aside className="space-y-5">
            <InstituteCard institute={profile?.healthInstitute ?? null} />
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Access role</p>
              <p className="mt-3 text-lg font-bold text-slate-950">Institute administrator</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Your role and institute assignment are managed by a system administrator.</p>
            </div>
          </aside>
        </div>
        </div>

        <style jsx global>{`
          .formInput { height: 46px; width: 100%; border-radius: 12px; border: 1px solid rgb(226 232 240); background: white; padding: 0 14px; font-size: 13px; color: rgb(15 23 42); outline: none; transition: 0.2s ease; }
          .formInput::placeholder { color: rgb(148 163 184); }
          .formInput:focus { border-color: rgb(69 10 10); box-shadow: 0 0 0 4px rgba(69, 10, 10, 0.08); }
        `}</style>
      </div>
    </main>
  );
}

function ProfileHeader({ profile }: { profile: Profile | null }) {
  const initials = `${profile?.firstName?.charAt(0) ?? ""}${profile?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "A";
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><div style={{ backgroundColor: PRIMARY_RED }} className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white">{initials}</div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">BloodBridge institute admin</p><h2 className="mt-1 text-xl font-bold text-slate-950">{profile?.firstName ? `${profile.firstName}'s profile` : "Your profile"}</h2></div></div>
      <nav className="flex items-center gap-3"><Link href="/portal/institute-admin" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Dashboard</Link><Link href="/api/logout" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Sign out</Link></nav>
    </header>
  );
}

function SectionTitle({ title }: { title: string }) { return <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h3>; }

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) { return <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">{label}<span className="mt-2 block">{children}</span></label>; }

function PasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
  minLength,
  required,
}: {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <span className="relative block">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        value={value}
        onChange={onChange}
        className="formInput pr-11"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}

function InstituteCard({ institute }: { institute: Profile["healthInstitute"] }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Assigned institute</p><div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-900">+</div><h3 className="mt-4 text-xl font-bold text-slate-950">{institute?.name ?? "Not assigned"}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{[institute?.city, institute?.region].filter(Boolean).join(", ") || "Institute location unavailable"}</p><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500"><p>Your system administrator controls this assignment.</p></div></section>;
}
