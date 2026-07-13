'use client';

import { useState } from 'react';
import { Alert } from './alert';

export function SettingsForm({ initialConfig, initialStatus }) {
    const [watchFolder, setWatchFolder] = useState(initialConfig.watchFolder);
    const [outputFolder, setOutputFolder] = useState(initialConfig.outputFolder);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [watcherStatus, setWatcherStatus] = useState(initialStatus);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus('pending');
        setError(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ watchFolder, outputFolder })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת ההגדרות');
            setWatcherStatus(data.status);
            setStatus('ok');
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-w-xl gap-4">
            <label className="flex flex-col gap-1">
                <span className="text-sm font-bold">תיקיית מעקב (איפה Teams שומר את קובצי ה-VTT, בד&quot;כ ההורדות)</span>
                <input
                    className="input"
                    value={watchFolder}
                    onChange={(e) => setWatchFolder(e.target.value)}
                    required
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-sm font-bold">תיקיית פלט (איפה לשמור את התמלולים המעובדים)</span>
                <input
                    className="input"
                    value={outputFolder}
                    onChange={(e) => setOutputFolder(e.target.value)}
                    required
                />
            </label>
            <button className="btn sm:self-start" type="submit" disabled={status === 'pending'}>
                {status === 'pending' ? 'שומר...' : 'שמירת הגדרות'}
            </button>
            {status === 'ok' && <Alert type="success">ההגדרות נשמרו והמעקב הופעל מחדש.</Alert>}
            {status === 'error' && <Alert type="error">{error}</Alert>}

            <p className="text-sm text-neutral-300">
                סטטוס מעקב: {watcherStatus.watching ? `פעיל על ${watcherStatus.folder}` : 'לא פעיל'}
                {watcherStatus.error && ` (שגיאה: ${watcherStatus.error})`}
            </p>
        </form>
    );
}
