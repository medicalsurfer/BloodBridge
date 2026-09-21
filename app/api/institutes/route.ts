import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedDonor } from "@/src/lib/auth";
import { getActiveInstitutes, getInstitutesWithStaff } from "@/src/lib/institutes";

export async function GET(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedDonor(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    // The chat picker asks for centres that can actually reply.
    const withStaff = new URL(request.url).searchParams.get("withStaff") === "1";
    const institutes = withStaff ? await getInstitutesWithStaff() : await getActiveInstitutes();

    return NextResponse.json(
      { institutes },
      { status: 200 }
    );
  } catch (error) {
    console.error("FETCH ACTIVE INSTITUTES ERROR:", error);

    return NextResponse.json(
      { error: "Unable to fetch donation centres." },
      { status: 500 }
    );
  }
}