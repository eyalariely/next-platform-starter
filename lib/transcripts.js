import fs from 'fs';
import path from 'path';
import { getConfig } from './config';
import { parseVtt, speakersOf } from './vtt';

function slugify(name) {
    return name
        .replace(/\.[^/.]+$/, '')
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'פגישה';
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function meetingTitleFromFilename(name) {
    return name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\bGMT\d+\b/gi, '')
        .replace(/\btranscript\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'פגישת Teams';
}

function buildMarkdown({ title, dateLabel, speakers, cues }) {
    const lines = [`# ${title}`, '', `תאריך: ${dateLabel}`, `דוברים: ${speakers.join(', ')}`, ''];
    for (const cue of cues) {
        lines.push(`**${cue.speaker}** _(${cue.startLabel})_`);
        lines.push(cue.text);
        lines.push('');
    }
    return lines.join('\n');
}

function buildPlainText({ title, dateLabel, speakers, cues }) {
    const lines = [title, `תאריך: ${dateLabel}`, `דוברים: ${speakers.join(', ')}`, ''];
    for (const cue of cues) {
        lines.push(`[${cue.startLabel}] ${cue.speaker}: ${cue.text}`);
    }
    return lines.join('\n');
}

export function ensureFolders() {
    const { watchFolder, outputFolder } = getConfig();
    fs.mkdirSync(outputFolder, { recursive: true });
    return { watchFolder, outputFolder };
}

// Runs the full pipeline on raw VTT text (from a watched file or a manual upload)
// and persists a formatted transcript folder under the configured output directory.
export function saveTranscriptFromVtt(vttContent, originalName, sourceDate = new Date()) {
    const cues = parseVtt(vttContent);
    if (cues.length === 0) {
        throw new Error('לא נמצאו שורות תמלול תקינות בקובץ. ודא שזהו קובץ VTT שהופק על ידי Teams.');
    }

    const { outputFolder } = ensureFolders();
    const title = meetingTitleFromFilename(originalName);
    const dateLabel = sourceDate.toLocaleDateString('he-IL');
    const dayFolder = sourceDate.toISOString().slice(0, 10);
    const speakers = speakersOf(cues);
    const duration = cues[cues.length - 1].end;

    let folderName = `${dayFolder}_${slugify(title)}`;
    let dest = path.join(outputFolder, folderName);
    let attempt = 1;
    while (fs.existsSync(dest)) {
        attempt += 1;
        dest = path.join(outputFolder, `${folderName}-${attempt}`);
    }
    fs.mkdirSync(dest, { recursive: true });

    const meta = {
        id: path.basename(dest),
        title,
        dateLabel,
        createdAt: sourceDate.toISOString(),
        speakers,
        durationLabel: formatDuration(duration),
        cueCount: cues.length,
        originalName
    };

    fs.writeFileSync(path.join(dest, 'meta.json'), JSON.stringify(meta, null, 4), 'utf8');
    fs.writeFileSync(path.join(dest, 'cues.json'), JSON.stringify(cues, null, 2), 'utf8');
    fs.writeFileSync(path.join(dest, 'transcript.md'), buildMarkdown({ title, dateLabel, speakers, cues }), 'utf8');
    fs.writeFileSync(path.join(dest, 'transcript.txt'), buildPlainText({ title, dateLabel, speakers, cues }), 'utf8');
    fs.writeFileSync(path.join(dest, 'original.vtt'), vttContent, 'utf8');

    return meta;
}

export function listTranscripts() {
    const { outputFolder } = ensureFolders();
    const entries = fs.readdirSync(outputFolder, { withFileTypes: true }).filter((e) => e.isDirectory());

    const transcripts = [];
    for (const entry of entries) {
        const metaPath = path.join(outputFolder, entry.name, 'meta.json');
        if (!fs.existsSync(metaPath)) continue;
        try {
            transcripts.push(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
        } catch {
            // skip corrupt entries
        }
    }

    return transcripts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getTranscript(id) {
    const { outputFolder } = ensureFolders();
    const dir = path.join(outputFolder, id);
    const metaPath = path.join(dir, 'meta.json');
    const cuesPath = path.join(dir, 'cues.json');
    if (!isInside(outputFolder, dir) || !fs.existsSync(metaPath)) return null;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const cues = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
    return { ...meta, cues };
}

export function deleteTranscript(id) {
    const { outputFolder } = ensureFolders();
    const dir = path.join(outputFolder, id);
    if (!isInside(outputFolder, dir) || !fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
}

export function getDownloadPath(id, format) {
    const { outputFolder } = ensureFolders();
    const dir = path.join(outputFolder, id);
    const file = path.join(dir, format === 'md' ? 'transcript.md' : 'transcript.txt');
    if (!isInside(outputFolder, dir) || !fs.existsSync(file)) return null;
    return file;
}

function isInside(parent, child) {
    const rel = path.relative(parent, child);
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}
