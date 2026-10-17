import type { SVGProps } from 'react';

type IconName = 'arrow' | 'close' | 'copy' | 'document' | 'external' | 'github' | 'menu' | 'reset';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

/** Shared outline icon family for the playground interface. */
export function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    document: <><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h5M10 17h5"/></>,
    external: <><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M18 13v6H5V6h6"/></>,
    github: <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.93c.46.08.63-.2.63-.45v-1.76c-2.56.56-3.1-1.09-3.1-1.09-.42-1.06-1.02-1.34-1.02-1.34-.84-.57.06-.56.06-.56.92.07 1.41.95 1.41.95.82 1.4 2.15 1 2.68.76.08-.59.32-1 .58-1.23-2.04-.23-4.19-1.02-4.19-4.55 0-1 .36-1.83.95-2.47-.1-.23-.41-1.17.09-2.43 0 0 .77-.25 2.53.94a8.8 8.8 0 0 1 4.6 0c1.76-1.19 2.53-.94 2.53-.94.5 1.26.19 2.2.1 2.43.59.64.94 1.46.94 2.47 0 3.54-2.15 4.31-4.2 4.54.33.29.62.85.62 1.71v2.55c0 .25.17.54.63.45A9.2 9.2 0 0 0 12 2.8Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    reset: <><path d="M4 4v6h6"/><path d="M5.3 15.2A8 8 0 1 0 6 7.3L4 10"/></>
  };

  return (
    <svg
      aria-hidden="true"
      fill={name === 'github' ? 'currentColor' : 'none'}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...(name === 'github' ? {} : { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.75 })}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

/** Compact code-bracket mark used in navigation and the footer. */
export function BrandMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 34 28">
      <path d="M12 3 2 14l10 11M22 3l10 11-10 11" />
    </svg>
  );
}
