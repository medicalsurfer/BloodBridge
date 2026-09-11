import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedSystemAdmin } from "@/src/lib/auth";
import type { AuditAction } from "@/src/lib/audit";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedSystemAdmin(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const action = searchParams.get("action");
  const take = Math.min(Number(searchParams.get("take") ?? 100) || 100, 200);

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: action as AuditAction } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true, role: true } },
    },
  });

  return NextResponse.json(
    { logs },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
