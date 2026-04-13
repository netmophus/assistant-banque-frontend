import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — Miznas Pilot',
  description:
    'Mentions légales de la plateforme Miznas Pilot : éditeur, hébergeur, propriété intellectuelle et informations de contact.',
};

export default function MentionsLegalesPage() {
  return (
    <article className="legal-prose">
      <header className="mb-10 not-prose">
        <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
          Document légal
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Mentions légales
        </h1>
        <div className="h-px w-24 bg-gradient-to-r from-[#C9A84C] to-transparent" />
      </header>

      <section>
        <h2>1. Éditeur du site</h2>
        <p>
          Le site et la plateforme <strong>Miznas Pilot</strong> sont édités par
          <strong> Softlink Technologies</strong>, entité spécialisée dans le développement
          de solutions d'intelligence artificielle au service de la décision bancaire
          dans la zone UEMOA.
        </p>
        <ul>
          <li><strong>Dénomination :</strong> Softlink Technologies</li>
          <li><strong>Siège social :</strong> Niamey, Niger — Quartier Koubia</li>
          <li><strong>Téléphone :</strong> +227 80 64 83 83</li>
          <li>
            <strong>Email :</strong>{' '}
            <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>
          </li>
          <li>
            <strong>Site web éditeur :</strong>{' '}
            <a href="https://www.softlink-groupe.com" target="_blank" rel="noopener noreferrer">
              www.softlink-groupe.com
            </a>
          </li>
          <li>
            <strong>Plateforme :</strong>{' '}
            <a href="https://www.miznas.co" target="_blank" rel="noopener noreferrer">
              www.miznas.co
            </a>
          </li>
          <li><strong>RCCM :</strong> NE-NIM-01-2024-B12-00537</li>
          <li><strong>NIF :</strong> 132352/R</li>
          <li><strong>Représentant légal :</strong> Mme KANE Jamila S.M</li>
        </ul>
      </section>

      <section>
        <h2>2. Directeur de la publication</h2>
        <p>
          Le Directeur de la publication est le représentant légal de Softlink Technologies.
          Il est joignable via l'adresse email indiquée ci-dessus.
        </p>
      </section>

      <section>
        <h2>3. Hébergement</h2>
        <p>
          La plateforme Miznas Pilot est hébergée sur une infrastructure cloud
          sécurisée conforme aux standards internationaux en matière de protection
          des données et de continuité de service. Les informations précises relatives
          à l'hébergeur peuvent être obtenues sur simple demande à{' '}
          <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>.
        </p>
      </section>

      <section>
        <h2>4. Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus présents sur la plateforme — textes, images, logos,
          graphismes, icônes, interfaces, code source, algorithmes, modèles
          d'intelligence artificielle, bases de données et architecture du site —
          sont la propriété exclusive de Softlink Technologies ou de ses partenaires, et
          sont protégés par les législations en vigueur relatives à la propriété
          intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, diffusion, modification, adaptation ou
          exploitation, totale ou partielle, par quelque procédé que ce soit, sans
          l'autorisation écrite préalable de l'Éditeur, est strictement interdite et
          constituerait une contrefaçon sanctionnée par la loi.
        </p>
      </section>

      <section>
        <h2>5. Marques</h2>
        <p>
          Les marques « <strong>Miznas</strong> », « <strong>Miznas Pilot</strong> »
          et « <strong>Softlink Technologies</strong> », ainsi que leurs logos associés,
          sont des marques protégées. Toute utilisation non autorisée de ces marques
          engage la responsabilité de son auteur.
        </p>
      </section>

      <section>
        <h2>6. Liens hypertextes</h2>
        <p>
          La plateforme peut contenir des liens vers des sites tiers. L'Éditeur
          n'exerce aucun contrôle sur le contenu de ces sites et décline toute
          responsabilité quant à leur contenu, à leur politique de confidentialité
          ou à leur disponibilité. La création de liens vers la plateforme Miznas
          Pilot est soumise à l'autorisation préalable de l'Éditeur.
        </p>
      </section>

      <section>
        <h2>7. Conformité réglementaire</h2>
        <p>
          Miznas Pilot est conçu pour respecter les exigences du Plan Comptable
          Bancaire de l'UEMOA (<strong>PCB-UEMOA</strong>) ainsi que les meilleurs
          standards internationaux en matière de sécurité de l'information
          (<strong>ISO 27001</strong>). L'Éditeur s'engage à maintenir la plateforme
          en conformité avec l'évolution des réglementations applicables au secteur
          bancaire de la zone UEMOA.
        </p>
      </section>

      <section>
        <h2>8. Responsabilité</h2>
        <p>
          L'Éditeur met tout en œuvre pour offrir aux utilisateurs des informations
          et des outils fiables. Toutefois, il ne peut garantir l'exactitude, la
          complétude ou l'actualité des contenus diffusés sur la plateforme, et ne
          saurait être tenu responsable des erreurs, omissions ou des conséquences
          de leur utilisation. Les résultats produits par les modules d'intelligence
          artificielle constituent une aide à la décision et ne se substituent pas
          au jugement professionnel de l'utilisateur.
        </p>
      </section>

      <section>
        <h2>9. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont régies par le droit nigérien et le
          droit communautaire UEMOA. Tout litige sera soumis à la juridiction
          exclusive des tribunaux compétents de Niamey, après tentative de
          règlement amiable.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Pour toute question relative aux présentes mentions légales :<br />
          <strong>Softlink Technologies</strong> — Niamey, Niger<br />
          Email :{' '}
          <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>
          <br />
          Téléphone : +227 80 64 83 83
        </p>
      </section>
    </article>
  );
}
