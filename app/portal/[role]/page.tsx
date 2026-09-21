import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import ModulePage from "@/src/components/ModulePage";

const roleContent = {
  "medical-staff": {
    role: "MEDICAL_STAFF",
    label: "Medical Staff",
    title: "Donation care workspace",
    description:
      "Review donor appointments, confirm clinical details, and keep every donation visit moving safely.",
  },
  "lab-technician": {
    role: "LAB_TECHNICIAN",
    label: "Laboratory Technician",
    title: "Laboratory processing workspace",
    description:
      "Track blood samples, record test results, and keep verified inventory information available to the care team.",
  },
  "institute-admin": {
    role: "HEALTH_INSTITUTE_ADMIN",
    label: "Institute Admin",
    title: "Institute operations workspace",
    description:
      "Coordinate your institute, manage its donation capacity, and monitor the work that supports local donors.",
  },
} as const;

type RoleSlug = keyof typeof roleContent;

export default async function RolePortalPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const content = roleContent[role as RoleSlug];

  if (!content) {
    notFound();
  }

  const token = (await cookies()).get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user) {
    redirect("/login");
  }

  if (authentication.user.role !== content.role) {
    const redirectByRole: Record<string, string> = {
      DONOR: "/home",
      MEDICAL_STAFF: "/portal/medical-staff",
      LAB_TECHNICIAN: "/portal/lab-technician",
      HEALTH_INSTITUTE_ADMIN: "/portal/institute-admin",
      SYSTEM_ADMIN: "/system-admin",
    };
    redirect(redirectByRole[authentication.user.role] ?? "/home");
  }

  return (
    <ModulePage
      label={content.label}
      title={`Welcome back, ${authentication.user.firstName}`}
      description={content.description}
    />
  );
}