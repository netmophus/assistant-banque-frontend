/** @type {import('next').NextConfig} */
const nextConfig = {
  // Masquage des préfixes de rôle dans l'URL publique.
  // Les fichiers restent dans app/admin, app/org, app/user, app/agent ;
  // seule la barre d'adresse affiche /m1, /m2, /m3, /m4 quand l'app navigue
  // via ces préfixes. Les chemins originaux continuent de fonctionner (pas
  // de regression si un lien n'a pas été migré).
  async rewrites() {
    return [
      { source: '/m1/:path*', destination: '/admin/:path*' },
      { source: '/m2/:path*', destination: '/org/:path*' },
      { source: '/m3/:path*', destination: '/user/:path*' },
      { source: '/m4/:path*', destination: '/agent/:path*' },
    ];
  },
};

module.exports = nextConfig;
