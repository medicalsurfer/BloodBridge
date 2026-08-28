"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  city: string;
  lastDonationDate: string;
  eligibilityStatus: boolean;
};

const emptyProfile: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  address: "",
  city: "",
  lastDonationDate: "",
  eligibilityStatus: false,
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to load profile.");
      }

      setProfile({
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",
        phoneNumber: data.phoneNumber ?? "",

        dateOfBirth: formatDateForInput(
          data.donorProfile?.dateOfBirth
        ),

        gender: data.donorProfile?.gender ?? "",
        bloodGroup: data.donorProfile?.bloodGroup ?? "",
        address: data.donorProfile?.address ?? "",
        city: data.donorProfile?.city ?? "",

        lastDonationDate: formatDateForInput(
          data.donorProfile?.lastDonationDate
        ),

        eligibilityStatus:
          data.donorProfile?.eligibilityStatus ?? false,
      });
    } catch (err) {
      console.error("PROFILE LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your profile."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phoneNumber: profile.phoneNumber.trim(),

          dateOfBirth:
            profile.dateOfBirth || null,

          gender:
            profile.gender || null,

          bloodGroup:
            profile.bloodGroup || null,

          address:
            profile.address.trim() || null,

          city:
            profile.city.trim() || null,

          lastDonationDate:
            profile.lastDonationDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Unable to update profile."
        );
      }

      setMessage("Your profile has been updated successfully.");

      await loadProfile();
    } catch (err) {
      console.error("PROFILE UPDATE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateField(
    field: keyof ProfileData,
    value: string | boolean
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <LoadingSpinner />

          <p className="mt-3 text-sm text-slate-500">
            Loading your donor profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-7xl">
        <ProfileHeader
          firstName={profile.firstName}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-950">
                Donor profile
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Personal information
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Keep your donor information accurate and up to date.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-red-800">
                  Something went wrong
                </p>

                <p className="mt-1 text-xs text-red-700">
                  {error}
                </p>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-emerald-800">
                  Profile updated
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  {message}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <SectionTitle title="Account information" />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField
                    label="First name"
                    htmlFor="firstName"
                  >
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={profile.firstName}
                      onChange={(event) =>
                        updateField(
                          "firstName",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>

                  <FormField
                    label="Last name"
                    htmlFor="lastName"
                  >
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={profile.lastName}
                      onChange={(event) =>
                        updateField(
                          "lastName",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>

                  <FormField
                    label="Email address"
                    htmlFor="email"
                  >
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      readOnly
                      className="formInput cursor-not-allowed bg-slate-50 text-slate-500"
                    />
                  </FormField>

                  <FormField
                    label="Phone number"
                    htmlFor="phoneNumber"
                  >
                    <input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      value={profile.phoneNumber}
                      onChange={(event) =>
                        updateField(
                          "phoneNumber",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <SectionTitle title="Donor information" />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Date of birth"
                    htmlFor="dateOfBirth"
                  >
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(event) =>
                        updateField(
                          "dateOfBirth",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>

                  <FormField
                    label="Gender"
                    htmlFor="gender"
                  >
                    <select
                      id="gender"
                      value={profile.gender}
                      onChange={(event) =>
                        updateField(
                          "gender",
                          event.target.value
                        )
                      }
                      className="formInput"
                    >
                      <option value="">
                        Select gender
                      </option>

                      <option value="MALE">
                        Male
                      </option>

                      <option value="FEMALE">
                        Female
                      </option>
                    </select>
                  </FormField>

                  <FormField
                    label="Blood group"
                    htmlFor="bloodGroup"
                  >
                    <select
                      id="bloodGroup"
                      value={profile.bloodGroup}
                      onChange={(event) =>
                        updateField(
                          "bloodGroup",
                          event.target.value
                        )
                      }
                      className="formInput"
                    >
                      <option value="">
                        Select blood group
                      </option>

                      <option value="A_POSITIVE">
                        A+
                      </option>

                      <option value="A_NEGATIVE">
                        A-
                      </option>

                      <option value="B_POSITIVE">
                        B+
                      </option>

                      <option value="B_NEGATIVE">
                        B-
                      </option>

                      <option value="AB_POSITIVE">
                        AB+
                      </option>

                      <option value="AB_NEGATIVE">
                        AB-
                      </option>

                      <option value="O_POSITIVE">
                        O+
                      </option>

                      <option value="O_NEGATIVE">
                        O-
                      </option>
                    </select>
                  </FormField>

                  <FormField
                    label="Last donation date"
                    htmlFor="lastDonationDate"
                  >
                    <input
                      id="lastDonationDate"
                      type="date"
                      value={profile.lastDonationDate}
                      onChange={(event) =>
                        updateField(
                          "lastDonationDate",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>

                  <FormField
                    label="City"
                    htmlFor="city"
                  >
                    <input
                      id="city"
                      type="text"
                      placeholder="Yaoundé"
                      value={profile.city}
                      onChange={(event) =>
                        updateField(
                          "city",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>

                  <FormField
                    label="Address"
                    htmlFor="address"
                  >
                    <input
                      id="address"
                      type="text"
                      placeholder="Your address"
                      value={profile.address}
                      onChange={(event) =>
                        updateField(
                          "address",
                          event.target.value
                        )
                      }
                      className="formInput"
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={loadProfile}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel changes
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    backgroundColor: PRIMARY_RED,
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <SmallSpinner />
                      Saving...
                    </>
                  ) : (
                    "Save profile"
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-5">
            <EligibilityCard
              isEligible={
                profile.eligibilityStatus
              }
            />

            <ProfileCompletionCard
              profile={profile}
            />

            <DonationCard
              bloodGroup={
                profile.bloodGroup
              }
              lastDonationDate={
                profile.lastDonationDate
              }
            />
          </aside>
        </div>

        <style jsx global>{`
          .formInput {
            height: 46px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid rgb(226 232 240);
            background: white;
            padding-left: 14px;
            padding-right: 14px;
            font-size: 13px;
            color: rgb(15 23 42);
            outline: none;
            transition: 0.2s ease;
          }

          .formInput::placeholder {
            color: rgb(148 163 184);
          }

          .formInput:focus {
            border-color: rgb(69 10 10);
            box-shadow: 0 0 0 4px rgba(69, 10, 10, 0.08);
          }

          .formInput:read-only {
            background: rgb(248 250 252);
          }
        `}</style>
      </div>
    </main>
  );
}

function ProfileHeader({
  firstName,
}: {
  firstName: string;
}) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div
          style={{
            backgroundColor: PRIMARY_RED,
          }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
        >
          {firstName
            ? firstName.charAt(0).toUpperCase()
            : "D"}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            BloodBridge donor
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {firstName
              ? `${firstName}'s profile`
              : "Your profile"}
          </h2>
        </div>
      </div>

      <nav className="flex items-center gap-3">
        <Link
          href="/home"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Home
        </Link>

        <Link
          href="/donor"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Dashboard
        </Link>
      </nav>
    </header>
  );
}

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h3 className="text-sm font-bold text-slate-900">
      {title}
    </h3>
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-semibold text-slate-700"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function EligibilityCard({
  isEligible,
}: {
  isEligible: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        Eligibility status
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p
            className={`text-xl font-bold ${
              isEligible
                ? "text-emerald-700"
                : "text-amber-700"
            }`}
          >
            {isEligible
              ? "Eligible"
              : "Not assessed"}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isEligible
              ? "You are currently marked as eligible to donate."
              : "Your donation eligibility has not been confirmed yet."}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            isEligible
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <CheckIcon />
        </div>
      </div>
    </div>
  );
}

function ProfileCompletionCard({
  profile,
}: {
  profile: ProfileData;
}) {
  const fields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.phoneNumber,
    profile.dateOfBirth,
    profile.gender,
    profile.bloodGroup,
    profile.city,
    profile.address,
  ];

  const completed = fields.filter(
    (value) => Boolean(value)
  ).length;

  const percentage = Math.round(
    (completed / fields.length) * 100
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Profile completion
        </p>

        <span className="text-sm font-bold text-red-950">
          {percentage}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          style={{
            width: `${percentage}%`,
            backgroundColor: PRIMARY_RED,
          }}
          className="h-full rounded-full transition-all"
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Complete your donor information so BloodBridge can support future eligibility and appointment workflows.
      </p>
    </div>
  );
}

function DonationCard({
  bloodGroup,
  lastDonationDate,
}: {
  bloodGroup: string;
  lastDonationDate: string;
}) {
  return (
    <div
      style={{
        backgroundColor: PRIMARY_RED,
      }}
      className="rounded-3xl p-5 text-white shadow-xl shadow-red-950/20"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">
        Donation information
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wide text-red-100">
            Blood group
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatBloodGroup(
              bloodGroup
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wide text-red-100">
            Last donation
          </p>

          <p className="mt-2 text-sm font-bold">
            {lastDonationDate
              ? formatDisplayDate(
                  lastDonationDate
                )
              : "No record"}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDateForInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toISOString()
    .split("T")[0];
}

function formatDisplayDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatBloodGroup(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    A_POSITIVE: "A+",
    A_NEGATIVE: "A-",
    B_POSITIVE: "B+",
    B_NEGATIVE: "B-",
    AB_POSITIVE: "AB+",
    AB_NEGATIVE: "AB-",
    O_POSITIVE: "O+",
    O_NEGATIVE: "O-",
  };

  return labels[value] ?? "--";
}

function LoadingSpinner() {
  return (
    <div
      style={{
        borderTopColor:
          PRIMARY_RED,
      }}
      className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200"
    />
  );
}

function SmallSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />

      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}