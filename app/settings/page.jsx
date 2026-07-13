import { SettingsForm } from 'components/settings-form';
import { getConfig } from 'lib/config';
import { watcherStatus } from 'lib/watcher';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'הגדרות' };

export default function SettingsPage() {
    const config = getConfig();
    const status = watcherStatus();

    return (
        <div className="flex flex-col gap-8">
            <h1>הגדרות</h1>
            <SettingsForm initialConfig={config} initialStatus={status} />

            <div className="flex flex-col gap-2 text-sm text-neutral-300">
                <h2 className="text-neutral-100">איך שומרים תמלול ב-Teams</h2>
                <ol className="pr-5 list-decimal">
                    <li>בפגישת Teams לחצו על &laquo;עוד פעולות&raquo; (שלוש הנקודות).</li>
                    <li>בחרו &laquo;שפה ותמלול&raquo; ← &laquo;הפעלת תמלול&raquo;.</li>
                    <li>בסיום הפגישה, מתוך אותו תפריט בחרו &laquo;שמירת תמלול&raquo; &mdash; קובץ ה-VTT יורד לתיקיית ההורדות שלכם.</li>
                    <li>TIMLUL.AI עוקב אחרי התיקייה הזו ומעבד את הקובץ אוטומטית תוך שניות.</li>
                </ol>
            </div>
        </div>
    );
}
