const PALETTE = [
    'bg-teal-500/20 text-teal-200 border-teal-400/40',
    'bg-violet-500/20 text-violet-200 border-violet-400/40',
    'bg-amber-500/20 text-amber-200 border-amber-400/40',
    'bg-rose-500/20 text-rose-200 border-rose-400/40',
    'bg-sky-500/20 text-sky-200 border-sky-400/40',
    'bg-lime-500/20 text-lime-200 border-lime-400/40'
];

export function speakerColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
    }
    return PALETTE[Math.abs(hash)];
}

export function SpeakerBubble({ speaker, startLabel, text }) {
    return (
        <div className={['flex flex-col gap-1 px-4 py-3 border rounded-lg', speakerColor(speaker)].join(' ')}>
            <div className="flex items-baseline gap-2 text-xs opacity-80">
                <span className="font-bold">{speaker}</span>
                <span>{startLabel}</span>
            </div>
            <p className="text-sm leading-relaxed text-white">{text}</p>
        </div>
    );
}
