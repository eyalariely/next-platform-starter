import Link from 'next/link';

const navItems = [
    { linkText: 'תמלולים', href: '/' },
    { linkText: 'הגדרות', href: '/settings' }
];

export function Header() {
    return (
        <nav className="flex flex-wrap items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary">
                TIMLUL.AI
            </Link>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:mr-auto">
                {navItems.map((item, index) => (
                    <li key={index}>
                        <Link href={item.href} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2">
                            {item.linkText}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
