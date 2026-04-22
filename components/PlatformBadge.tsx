/**
 * PlatformBadge / PlatformBadgeRow — badges "disponible sur Mobile / Desktop"
 * pour les cartes modules de la home. Indique clairement aux visiteurs
 * sur quelles plateformes chaque fonctionnalite est disponible.
 */

type Platform = 'mobile' | 'desktop';

type Props = {
  platform: Platform;
  variant: 'available' | 'desktop-only';
};

const MobileIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="2" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const DesktopIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export function PlatformBadge({ platform, variant }: Props) {
  const isAvailable = variant === 'available';

  // Vert = disponible sur cette plateforme
  // Bleu = badge unique Desktop pour modules desktop-only
  const bgColor = isAvailable ? '#E1F5EE' : '#E6F1FB';
  const textColor = isAvailable ? '#0F6E56' : '#185FA5';

  const Icon = platform === 'mobile' ? MobileIcon : DesktopIcon;
  const label = platform === 'mobile' ? 'Mobile' : 'Desktop';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: bgColor,
        color: textColor,
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon />
      {label}
    </span>
  );
}

type BadgeRowProps = {
  availableOn: 'both' | 'desktop-only';
};

export function PlatformBadgeRow({ availableOn }: BadgeRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        marginTop: '12px',
        flexWrap: 'nowrap',
      }}
    >
      {availableOn === 'both' ? (
        <>
          <PlatformBadge platform="mobile" variant="available" />
          <PlatformBadge platform="desktop" variant="available" />
        </>
      ) : (
        <PlatformBadge platform="desktop" variant="desktop-only" />
      )}
    </div>
  );
}
