import fs from 'fs';
import { NextResponse } from 'next/server';
import { getDownloadPath } from '../../../../../lib/transcripts';

export async function GET(request, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') === 'md' ? 'md' : 'txt';

    const filePath = getDownloadPath(id, format);
    if (!filePath) {
        return NextResponse.json({ error: 'התמלול לא נמצא' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath);
    return new NextResponse(content, {
        headers: {
            'Content-Type': format === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${id}.${format}"`
        }
    });
}
