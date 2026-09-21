import { redirect } from "next/navigation";

// Reward validation now lives inside the workspace (no page change on approval),
// so this old address forwards to that section.
export default function InstituteRewardsRedirect() {
  redirect("/portal/institute-admin#rewards");
}
