import { NextResponse } from 'next/server';
import { listTranscripts } from '../../../lib/transcripts';

export async function GET() {
    try {
        return NextResponse.json({ transcripts: listTranscripts() });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
