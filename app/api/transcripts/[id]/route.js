import { NextResponse } from 'next/server';
import { deleteTranscript, getTranscript } from '../../../../lib/transcripts';

export async function GET(request, { params }) {
    const { id } = await params;
    const transcript = getTranscript(id);
    if (!transcript) {
        return NextResponse.json({ error: 'התמלול לא נמצא' }, { status: 404 });
    }
    return NextResponse.json({ transcript });
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    const ok = deleteTranscript(id);
    if (!ok) {
        return NextResponse.json({ error: 'התמלול לא נמצא' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
}
