'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import CreditFieldConfigRow from './CreditFieldConfigRow';

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface CreditPMEFieldConfig {
  raison_sociale?: FieldConfig;
  secteur_activite?: FieldConfig;
  taille?: FieldConfig;
  nombre_employes?: FieldConfig;
  annee_creation?: FieldConfig;
  forme_juridique?: FieldConfig;
  positionnement?: FieldConfig;
  donnees_financieres?: FieldConfig;
  montant?: FieldConfig;
  objet?: FieldConfig;
  duree_mois?: FieldConfig;
  type_remboursement?: FieldConfig;
  garanties?: FieldConfig;
  valeur_garanties?: FieldConfig;
  source_remboursement?: FieldConfig;
  concentration_clients?: FieldConfig;
  dependance_fournisseur?: FieldConfig;
  historique_incidents?: FieldConfig;
}

interface CreditPMEConfigProps {
  hasActiveLicense: boolean;
}

const getDefaultPMEConfig = (): CreditPMEFieldConfig => ({
  raison_sociale: { enabled: true, required: true },
  secteur_activite: { enabled: true, required: true },
  taille: { enabled: true, required: true },
  nombre_employes: { enabled: true, required: false },
  annee_creation: { enabled: true, required: true },
  forme_juridique: { enabled: true, required: true },
  positionnement: { enabled: true, required: false },
  donnees_financieres: { enabled: true, required: true },
  montant: { enabled: true, required: true },
  objet: { enabled: true, required: true },
  duree_mois: { enabled: true, required: true },
  type_remboursement: { enabled: true, required: true },
  garanties: { enabled: true, required: false },
  valeur_garanties: { enabled: true, required: false },
  source_remboursement: { enabled: true, required: true },
  concentration_clients: { enabled: true, required: false },
  dependance_fournisseur: { enabled: true, required: false },
  historique_incidents: { enabled: true, required: false },
});

export default function CreditPMEConfig({ hasActiveLicense }: CreditPMEConfigProps) {
  const [pmeFieldConfig, setPmeFieldConfig] = useState<CreditPMEFieldConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPMEConfig();
  }, []);

  const loadPMEConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ field_config: CreditPMEFieldConfig }>('/credit/pme/config');
      if (response.field_config) {
        setPmeFieldConfig(response.field_config);
      } else {
        setPmeFieldConfig(getDefaultPMEConfig());
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config PME:', err);
      setPmeFieldConfig(getDefaultPMEConfig());
    } finally {
      setLoading(false);
    }
  };

  const handlePMEFieldConfigChange = (fieldName: string, property: 'enabled' | 'required', value: boolean) => {
    if (!pmeFieldConfig) return;
    setPmeFieldConfig({
      ...pmeFieldConfig,
      [fieldName]: {
        ...pmeFieldConfig[fieldName as keyof CreditPMEFieldConfig],
        [property]: value,
      },
    });
  };

  const handleSavePMEConfig = async () => {
    if (!pmeFieldConfig) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.put('/credit/pme/config', { field_config: pmeFieldConfig });
      setSuccess('Configuration PME/PMI sauvegardée avec succès ✅');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-[#CBD5E1]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        <p className="mt-4">Chargement de la configuration...</p>
      </div>
    );
  }

  if (!pmeFieldConfig) {
    return (
      <div className="text-center py-12 text-[#CBD5E1]">
        <p>Erreur lors du chargement de la configuration. Veuillez réessayer.</p>
        <button
          onClick={loadPMEConfig}
          className="mt-4 px-4 py-2 bg-[#F59E0B] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      <p className="mb-6 text-[#CBD5E1] text-sm sm:text-base">
        Configurez quels champs sont activés et obligatoires dans le formulaire de demande de crédit PME/PMI.
      </p>

      {/* Profil entreprise */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
          Profil entreprise
        </h4>
        <CreditFieldConfigRow
          label="Raison sociale"
          fieldName="raison_sociale"
          config={pmeFieldConfig.raison_sociale ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Secteur d'activité"
          fieldName="secteur_activite"
          config={pmeFieldConfig.secteur_activite ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Taille"
          fieldName="taille"
          config={pmeFieldConfig.taille ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Nombre d'employés"
          fieldName="nombre_employes"
          config={pmeFieldConfig.nombre_employes ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Année de création"
          fieldName="annee_creation"
          config={pmeFieldConfig.annee_creation ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Forme juridique"
          fieldName="forme_juridique"
          config={pmeFieldConfig.forme_juridique ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Positionnement"
          fieldName="positionnement"
          config={pmeFieldConfig.positionnement ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Données financières */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
          Données financières
        </h4>
        <CreditFieldConfigRow
          label="Données financières (2-3 ans)"
          fieldName="donnees_financieres"
          config={pmeFieldConfig.donnees_financieres ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Crédit demandé */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
          Crédit demandé
        </h4>
        <CreditFieldConfigRow
          label="Montant"
          fieldName="montant"
          config={pmeFieldConfig.montant ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Objet"
          fieldName="objet"
          config={pmeFieldConfig.objet ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Durée (mois)"
          fieldName="duree_mois"
          config={pmeFieldConfig.duree_mois ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Type de remboursement"
          fieldName="type_remboursement"
          config={pmeFieldConfig.type_remboursement ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Garanties"
          fieldName="garanties"
          config={pmeFieldConfig.garanties ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Valeur des garanties"
          fieldName="valeur_garanties"
          config={pmeFieldConfig.valeur_garanties ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Source de remboursement"
          fieldName="source_remboursement"
          config={pmeFieldConfig.source_remboursement ?? { enabled: true, required: true }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Contexte risque */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
          Contexte risque
        </h4>
        <CreditFieldConfigRow
          label="Concentration clients"
          fieldName="concentration_clients"
          config={pmeFieldConfig.concentration_clients ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Dépendance fournisseur"
          fieldName="dependance_fournisseur"
          config={pmeFieldConfig.dependance_fournisseur ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Historique incidents"
          fieldName="historique_incidents"
          config={pmeFieldConfig.historique_incidents ?? { enabled: true, required: false }}
          onChange={handlePMEFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSavePMEConfig}
          disabled={!hasActiveLicense || saving}
          className="px-8 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-bold rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#2563EB]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sauvegarde...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>💾 Sauvegarder la configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

