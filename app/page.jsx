import Link from 'next/link';
import { Card } from 'components/card';
import { ImportTranscript } from 'components/import-transcript';
import { TranscriptCard } from 'components/transcript-card';
import { listTranscripts } from 'lib/transcripts';
import { getConfig } from 'lib/config';

export const dynamic = 'force-dynamic';

export default function Page() {
    const transcripts = listTranscripts();
    const { watchFolder } = getConfig();

    return (
        <div className="flex flex-col gap-12 sm:gap-16">
            <section>
                <h1 className="mb-4">TIMLUL.AI</h1>
                <p className="mb-6 text-lg">
                    תמלול אוטומטי של פגישות Teams עם זיהוי דוברים, נשמר מקומית על המחשב שלך.
                </p>
                <ImportTranscript />
            </section>

            <section className="flex flex-col gap-4">
                <h2>התמלולים שלך ({transcripts.length})</h2>
                {transcripts.length === 0 ? (
                    <Card>
                        <p className="font-bold text-neutral-900">עדיין אין תמלולים</p>
                        <p>
                            TIMLUL.AI עוקב אחרי תיקיית <code>{watchFolder}</code> ומחפש קובצי תמלול (.vtt) ששמרת
                            מ-Teams. בפגישת Teams: לחצו על &laquo;...&raquo; (עוד פעולות) &larr; &laquo;שפה ותמלול&raquo;
                            &larr; &laquo;הפעלת כתוביות חיות&raquo;, ובסיום הפגישה &laquo;שמירת תמלול&raquo; &mdash;
                            הקובץ יורד אוטומטית לתיקיית ההורדות, ו-TIMLUL.AI יעבד אותו לבד.
                        </p>
                        <p>
                            אפשר גם לבדוק/לשנות את התיקייה הנצפית בעמוד <Link href="/settings">ההגדרות</Link>, או לייבא
                            קובץ VTT באופן ידני למעלה.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {transcripts.map((t) => (
                            <TranscriptCard key={t.id} transcript={t} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
