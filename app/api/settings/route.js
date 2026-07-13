import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '../../../lib/config';
import { restartWatcher, watcherStatus } from '../../../lib/watcher';

export async function GET() {
    return NextResponse.json({ config: getConfig(), status: watcherStatus() });
}

export async function POST(request) {
    const body = await request.json();
    const { watchFolder, outputFolder } = body;

    if (!watchFolder || !outputFolder) {
        return NextResponse.json({ error: 'יש להזין נתיב לתיקיית מעקב ולתיקיית פלט' }, { status: 400 });
    }

    const config = saveConfig({ watchFolder, outputFolder });
    const status = restartWatcher();
    return NextResponse.json({ config, status });
}
