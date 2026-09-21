"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, StatGrid, Stat, Panel } from "@/src/components/ui/Page";
import { AccountSettings } from "@/src/components/account/AccountSettings";

const PROFILE_FIELD_COUNT = 9;

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
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  // "" until answered. A date on file means the answer is already yes.
  const [hasDonatedBefore, setHasDonatedBefore] = useState<"" | "YES" | "NO">("");

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

      setHasDonatedBefore(data.donorProfile?.lastDonationDate ? "YES" : "");
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

    if (hasDonatedBefore === "YES" && !profile.lastDonationDate) {
      setError("Please enter the date of your last donation, or answer No.");
      return;
    }

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

          // "No" clears any date previously on file.
          lastDonationDate:
            hasDonatedBefore === "NO" ? null : profile.lastDonationDate || null,
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

      // The sidebar name comes from the server layout; refresh so it shows the edit.
      router.refresh();
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
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />

          <p className="mt-3 text-sm text-slate-500">
            Loading your donor profile...
          </p>
        </div>
      </div>
    );
  }

  const completedFieldCount = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.phoneNumber,
    profile.dateOfBirth,
    profile.gender,
    profile.bloodGroup,
    profile.city,
    profile.address,
  ].filter(Boolean).length;

  const completionPercentage = Math.round((completedFieldCount / PROFILE_FIELD_COUNT) * 100);

  return (
    <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Donor profile"
          title={profile.firstName ? `${profile.firstName}'s profile` : "Your profile"}
          description="Keep your donor information accurate and up to date — appointments and eligibility checks read from it."
        />

        <div className="mt-7 mb-8">
          <StatGrid>
            <Stat
              label="Blood group"
              value={formatBloodGroup(profile.bloodGroup) || "Not set"}
              foot={profile.bloodGroup ? "On your donor record" : "Add it below"}
            />
            <Stat
              label="Eligibility"
              value={profile.eligibilityStatus ? "Eligible" : "Not assessed"}
              foot={profile.eligibilityStatus ? "Confirmed" : "Run an eligibility check"}
              tone={profile.eligibilityStatus ? "good" : "warn"}
            />
            <Stat
              label="Last donation"
              value={
                profile.lastDonationDate ? formatDisplayDate(profile.lastDonationDate) : "None"
              }
              foot={profile.lastDonationDate ? "Most recent record" : "No record yet"}
            />
            <Stat
              label="Profile complete"
              value={`${completionPercentage}%`}
              foot={`${completedFieldCount} of ${PROFILE_FIELD_COUNT} fields filled`}
              tone={completionPercentage === 100 ? "good" : "default"}
            />
          </StatGrid>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.7fr]">
          <Panel label="Personal information">
            <div className="mt-6" />

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
                    label="Have you ever donated blood?"
                    htmlFor="hasDonatedBefore"
                  >
                    <select
                      id="hasDonatedBefore"
                      value={hasDonatedBefore}
                      onChange={(event) => {
                        const answer = event.target.value as "" | "YES" | "NO";
                        setHasDonatedBefore(answer);

                        if (answer !== "YES") {
                          updateField("lastDonationDate", "");
                        }
                      }}
                      className="formInput"
                    >
                      <option value="">
                        Select an answer
                      </option>

                      <option value="YES">
                        Yes, I have donated before
                      </option>

                      <option value="NO">
                        No, this would be my first
                      </option>
                    </select>
                  </FormField>

                  {hasDonatedBefore === "YES" && (
                    <FormField
                      label="Date of your last donation"
                      htmlFor="lastDonationDate"
                    >
                      <input
                        id="lastDonationDate"
                        type="date"
                        required
                        max={new Date().toISOString().split("T")[0]}
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
                  )}

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
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-950 px-6 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <SmallSpinner />
                      Saving…
                    </>
                  ) : (
                    "Save profile"
                  )}
                </button>
              </div>
            </form>
          </Panel>

          <aside className="space-y-6">

            <EligibilityCard isEligible={profile.eligibilityStatus} />

            <ProfileCompletionCard
              percentage={completionPercentage}
              completed={completedFieldCount}
            />

            <DonationCard
              bloodGroup={profile.bloodGroup}
              lastDonationDate={profile.lastDonationDate}
            />
          </aside>
        </div>

        <div className="mt-6 lg:max-w-[68%]">
          <AccountSettings showDetails={false} />
        </div>

        <style jsx global>{`
          .formInput {
            height: 44px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid rgb(203 213 225);
            background: white;
            padding-left: 14px;
            padding-right: 14px;
            font-size: 13.5px;
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
  );
}


function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h3 className="border-b border-slate-100 pb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
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

function EligibilityCard({ isEligible }: { isEligible: boolean }) {
  return (
    <Panel label="Eligibility status">
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-[15px] font-bold ${
              isEligible ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {isEligible ? "Eligible" : "Not assessed"}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            {isEligible
              ? "You are currently marked as eligible to donate."
              : "Your donation eligibility has not been confirmed yet."}
          </p>
        </div>

        <div
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isEligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <CheckIcon />
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          href="/eligibility"
          className="text-xs font-semibold text-red-950 underline-offset-4 hover:underline"
        >
          Run an eligibility check →
        </Link>
      </div>
    </Panel>
  );
}

function ProfileCompletionCard({
  percentage,
  completed,
}: {
  percentage: number;
  completed: number;
}) {
  return (
    <Panel
      label="Profile completion"
      action={
        <span className="text-[13px] font-bold tabular-nums text-slate-900">{percentage}%</span>
      }
    >
      <div
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={PROFILE_FIELD_COUNT}
        aria-label="Profile fields completed"
        className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          style={{ width: `${percentage}%` }}
          className="h-full rounded-full bg-red-950 transition-all"
        />
      </div>

      <p className="mt-2.5 text-[11px] tabular-nums text-slate-500">
        {completed} of {PROFILE_FIELD_COUNT} fields filled
      </p>

      <p className="mt-4 text-xs leading-5 text-slate-600">
        Complete your donor information so BloodBridge can support eligibility and appointment
        workflows.
      </p>
    </Panel>
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
    <div className="rounded-2xl bg-red-950 p-6 text-white">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
        Donation information
      </p>

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/15">
        <div className="bg-red-950 px-4 py-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
            Blood group
          </p>

          <p className="mt-2.5 text-[22px] font-bold leading-none tracking-[-0.02em]">
            {formatBloodGroup(bloodGroup) || "—"}
          </p>
        </div>

        <div className="bg-red-950 px-4 py-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
            Last donation
          </p>

          <p className="mt-2.5 text-[13.5px] font-semibold leading-tight">
            {lastDonationDate ? formatDisplayDate(lastDonationDate) : "No record"}
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
    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-red-950" />
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