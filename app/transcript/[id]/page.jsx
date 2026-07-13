import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DeleteTranscriptButton } from 'components/delete-transcript-button';
import { SpeakerBubble } from 'components/speaker-bubble';
import { getTranscript } from 'lib/transcripts';

export const dynamic = 'force-dynamic';

export default async function TranscriptPage({ params }) {
    const { id } = await params;
    const transcript = getTranscript(id);
    if (!transcript) notFound();

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="mb-2">{transcript.title}</h1>
                    <p className="text-neutral-300">
                        {transcript.dateLabel} &middot; {transcript.durationLabel} &middot; דוברים:{' '}
                        {transcript.speakers.join(', ')}
                    </p>
                </div>
                <Link href="/" className="btn">
                    &larr; חזרה לרשימה
                </Link>
            </div>

            <div className="flex flex-wrap gap-3">
                <a className="btn" href={`/api/transcripts/${transcript.id}/download?format=txt`}>
                    הורדה כטקסט
                </a>
                <a className="btn" href={`/api/transcripts/${transcript.id}/download?format=md`}>
                    הורדה כ-Markdown
                </a>
                <DeleteTranscriptButton id={transcript.id} />
            </div>

            <div className="flex flex-col gap-3">
                {transcript.cues.map((cue, index) => (
                    <SpeakerBubble key={index} speaker={cue.speaker} startLabel={cue.startLabel} text={cue.text} />
                ))}
            </div>
        </div>
    );
}
