"use client";

export type EligibilityAnswers = {
  feelingWell: string;
  weight: string;
  currentIllness: string;
  medicalCondition: string;
  medication: string;
  pregnancyStatus: string;
  lastDonationDate: string;
  recentProcedure: string;
  infectionRisk: string;
};

export const emptyEligibilityAnswers: EligibilityAnswers = {
  feelingWell: "",
  weight: "",
  currentIllness: "",
  medicalCondition: "",
  medication: "",
  pregnancyStatus: "",
  lastDonationDate: "",
  recentProcedure: "",
  infectionRisk: "",
};

export const MIN_DAYS_BETWEEN_DONATIONS = 56; // 8 weeks

// Returns the number of whole days that have passed since the given date.
export function getDaysSince(date: string): number | null {
  if (!date) {
    return null;
  }

  const lastDonation = new Date(date);
  const today = new Date();

  lastDonation.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const differenceInMilliseconds = today.getTime() - lastDonation.getTime();

  return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
}

// Returns how many days remain until the donor is eligible again (0 if eligible now/no prior donation).
export function getDaysRemaining(date: string): number {
  const daysSince = getDaysSince(date);

  if (daysSince === null) {
    return 0;
  }

  const remaining = MIN_DAYS_BETWEEN_DONATIONS - daysSince;

  return remaining > 0 ? remaining : 0;
}

export function requiredEligibilityFieldsMissing(answers: EligibilityAnswers) {
  const requiredAnswers = [
    answers.feelingWell,
    answers.weight,
    answers.currentIllness,
    answers.medicalCondition,
    answers.medication,
    answers.pregnancyStatus,
    answers.recentProcedure,
    answers.infectionRisk,
  ];

  return requiredAnswers.some((answer) => answer.trim() === "");
}

type Props = {
  answers: EligibilityAnswers;
  onChange: (field: keyof EligibilityAnswers, value: string) => void;
};

export default function EligibilityFormFields({ answers, onChange }: Props) {
  const daysRemaining = getDaysRemaining(answers.lastDonationDate);

  return (
    <>
      <Question
        label="Are you currently feeling well?"
        value={answers.feelingWell}
        onChange={(value) => onChange("feelingWell", value)}
      />

      <WeightInput value={answers.weight} onChange={(value) => onChange("weight", value)} />

      <Question
        label="Do you currently have a fever, infection, or other illness?"
        value={answers.currentIllness}
        onChange={(value) => onChange("currentIllness", value)}
      />

      <Question
        label="Do you have a medical condition that may affect your ability to donate blood?"
        value={answers.medicalCondition}
        onChange={(value) => onChange("medicalCondition", value)}
      />

      <Question
        label="Are you currently taking any medication?"
        value={answers.medication}
        onChange={(value) => onChange("medication", value)}
      />

      <Question
        label="Are you currently pregnant or have you recently given birth?"
        value={answers.pregnancyStatus}
        onChange={(value) => onChange("pregnancyStatus", value)}
      />

      <DonationDateInput
        value={answers.lastDonationDate}
        onChange={(value) => onChange("lastDonationDate", value)}
        daysRemaining={daysRemaining}
      />

      <Question
        label="Have you recently had surgery, a blood transfusion, tattoo, or piercing?"
        value={answers.recentProcedure}
        onChange={(value) => onChange("recentProcedure", value)}
      />

      <Question
        label="Have you had any recent exposure that may increase the risk of an infection transmitted through blood?"
        value={answers.infectionRisk}
        onChange={(value) => onChange("infectionRisk", value)}
      />
    </>
  );
}

function Question({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("YES")}
          className={`h-11 rounded-xl border text-sm font-semibold transition ${
            value === "YES"
              ? "border-red-950 bg-red-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Yes
        </button>

        <button
          type="button"
          onClick={() => onChange("NO")}
          className={`h-11 rounded-xl border text-sm font-semibold transition ${
            value === "NO"
              ? "border-red-950 bg-red-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function WeightInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor="weight" className="block text-sm font-semibold text-slate-800">
        What is your current weight?
      </label>

      <p className="mt-1 text-xs text-slate-500">Enter your weight in kilograms.</p>

      <div className="relative mt-3">
        <input
          id="weight"
          type="number"
          min="1"
          max="300"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: 70"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm text-slate-800 outline-none focus:border-red-950"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
          kg
        </span>
      </div>
    </div>
  );
}

function DonationDateInput({
  value,
  onChange,
  daysRemaining,
}: {
  value: string;
  onChange: (value: string) => void;
  daysRemaining: number;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <label htmlFor="lastDonationDate" className="block text-sm font-semibold text-slate-800">
        When did you last donate blood?
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Leave this blank if you have never donated blood. A minimum of 8 weeks (56 days) is
        required between whole blood donations.
      </p>

      <input
        id="lastDonationDate"
        type="date"
        value={value}
        max={today}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-red-950"
      />

      {value && daysRemaining > 0 && (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left before you can donate again.
        </p>
      )}

      {value && daysRemaining === 0 && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          You have met the 8-week interval and are eligible to donate again based on this date.
        </p>
      )}
    </div>
  );
}
