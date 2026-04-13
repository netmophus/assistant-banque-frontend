import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Miznas Pilot',
  description:
    'Politique de confidentialité et de protection des données personnelles de la plateforme Miznas Pilot.',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <article className="legal-prose">
      <header className="mb-10 not-prose">
        <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C] mb-3">
          Document légal
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Politique de confidentialité
        </h1>
        <div className="h-px w-24 bg-gradient-to-r from-[#C9A84C] to-transparent" />
      </header>

      <section>
        <p>
          La présente politique de confidentialité décrit la manière dont{' '}
          <strong>Softlink Technologies</strong> (ci-après « <strong>l'Éditeur</strong> »)
          collecte, utilise, conserve et protège les données personnelles des
          utilisateurs de la plateforme <strong>Miznas Pilot</strong>. Elle
          s'applique à toute personne qui accède à la plateforme, quel que soit son
          rôle (administrateur, agent, utilisateur invité).
        </p>
        <p>
          L'Éditeur accorde une importance primordiale à la protection de la vie
          privée et à la confidentialité des informations traitées, conformément aux
          exigences du secret bancaire et aux meilleures pratiques internationales.
        </p>
      </section>

      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles est Softlink Technologies,
          dont le siège est situé à Niamey, Niger — Quartier Koubia. Pour toute
          question relative au traitement de vos données, vous pouvez contacter
          l'équipe confidentialité à l'adresse :{' '}
          <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation de la plateforme, nous collectons :</p>
        <ul>
          <li>
            <strong>Données d'identification :</strong> nom, prénom, adresse email
            professionnelle, numéro de téléphone, fonction au sein de l'institution.
          </li>
          <li>
            <strong>Données de connexion :</strong> identifiants, mot de passe
            (chiffré), date et heure de connexion, adresse IP, type de navigateur.
          </li>
          <li>
            <strong>Données d'usage :</strong> actions effectuées sur la plateforme,
            modules consultés, historique des analyses et requêtes.
          </li>
          <li>
            <strong>Données métier :</strong> informations relatives aux dossiers de
            crédit, impayés, états financiers — traitées pour le compte de
            l'institution cliente dans le cadre du contrat de service.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités du traitement</h2>
        <p>Les données collectées sont traitées pour les finalités suivantes :</p>
        <ul>
          <li>fournir l'accès aux services de la plateforme Miznas Pilot ;</li>
          <li>authentifier les utilisateurs et sécuriser leurs accès ;</li>
          <li>produire les analyses, scorings et rapports demandés ;</li>
          <li>assurer la maintenance, la supervision et l'amélioration continue de la plateforme ;</li>
          <li>prévenir et détecter les fraudes et les incidents de sécurité ;</li>
          <li>répondre aux obligations légales, réglementaires et prudentielles applicables.</li>
        </ul>
      </section>

      <section>
        <h2>4. Base légale</h2>
        <p>
          Les traitements reposent sur l'exécution du contrat conclu entre l'Éditeur
          et l'institution cliente, sur le consentement de l'utilisateur lorsque
          requis, sur le respect des obligations légales applicables, et sur
          l'intérêt légitime de l'Éditeur à sécuriser et améliorer ses services.
        </p>
      </section>

      <section>
        <h2>5. Destinataires des données</h2>
        <p>Les données personnelles peuvent être transmises, dans la limite de leurs besoins respectifs :</p>
        <ul>
          <li>aux équipes internes habilitées de Softlink Technologies (support, sécurité, développement) ;</li>
          <li>à l'institution cliente dont relève l'utilisateur ;</li>
          <li>aux prestataires techniques (hébergeur, fournisseurs d'infrastructure) tenus par des obligations strictes de confidentialité ;</li>
          <li>aux autorités compétentes sur demande légale.</li>
        </ul>
        <p>
          Aucune donnée n'est cédée, louée ou vendue à des tiers à des fins
          commerciales.
        </p>
      </section>

      <section>
        <h2>6. Durée de conservation</h2>
        <p>
          Les données sont conservées pour la durée nécessaire à la réalisation des
          finalités décrites, augmentée des durées légales de conservation
          applicables au secteur bancaire. Les données de connexion sont
          généralement conservées pour une durée de douze (12) mois. À l'issue des
          durées applicables, les données sont supprimées ou anonymisées.
        </p>
      </section>

      <section>
        <h2>7. Sécurité des données</h2>
        <p>
          L'Éditeur met en œuvre des mesures techniques et organisationnelles
          conformes aux standards <strong>ISO 27001</strong> pour protéger les
          données contre tout accès non autorisé, divulgation, altération ou
          destruction. Ces mesures incluent notamment :
        </p>
        <ul>
          <li>le chiffrement des données en transit et au repos ;</li>
          <li>le contrôle strict des accès basé sur les rôles ;</li>
          <li>la journalisation et la supervision des événements de sécurité ;</li>
          <li>des sauvegardes régulières et un plan de continuité d'activité ;</li>
          <li>des audits et tests de sécurité périodiques.</li>
        </ul>
      </section>

      <section>
        <h2>8. Droits des personnes concernées</h2>
        <p>
          Conformément aux réglementations applicables en matière de protection des
          données personnelles, chaque utilisateur dispose des droits suivants :
        </p>
        <ul>
          <li><strong>Droit d'accès</strong> à ses données ;</li>
          <li><strong>Droit de rectification</strong> en cas d'inexactitude ;</li>
          <li><strong>Droit à l'effacement</strong> dans les cas prévus par la loi ;</li>
          <li><strong>Droit à la limitation</strong> du traitement ;</li>
          <li><strong>Droit d'opposition</strong> pour motif légitime ;</li>
          <li><strong>Droit à la portabilité</strong> de ses données.</li>
        </ul>
        <p>
          Ces droits peuvent être exercés en adressant une demande écrite,
          accompagnée d'un justificatif d'identité, à{' '}
          <a href="mailto:contact@softlink-groupe.com">contact@softlink-groupe.com</a>.
          Une réponse sera apportée dans un délai maximum d'un mois.
        </p>
      </section>

      <section>
        <h2>9. Cookies et traceurs</h2>
        <p>
          La plateforme utilise des cookies strictement nécessaires à son
          fonctionnement (authentification, sécurité, préférences d'affichage) ainsi
          que, le cas échéant, des cookies de mesure d'audience anonymisés. Aucun
          cookie publicitaire ou de suivi comportemental n'est déposé. L'utilisateur
          peut configurer son navigateur pour refuser les cookies, étant précisé que
          certaines fonctionnalités pourront alors être dégradées.
        </p>
      </section>

      <section>
        <h2>10. Transfert hors UEMOA</h2>
        <p>
          Les données sont principalement hébergées et traitées au sein de la zone
          UEMOA. En cas de transfert vers un pays tiers, l'Éditeur s'assure que des
          garanties appropriées sont mises en place pour assurer un niveau de
          protection équivalent.
        </p>
      </section>

      <section>
        <h2>11. Modification de la politique</h2>
        <p>
          L'Éditeur se réserve le droit de modifier la présente politique de
          confidentialité à tout moment afin de l'adapter aux évolutions légales,
          réglementaires ou techniques. La version applicable est celle en vigueur
          lors de l'accès à la plateforme. Les utilisateurs sont invités à la
          consulter régulièrement.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Pour toute question ou réclamation relative à la protection de vos
          données :<br />
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
