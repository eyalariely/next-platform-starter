'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteTranscriptButton({ id }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleDelete = async () => {
        if (!confirm('למחוק את התמלול הזה לצמיתות?')) return;
        setBusy(true);
        const res = await fetch(`/api/transcripts/${id}`, { method: 'DELETE' });
        if (res.ok) {
            router.push('/');
            router.refresh();
        } else {
            setBusy(false);
        }
    };

    return (
        <button type="button" className="btn bg-rose-500 hover:bg-rose-500/85" onClick={handleDelete} disabled={busy}>
            {busy ? 'מוחק...' : 'מחיקת תמלול'}
        </button>
    );
}
