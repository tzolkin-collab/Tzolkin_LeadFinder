import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Em ambiente real de monolito Next.js com Prisma Adapter
const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { businessId, listName = 'Leads Frios SP' } = body;

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 });
    }

    // Procura ou cria a lista (mock do Tenant padrão)
    const list = await prisma.leadList.upsert({
      where: { id: 'default-list-1' }, // mock ID estático
      update: {},
      create: {
        id: 'default-list-1',
        name: listName,
      }
    });

    // Insere o Entry (salvando o lead)
    const entry = await prisma.leadListEntry.create({
      data: {
        listId: list.id,
        businessId: businessId
      }
    });

    return NextResponse.json({ success: true, entry });

  } catch (error) {
    console.error("[Save Lead API] Error:", error);
    // Erro de unique constraint (já está na lista) não precisa quebrar a UI
    if (error.code === 'P2002') {
      return NextResponse.json({ success: true, message: 'Lead já estava salvo' });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
