import { NextRequest, NextResponse } from "next/server";
import { requireInstructor } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

const DEFAULT_SENDER = "EvalTIC SENA <onboarding@resend.dev>";

export async function GET() {
  const session = await requireInstructor();
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const config = await prisma.appConfig.findUnique({
    where: { clave: "senderEmail" },
  });

  return NextResponse.json({
    senderEmail: config?.valor ?? DEFAULT_SENDER,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireInstructor();
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const { senderEmail } = body as { senderEmail: string };

  if (!senderEmail || typeof senderEmail !== "string" || !senderEmail.trim()) {
    return NextResponse.json(
      { error: "El campo senderEmail es requerido" },
      { status: 400 }
    );
  }

  await prisma.appConfig.upsert({
    where: { clave: "senderEmail" },
    update: { valor: senderEmail.trim() },
    create: { clave: "senderEmail", valor: senderEmail.trim() },
  });

  return NextResponse.json({ success: true });
}
