'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import CreditFieldConfigRow from './CreditFieldConfigRow';

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface CreditParticulierFieldConfig {
  clientName: FieldConfig;
  employmentStatus: FieldConfig;
  employerName: FieldConfig;
  employerSector: FieldConfig;
  employmentStartDate: FieldConfig;
  contractType: FieldConfig;
  position: FieldConfig;
  probationEndDate: FieldConfig;
  netMonthlySalary: FieldConfig;
  otherMonthlyIncome: FieldConfig;
  incomeCurrency: FieldConfig;
  rentOrMortgage: FieldConfig;
  otherMonthlyCharges: FieldConfig;
  existingLoans: FieldConfig;
}

interface CreditParticulierConfigProps {
  hasActiveLicense: boolean;
}

const getDefaultConfig = (): CreditParticulierFieldConfig => ({
  clientName: { enabled: true, required: true },
  employmentStatus: { enabled: true, required: true },
  employerName: { enabled: true, required: false },
  employerSector: { enabled: true, required: false },
  employmentStartDate: { enabled: true, required: true },
  contractType: { enabled: true, required: true },
  position: { enabled: true, required: false },
  probationEndDate: { enabled: true, required: false },
  netMonthlySalary: { enabled: true, required: true },
  otherMonthlyIncome: { enabled: true, required: false },
  incomeCurrency: { enabled: true, required: true },
  rentOrMortgage: { enabled: true, required: false },
  otherMonthlyCharges: { enabled: true, required: false },
  existingLoans: { enabled: true, required: false },
});

export default function CreditParticulierConfig({ hasActiveLicense }: CreditParticulierConfigProps) {
  const [fieldConfig, setFieldConfig] = useState<CreditParticulierFieldConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ field_config: CreditParticulierFieldConfig }>('/credit/particulier/config');
      if (response.field_config) {
        setFieldConfig(response.field_config);
      } else {
        setFieldConfig(getDefaultConfig());
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config:', err);
      setFieldConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const handleFieldConfigChange = (fieldName: string, property: 'enabled' | 'required', value: boolean) => {
    if (!fieldConfig) return;
    setFieldConfig({
      ...fieldConfig,
      [fieldName]: {
        ...fieldConfig[fieldName as keyof CreditParticulierFieldConfig],
        [property]: value,
      },
    });
  };

  const handleSaveConfig = async () => {
    if (!fieldConfig) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.put('/credit/particulier/config', { field_config: fieldConfig });
      setSuccess('Configuration sauvegardée avec succès ✅');
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

  if (!fieldConfig) {
    return (
      <div className="text-center py-12 text-[#CBD5E1]">
        <p>Erreur lors du chargement de la configuration. Veuillez réessayer.</p>
        <button
          onClick={loadConfig}
          className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
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
        Configurez quels champs sont activés et obligatoires dans le formulaire de demande de crédit particulier.
      </p>

      {/* Identité de base */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
          Identité de base
        </h4>
        <CreditFieldConfigRow
          label="Nom du client"
          fieldName="clientName"
          config={fieldConfig.clientName}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Situation professionnelle */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
          Situation professionnelle
        </h4>
        <CreditFieldConfigRow
          label="Statut professionnel"
          fieldName="employmentStatus"
          config={fieldConfig.employmentStatus}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Nom de l'employeur"
          fieldName="employerName"
          config={fieldConfig.employerName}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Secteur d'activité"
          fieldName="employerSector"
          config={fieldConfig.employerSector}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Date d'embauche"
          fieldName="employmentStartDate"
          config={fieldConfig.employmentStartDate}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Type de contrat"
          fieldName="contractType"
          config={fieldConfig.contractType}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Poste occupé"
          fieldName="position"
          config={fieldConfig.position}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Date de fin période d'essai"
          fieldName="probationEndDate"
          config={fieldConfig.probationEndDate}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Revenus */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
          Revenus
        </h4>
        <CreditFieldConfigRow
          label="Salaire net mensuel"
          fieldName="netMonthlySalary"
          config={fieldConfig.netMonthlySalary}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Autres revenus mensuels"
          fieldName="otherMonthlyIncome"
          config={fieldConfig.otherMonthlyIncome}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Devise"
          fieldName="incomeCurrency"
          config={fieldConfig.incomeCurrency}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      {/* Charges */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
          Charges & engagements
        </h4>
        <CreditFieldConfigRow
          label="Loyer ou hypothèque"
          fieldName="rentOrMortgage"
          config={fieldConfig.rentOrMortgage}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Autres charges mensuelles"
          fieldName="otherMonthlyCharges"
          config={fieldConfig.otherMonthlyCharges}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
        <CreditFieldConfigRow
          label="Prêts existants"
          fieldName="existingLoans"
          config={fieldConfig.existingLoans}
          onChange={handleFieldConfigChange}
          disabled={!hasActiveLicense}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveConfig}
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

