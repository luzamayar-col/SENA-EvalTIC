import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireInstructor } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { PreguntasEditor } from '@/components/organisms/PreguntasEditor';
import { Button } from '@/components/ui/button';
import { ListChecks, ChevronLeft } from 'lucide-react';
import type { Pregunta } from '@/types/preguntas';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

// Normalize questions from DB to editor format:
// - Convert numeric ids to strings
// - seleccion_unica respuestaCorrecta may be stored as array -> extract first element
// - Support both 'enunciado' and legacy 'texto' field names
function normalizePreguntas(raw: unknown[]): Pregunta[] {
  let idx = 0;
  return (raw as any[]).map((p: any): Pregunta => {
    idx++;
    const enunciado: string = p.enunciado ?? p.texto ?? '';
    const id: string = p.id != null ? String(p.id) : String(idx);

    if (p.tipo === 'seleccion_unica') {
      const rc = Array.isArray(p.respuestaCorrecta)
        ? (p.respuestaCorrecta[0] ?? '')
        : (p.respuestaCorrecta ?? '');
      return {
        id,
        tipo: 'seleccion_unica',
        enunciado,
        opciones: p.opciones ?? [],
        respuestaCorrecta: rc,
        retroalimentacion: p.retroalimentacion,
      };
    }

    if (p.tipo === 'seleccion_multiple') {
      const rc = Array.isArray(p.respuestaCorrecta)
        ? p.respuestaCorrecta
        : [p.respuestaCorrecta].filter(Boolean);
      return {
        id,
        tipo: 'seleccion_multiple',
        enunciado,
        opciones: p.opciones ?? [],
        respuestaCorrecta: rc,
        retroalimentacion: p.retroalimentacion,
      };
    }

    if (p.tipo === 'emparejamiento') {
      return {
        id,
        tipo: 'emparejamiento',
        enunciado,
        pares: p.pares ?? [],
        retroalimentacion: p.retroalimentacion,
      };
    }

    // Fallback: return as-is
    return { id, tipo: p.tipo, enunciado, ...p } as Pregunta;
  });
}

export default async function PreguntasPage({ params }: Props) {
  const session = await requireInstructor();
  const { id } = await params;

  const evaluacion = await prisma.evaluacion.findFirst({
    where: { id, instructorId: session.user.instructorId },
    select: { id: true, nombre: true, preguntas: true },
  });

  if (!evaluacion) notFound();

  const preguntas = normalizePreguntas(evaluacion.preguntas as unknown[]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <ListChecks size={24} className="text-sena-green mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-sena-gray-dark/50 mb-1">
            <Link href="/instructor/evaluaciones" className="hover:text-sena-blue">
              Evaluaciones
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px] font-semibold text-sena-blue">
              {evaluacion.nombre}
            </span>
          </div>
          <h1 className="text-2xl font-black text-sena-blue">Preguntas</h1>
          <p className="text-sm text-sena-gray-dark/60 mt-0.5 truncate">{evaluacion.nombre}</p>
        </div>
        <Link href="/instructor/evaluaciones">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Evaluaciones</span>
          </Button>
        </Link>
      </div>

      <PreguntasEditor
        evaluacionId={id}
        evaluacionNombre={evaluacion.nombre}
        initialPreguntas={preguntas}
      />
    </div>
  );
}
