import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.timlul-ai');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function defaultConfig() {
    return {
        watchFolder: path.join(os.homedir(), 'Downloads'),
        outputFolder: path.join(os.homedir(), 'TIMLUL.AI Transcripts')
    };
}

export function getConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        return { ...defaultConfig(), ...JSON.parse(raw) };
    } catch {
        return defaultConfig();
    }
}

export function saveConfig(partial) {
    const next = { ...getConfig(), ...partial };
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 4), 'utf8');
    return next;
}
