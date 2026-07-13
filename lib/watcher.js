import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { getConfig } from './config';
import { saveTranscriptFromVtt } from './transcripts';

const state = (globalThis.__timlulWatcher ??= { watcher: null, folder: null, error: null });

function isVttFile(filePath) {
    return path.extname(filePath).toLowerCase() === '.vtt';
}

function handleNewFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stat = fs.statSync(filePath);
        const meta = saveTranscriptFromVtt(content, path.basename(filePath), stat.mtime);
        console.log(`[TIMLUL.AI] תמלול חדש נשמר: ${meta.title} (${meta.id})`);
    } catch (err) {
        console.error(`[TIMLUL.AI] שגיאה בעיבוד הקובץ ${filePath}:`, err.message);
    }
}

export function startWatcher() {
    const { watchFolder } = getConfig();

    if (state.watcher && state.folder === watchFolder) return state;

    if (state.watcher) {
        state.watcher.close();
        state.watcher = null;
    }

    try {
        fs.mkdirSync(watchFolder, { recursive: true });
        state.watcher = chokidar.watch(watchFolder, {
            depth: 0,
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 300 }
        });
        state.watcher.on('add', (filePath) => {
            if (isVttFile(filePath)) handleNewFile(filePath);
        });
        state.watcher.on('error', (err) => {
            state.error = err.message;
            console.error('[TIMLUL.AI] שגיאת מעקב תיקייה:', err.message);
        });
        state.folder = watchFolder;
        state.error = null;
        console.log(`[TIMLUL.AI] עוקב אחרי תיקיית ${watchFolder} לתמלולי Teams חדשים`);
    } catch (err) {
        state.error = err.message;
        console.error('[TIMLUL.AI] לא ניתן להתחיל מעקב אחרי התיקייה:', err.message);
    }

    return state;
}

export function watcherStatus() {
    return { folder: state.folder, watching: !!state.watcher, error: state.error };
}

export function restartWatcher() {
    if (state.watcher) {
        state.watcher.close();
        state.watcher = null;
        state.folder = null;
    }
    return startWatcher();
}
