import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Miznas Pilot",
  description:
    "Conditions générales d'utilisation de la plateforme Miznas Pilot, solution d'intelligence artificielle au service de la décision bancaire.",
};

export default function ConditionsUtilisationPage() {
  return (
    <article className="legal-prose">
      <header className="mb-10 not-prose">
        <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
          Document légal
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Conditions d'utilisation
        </h1>
        <div className="h-px w-24 bg-gradient-to-r from-[#C9A84C] to-transparent" />
      </header>

      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (ci-après « <strong>CGU</strong> »)
          ont pour objet de définir les modalités et conditions dans lesquelles{' '}
          <strong>Softlink Technologies</strong> (ci-après « <strong>l'Éditeur</strong> »)
          met à disposition de ses
          utilisateurs (ci-après « <strong>l'Utilisateur</strong> ») la plateforme
          Miznas Pilot, solution d'intelligence artificielle dédiée à la décision
          bancaire et au pilotage financier dans la zone UEMOA.
        </p>
      </section>

      <section>
        <h2>2. Acceptation des conditions</h2>
        <p>
          L'accès et l'utilisation de la plateforme impliquent l'acceptation pleine et
          entière, sans réserve, des présentes CGU. L'Utilisateur reconnaît avoir pris
          connaissance de ces conditions avant toute utilisation et s'engage à les
          respecter. Toute utilisation de la plateforme postérieure à une modification
          des CGU vaut acceptation tacite de cette modification.
        </p>
      </section>

      <section>
        <h2>3. Accès à la plateforme</h2>
        <p>
          L'accès à Miznas Pilot est réservé aux professionnels habilités, notamment
          les établissements bancaires, institutions financières, organismes de
          microfinance et leurs collaborateurs autorisés. L'inscription est soumise à
          validation par l'Éditeur. Chaque Utilisateur s'engage à :
        </p>
        <ul>
          <li>fournir des informations exactes, complètes et à jour lors de son inscription ;</li>
          <li>préserver la confidentialité de ses identifiants de connexion ;</li>
          <li>ne pas partager ses accès avec un tiers non autorisé ;</li>
          <li>informer immédiatement l'Éditeur de toute utilisation non autorisée de son compte.</li>
        </ul>
      </section>

      <section>
        <h2>4. Services proposés</h2>
        <p>
          Miznas Pilot met à disposition un ensemble d'outils basés sur l'intelligence
          artificielle pour assister les décisions bancaires, incluant notamment :
        </p>
        <ul>
          <li>l'analyse de crédit et le scoring ;</li>
          <li>le suivi et le recouvrement des impayés ;</li>
          <li>la production et l'analyse des états financiers PCB-UEMOA ;</li>
          <li>les modules de formation et d'accompagnement des équipes.</li>
        </ul>
        <p>
          L'Éditeur se réserve le droit de faire évoluer, suspendre ou supprimer tout
          ou partie des services sans préavis.
        </p>
      </section>

      <section>
        <h2>5. Obligations de l'Utilisateur</h2>
        <p>L'Utilisateur s'engage à utiliser la plateforme :</p>
        <ul>
          <li>conformément à sa destination professionnelle ;</li>
          <li>dans le respect des lois et règlements en vigueur, notamment ceux relatifs au secret bancaire et à la protection des données ;</li>
          <li>sans compromettre la sécurité, l'intégrité ou la disponibilité du service ;</li>
          <li>sans tenter d'accéder à des zones réservées, de contourner les mesures de sécurité, ou d'extraire massivement des données.</li>
        </ul>
      </section>

      <section>
        <h2>6. Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments composant la plateforme Miznas Pilot (textes,
          graphismes, logos, codes sources, algorithmes, modèles d'IA, bases de
          données) sont la propriété exclusive de l'Éditeur ou de ses partenaires et
          sont protégés par les lois relatives à la propriété intellectuelle. Toute
          reproduction, représentation, modification ou exploitation non autorisée est
          strictement interdite.
        </p>
      </section>

      <section>
        <h2>7. Responsabilité</h2>
        <p>
          L'Éditeur s'engage à mettre en œuvre les moyens nécessaires pour assurer le
          bon fonctionnement de la plateforme. Toutefois, les résultats fournis par
          les modules d'intelligence artificielle constituent une aide à la décision
          et ne sauraient en aucun cas se substituer au jugement professionnel de
          l'Utilisateur. L'Éditeur ne saurait être tenu responsable des décisions
          prises sur la base des recommandations produites par la plateforme.
        </p>
        <p>
          L'Éditeur ne peut être tenu responsable des dommages indirects résultant de
          l'utilisation ou de l'impossibilité d'utiliser la plateforme, ni des
          interruptions liées à la maintenance, à des cas de force majeure ou à des
          défaillances de réseau.
        </p>
      </section>

      <section>
        <h2>8. Disponibilité</h2>
        <p>
          La plateforme est accessible 24h/24 et 7j/7, sous réserve des opérations de
          maintenance programmées ou d'événements indépendants de la volonté de
          l'Éditeur. L'Éditeur s'efforce d'informer les Utilisateurs à l'avance de
          toute interruption planifiée.
        </p>
      </section>

      <section>
        <h2>9. Suspension et résiliation</h2>
        <p>
          L'Éditeur se réserve le droit de suspendre ou de résilier, sans préavis et
          sans indemnité, l'accès à la plateforme à tout Utilisateur qui ne
          respecterait pas les présentes CGU ou qui ferait un usage contraire aux
          lois en vigueur.
        </p>
      </section>

      <section>
        <h2>10. Loi applicable et juridiction compétente</h2>
        <p>
          Les présentes CGU sont régies par le droit nigérien et le droit
          communautaire UEMOA. Tout litige relatif à leur interprétation ou à leur
          exécution relève de la compétence exclusive des tribunaux de Niamey, après
          tentative préalable de règlement amiable.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Pour toute question relative aux présentes CGU, l'Utilisateur peut contacter
          l'Éditeur à l'adresse :{' '}
          <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>.
        </p>
      </section>
    </article>
  );
}
