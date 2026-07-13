// Parses WebVTT transcripts as exported by Microsoft Teams ("Save transcript"),
// where each cue is tagged with the speaker's Teams display name:
//   00:00:03.500 --> 00:00:07.200
//   <v Jane Doe>Hello everyone, thanks for joining.</v>
const TIME_LINE = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;
const VOICE_TAG = /<v\s+([^>]+)>([\s\S]*?)(?:<\/v>)?$/i;

function toSeconds(timestamp) {
    const [h, m, s] = timestamp.split(':');
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function stripTags(text) {
    return text.replace(/<[^>]+>/g, '').trim();
}

export function parseVtt(content) {
    const normalized = content.replace(/\r\n/g, '\n').trim();
    const blocks = normalized.split(/\n\s*\n/);
    const cues = [];

    for (const block of blocks) {
        const lines = block.split('\n').filter(Boolean);
        const timeLineIndex = lines.findIndex((line) => TIME_LINE.test(line));
        if (timeLineIndex === -1) continue;

        const timeMatch = lines[timeLineIndex].match(TIME_LINE);
        const textLines = lines.slice(timeLineIndex + 1);
        if (textLines.length === 0) continue;

        const joined = textLines.join('\n');
        const voiceMatch = joined.match(VOICE_TAG);
        const speaker = voiceMatch ? voiceMatch[1].trim() : 'לא ידוע';
        const text = stripTags(voiceMatch ? voiceMatch[2] : joined);
        if (!text) continue;

        cues.push({
            start: toSeconds(timeMatch[1]),
            end: toSeconds(timeMatch[2]),
            startLabel: timeMatch[1].slice(0, 8),
            speaker,
            text
        });
    }

    return cues;
}

export function speakersOf(cues) {
    return [...new Set(cues.map((cue) => cue.speaker))];
}
