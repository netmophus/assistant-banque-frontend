'use client';

import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

/**
 * Page intermediaire affichee quand un utilisateur mobile (ou desktop en
 * viewport etroit) tente d'acceder a une zone privee de www.miznas.co.
 *
 * Au lieu de le rediriger brutalement vers app.miznas.co, on lui propose :
 *   - un QR code pour scanner depuis son telephone
 *   - un bouton direct pour continuer vers l'app mobile
 *   - un retour vers la home
 */
export default function MobileRedirectPage() {
  const appUrl = 'https://app.miznas.co';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1b3a8c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#070E28',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '0.5rem',
          }}
        >
          MIZNAS PILOT
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#c9a34e',
            marginBottom: '2rem',
          }}
        >
          L&apos;IA au service de la décision bancaire
        </p>

        <div
          style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '12px',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          <QRCodeSVG value={appUrl} size={180} />
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: '0.5rem',
          }}
        >
          📱 Disponible sur mobile
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '2rem',
            lineHeight: 1.5,
          }}
        >
          Cette interface est optimisée pour mobile.
          <br />
          Scannez le QR code avec votre téléphone pour une meilleure expérience.
        </p>

        <a
          href={appUrl}
          style={{
            display: 'block',
            backgroundColor: '#c9a34e',
            color: '#1b1b1b',
            padding: '14px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '16px',
            marginBottom: '1rem',
          }}
        >
          → Continuer vers l&apos;app mobile
        </a>

        <Link
          href="/"
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            textDecoration: 'underline',
          }}
        >
          ← Revenir à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
