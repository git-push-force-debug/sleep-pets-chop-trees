// Small inline stroke icons (decorative: aria-hidden). Text labels always carry the meaning.
type P = { size?: number };
const svg = (size: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const BookIcon = ({ size = 14 }: P) => svg(size, <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />);
export const BulbIcon = ({ size = 18 }: P) => svg(size, <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />);
export const InfoIcon = ({ size = 18 }: P) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>);
export const WarnIcon = ({ size = 18 }: P) => svg(size, <><path d="M12 3 2 21h20L12 3z" /><path d="M12 10v5M12 18v.5" /></>);
export const PersonIcon = ({ size = 20 }: P) => svg(size, <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" /></>);
export const CloseIcon = ({ size = 20 }: P) => svg(size, <path d="M6 6l12 12M18 6 6 18" />);
export const SendIcon = ({ size = 20 }: P) => svg(size, <path d="M5 12h14M13 6l6 6-6 6" />);
export const CheckIcon = ({ size = 18 }: P) => svg(size, <path d="M20 6 9 17l-5-5" />);
export const ClockIcon = ({ size = 14 }: P) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M12 8v5l3 2" /></>);
export const ThumbIcon = ({ size = 16, down = false }: P & { down?: boolean }) => (
  <span style={{ display: 'inline-flex', transform: down ? 'rotate(180deg)' : undefined }}>
    {svg(size, <path d="M7 11v9H4v-9h3zm0 0 4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7" />)}
  </span>
);
export const PlayIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>
);
