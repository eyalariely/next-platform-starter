import Link from 'next/link';
import { Card } from './card';

export function TranscriptCard({ transcript }) {
    return (
        <Link href={`/transcript/${transcript.id}`}>
            <Card className="transition hover:opacity-90">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-neutral-900">{transcript.title}</h3>
                    <span className="text-sm shrink-0 text-neutral-500">{transcript.durationLabel}</span>
                </div>
                <p className="text-sm text-neutral-500">{transcript.dateLabel}</p>
                <p className="text-sm text-neutral-600">דוברים: {transcript.speakers.join(', ')}</p>
            </Card>
        </Link>
    );
}
