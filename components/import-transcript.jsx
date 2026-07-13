'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from './alert';

export function ImportTranscript() {
    const inputRef = useRef(null);
    const router = useRouter();
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const handleFile = async (file) => {
        if (!file) return;
        setStatus('pending');
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/transcripts/import', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'שגיאה בייבוא הקובץ');
            setStatus('ok');
            router.refresh();
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <input
                ref={inputRef}
                type="file"
                accept=".vtt"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button type="button" className="btn" onClick={() => inputRef.current?.click()} disabled={status === 'pending'}>
                {status === 'pending' ? 'מייבא...' : 'ייבוא קובץ תמלול (VTT) ידני'}
            </button>
            {status === 'ok' && <Alert type="success">התמלול יובא ונשמר בהצלחה.</Alert>}
            {status === 'error' && <Alert type="error">{error}</Alert>}
        </div>
    );
}
