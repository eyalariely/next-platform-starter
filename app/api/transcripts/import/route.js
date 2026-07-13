import { NextResponse } from 'next/server';
import { saveTranscriptFromVtt } from '../../../../lib/transcripts';

export async function POST(request) {
    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) {
            return NextResponse.json({ error: 'לא צורף קובץ' }, { status: 400 });
        }

        const content = await file.text();
        const meta = saveTranscriptFromVtt(content, file.name);
        return NextResponse.json({ transcript: meta });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
