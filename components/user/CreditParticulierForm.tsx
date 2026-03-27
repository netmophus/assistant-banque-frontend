'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';
// import VoiceChatPanel from './VoiceChatPanel';
import CreditVoiceAssistantModal from './CreditVoiceAssistantModal';

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface CreditParticulierFieldConfig {
  clientName?: FieldConfig;
  employmentStatus?: FieldConfig;
  employerName?: FieldConfig;
  employerSector?: FieldConfig;
  employmentStartDate?: FieldConfig;
  contractType?: FieldConfig;
  position?: FieldConfig;
  probationEndDate?: FieldConfig;
  netMonthlySalary?: FieldConfig;
  otherMonthlyIncome?: FieldConfig;
  incomeCurrency?: FieldConfig;
  rentOrMortgage?: FieldConfig;
  otherMonthlyCharges?: FieldConfig;
  existingLoans?: FieldConfig;
}

interface ExistingLoan {
  type: string;
  monthlyPayment: number;
  remainingDurationMonths: number;
  outstandingAmount: number;
}

interface AnalysisResult {
  calculated_metrics: any;
  ai_analysis: string;
  ai_decision: 'APPROUVE' | 'REFUSE' | 'CONDITIONNEL';
  ai_recommendations?: string;
}

interface ArchivedAnalysis {
  id: string;
  request_data: any;
  calculated_metrics: any;
  ai_analysis: string;
  ai_decision: 'APPROUVE' | 'REFUSE' | 'CONDITIONNEL';
  ai_recommendations?: string;
  created_at: string;
}

export default function CreditParticulierForm() {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fieldConfig, setFieldConfig] = useState<CreditParticulierFieldConfig | null>(null);
  const [existingLoans, setExistingLoans] = useState<ExistingLoan[]>([]);
  const [archivedAnalyses, setArchivedAnalyses] = useState<ArchivedAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ArchivedAnalysis | null>(null);
  
  // États pour le chat
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // État pour le modal vocal ElevenLabs
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  // État pour le panel vocal
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [newLoan, setNewLoan] = useState({
    type: 'CONSO',
    monthlyPayment: '',
    remainingDurationMonths: '',
    outstandingAmount: '',
  });

  const [formData, setFormData] = useState({
    clientName: '',
    employmentStatus: 'SALAIRE',
    employerName: '',
    employerSector: '',
    employmentStartDate: '',
    contractType: '',
    position: '',
    probationEndDate: '',
    netMonthlySalary: '',
    otherMonthlyIncome: '0',
    incomeCurrency: 'XOF',
    rentOrMortgage: '0',
    otherMonthlyCharges: '0',
    loanAmount: '',
    loanDurationMonths: '',
    loanType: 'CONSO',
    propertyValue: '',
    annualInterestRate: '',
  });

  useEffect(() => {
    loadFieldConfig();
    if (showHistory) {
      loadArchivedAnalyses();
    }
  }, [showHistory]);

  const loadFieldConfig = async () => {
    setLoadingConfig(true);
    try {
      const response = await apiClient.get<{ field_config: CreditParticulierFieldConfig }>('/credit/particulier/config');
      setFieldConfig(response.field_config || {});
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadArchivedAnalyses = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get<ArchivedAnalysis[]>('/credit/particulier/requests');
      setArchivedAnalyses(response || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError('Erreur lors du chargement de l\'historique des analyses');
    } finally {
      setLoadingHistory(false);
    }
  };

  const isFieldEnabled = (fieldName: keyof CreditParticulierFieldConfig): boolean => {
    if (!fieldConfig) return true;
    return fieldConfig[fieldName]?.enabled !== false;
  };

  const isFieldRequired = (fieldName: keyof CreditParticulierFieldConfig): boolean => {
    if (!fieldConfig) return false;
    return fieldConfig[fieldName]?.required === true;
  };

  const addExistingLoan = () => {
    const monthlyPayment = parseFloat(newLoan.monthlyPayment);
    const remainingDurationMonths = parseInt(newLoan.remainingDurationMonths);
    const outstandingAmount = parseFloat(newLoan.outstandingAmount);

    if (!monthlyPayment || monthlyPayment <= 0) {
      setError('Veuillez saisir une mensualité valide.');
      return;
    }

    if (!remainingDurationMonths || remainingDurationMonths <= 0) {
      setError('Veuillez saisir une durée restante valide (en mois).');
      return;
    }

    if (!outstandingAmount || outstandingAmount < 0) {
      setError('Veuillez saisir un encours restant valide.');
      return;
    }

    setExistingLoans([
      ...existingLoans,
      {
        type: newLoan.type,
        monthlyPayment,
        remainingDurationMonths,
        outstandingAmount,
      },
    ]);
    setNewLoan({ type: 'CONSO', monthlyPayment: '', remainingDurationMonths: '', outstandingAmount: '' });
    setError(null);
  };

  const removeExistingLoan = (index: number) => {
    setExistingLoans(existingLoans.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROUVE':
        return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'REFUSE':
        return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'CONDITIONNEL':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const viewAnalysisDetails = (analysis: ArchivedAnalysis) => {
    setSelectedAnalysis(analysis);
  };

  const backToList = () => {
    setSelectedAnalysis(null);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !analysis) return;
    
    setChatLoading(true);
    try {
      // Préparer les données du formulaire
      const requestData = {
        clientName: formData.clientName,
        employmentStatus: formData.employmentStatus,
        employerName: formData.employerName,
        employerSector: formData.employerSector,
        employmentStartDate: formData.employmentStartDate,
        contractType: formData.contractType,
        position: formData.position,
        probationEndDate: formData.probationEndDate,
        netMonthlySalary: parseFloat(formData.netMonthlySalary) || 0,
        otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome) || 0,
        incomeCurrency: formData.incomeCurrency,
        rentOrMortgage: parseFloat(formData.rentOrMortgage) || 0,
        otherMonthlyCharges: parseFloat(formData.otherMonthlyCharges) || 0,
        existingLoans: existingLoans,
        loanAmount: parseFloat(formData.loanAmount) || 0,
        loanDurationMonths: parseInt(formData.loanDurationMonths) || 0,
        loanType: formData.loanType,
        propertyValue: formData.propertyValue ? parseFloat(formData.propertyValue) : null,
        annualInterestRate: formData.annualInterestRate ? parseFloat(formData.annualInterestRate) : null,
      };

      const response = await apiClient.post<{assistant_message: string, messages: {role: 'user' | 'assistant', content: string}[]}>('/credit/particulier/chat', {
        request_data: requestData,
        calculated_metrics: analysis.calculated_metrics,
        ai_analysis: analysis.ai_analysis,
        ai_decision: analysis.ai_decision,
        messages: chatMessages,
        user_message: chatInput
      });

      setChatMessages(response.messages);
      setChatInput('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la conversation');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAnalysis(null);
    setLoading(true);

    try {
      const requestData = {
        clientName: formData.clientName,
        employmentStatus: formData.employmentStatus,
        employerName: formData.employerName || null,
        employerSector: formData.employerSector || null,
        employmentStartDate: formData.employmentStartDate || null,
        contractType: formData.contractType || null,
        position: formData.position || null,
        probationEndDate: formData.probationEndDate || null,
        netMonthlySalary: parseFloat(formData.netMonthlySalary),
        otherMonthlyIncome: parseFloat(formData.otherMonthlyIncome || '0'),
        incomeCurrency: formData.incomeCurrency,
        rentOrMortgage: parseFloat(formData.rentOrMortgage || '0'),
        otherMonthlyCharges: parseFloat(formData.otherMonthlyCharges || '0'),
        existingLoans: existingLoans,
        loanAmount: parseFloat(formData.loanAmount),
        loanDurationMonths: parseInt(formData.loanDurationMonths),
        loanType: formData.loanType,
        propertyValue: formData.propertyValue ? parseFloat(formData.propertyValue) : null,
        annualInterestRate: formData.annualInterestRate ? parseFloat(formData.annualInterestRate) : null,
      };

      const response = await apiClient.post<AnalysisResult>('/credit/particulier/analyze', requestData);
      setAnalysis(response);
      // Réinitialiser le chat pour la nouvelle analyse
      setChatMessages([]);
      setShowChat(false);
      // Recharger l'historique après une nouvelle analyse
      if (showHistory) {
        await loadArchivedAnalyses();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Erreur lors de l'analyse du crédit.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="text-center py-12 text-[#CBD5E1]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        <p className="mt-4">Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1f3a]/90 via-[#2563EB]/10 to-[#1a1f3a]/90 backdrop-blur-xl rounded-[28px] border border-[#2563EB]/30 p-6 sm:p-8 shadow-xl">
      {/* Header avec bouton d'historique */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {showHistory ? 'Mes analyses précédentes' : 'Analyse de crédit particulier'}
        </h2>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all duration-300 flex items-center space-x-2"
        >
          <span>{showHistory ? '📝' : '📚'}</span>
          <span>{showHistory ? 'Nouvelle analyse' : 'Voir l\'historique'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Vue Historique */}
      {showHistory ? (
        <div className="space-y-6">
          {selectedAnalysis ? (
            // Vue détaillée d'une analyse
            <div className="space-y-6">
              <button
                onClick={backToList}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition-all duration-300 flex items-center space-x-2"
              >
                <span>←</span>
                <span>Retour à la liste</span>
              </button>
              
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    Analyse du {formatDate(selectedAnalysis.created_at)}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getDecisionColor(selectedAnalysis.ai_decision)}`}>
                    {selectedAnalysis.ai_decision}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">Demande</h4>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-[#CBD5E1]">
                        Client: {selectedAnalysis.request_data.clientName}<br/>
                        Montant: {selectedAnalysis.request_data.loanAmount?.toLocaleString()} XOF<br/>
                        Durée: {selectedAnalysis.request_data.loanDurationMonths} mois
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">Analyse IA</h4>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap">
                        {selectedAnalysis.ai_analysis}
                      </p>
                    </div>
                  </div>
                  
                  {selectedAnalysis.ai_recommendations && (
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Recommandations</h4>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap">
                          {selectedAnalysis.ai_recommendations}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Liste des analyses
            <div>
              {loadingHistory ? (
                <div className="text-center py-12 text-[#CBD5E1]">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                  <p className="mt-4">Chargement de l'historique...</p>
                </div>
              ) : archivedAnalyses.length === 0 ? (
                <div className="text-center py-12 text-[#CBD5E1]">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-lg">Aucune analyse précédente</p>
                  <p className="text-sm mt-2">Effectuez votre première analyse pour voir l'historique ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {archivedAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                      onClick={() => viewAnalysisDetails(analysis)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">
                            {analysis.request_data.clientName}
                          </p>
                          <p className="text-sm text-[#CBD5E1]">
                            {analysis.request_data.loanAmount?.toLocaleString()} XOF • {analysis.request_data.loanDurationMonths} mois
                          </p>
                          <p className="text-xs text-[#CBD5E1] mt-1">
                            {formatDate(analysis.created_at)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getDecisionColor(analysis.ai_decision)}`}>
                          {analysis.ai_decision}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Vue Formulaire
        <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identité */}
        {isFieldEnabled('clientName') && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
              Identité
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-white mb-2">
                Nom du client {isFieldRequired('clientName') && <span className="text-red-400">*</span>}
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required={isFieldRequired('clientName')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                placeholder="Nom complet du client"
              />
            </div>
          </div>
        )}

        {/* Situation professionnelle */}
        {(isFieldEnabled('employmentStatus') || isFieldEnabled('employerName') || isFieldEnabled('employerSector') || isFieldEnabled('employmentStartDate') || isFieldEnabled('contractType') || isFieldEnabled('position') || isFieldEnabled('probationEndDate')) && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
              Situation professionnelle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFieldEnabled('employmentStatus') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Statut professionnel {isFieldRequired('employmentStatus') && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    required={isFieldRequired('employmentStatus')}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  >
                    <option value="SALAIRE">Salarié</option>
                    <option value="INDEPENDANT">Indépendant</option>
                    <option value="RETRAITE">Retraité</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              )}

              {isFieldEnabled('employerName') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nom de l'employeur {isFieldRequired('employerName') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.employerName}
                    onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                    required={isFieldRequired('employerName')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="Nom de l'employeur"
                  />
                </div>
              )}

              {isFieldEnabled('employerSector') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Secteur d'activité {isFieldRequired('employerSector') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.employerSector}
                    onChange={(e) => setFormData({ ...formData, employerSector: e.target.value })}
                    required={isFieldRequired('employerSector')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="Secteur d'activité"
                  />
                </div>
              )}

              {isFieldEnabled('employmentStartDate') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Date d'embauche {isFieldRequired('employmentStartDate') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.employmentStartDate}
                    onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                    required={isFieldRequired('employmentStartDate')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  />
                </div>
              )}

              {isFieldEnabled('contractType') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Type de contrat {isFieldRequired('contractType') && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    required={isFieldRequired('contractType')}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="STAGE">Stage</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              )}

              {isFieldEnabled('position') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Poste occupé {isFieldRequired('position') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required={isFieldRequired('position')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="Poste occupé"
                  />
                </div>
              )}

              {isFieldEnabled('probationEndDate') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Date de fin période d'essai {isFieldRequired('probationEndDate') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                    required={isFieldRequired('probationEndDate')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenus */}
        {(isFieldEnabled('netMonthlySalary') || isFieldEnabled('otherMonthlyIncome') || isFieldEnabled('incomeCurrency')) && (
          <div className="bg-gradient-to-br from-surface via-surface2/50 to-surface backdrop-blur-lg rounded-2xl border border-primary/30 p-6 shadow-xl shadow-glow-1/10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-accent via-primary to-secondary rounded-xl flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text mb-1">Revenus mensuels</h3>
                <p className="text-sm text-muted">Informations sur les revenus du demandeur</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {isFieldEnabled('netMonthlySalary') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Salaire net mensuel {isFieldRequired('netMonthlySalary') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.netMonthlySalary}
                    onChange={(e) => setFormData({ ...formData, netMonthlySalary: e.target.value })}
                    required={isFieldRequired('netMonthlySalary')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              )}

              {isFieldEnabled('otherMonthlyIncome') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Autres revenus mensuels {isFieldRequired('otherMonthlyIncome') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.otherMonthlyIncome}
                    onChange={(e) => setFormData({ ...formData, otherMonthlyIncome: e.target.value })}
                    required={isFieldRequired('otherMonthlyIncome')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              )}

              {isFieldEnabled('incomeCurrency') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Devise {isFieldRequired('incomeCurrency') && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={formData.incomeCurrency}
                    onChange={(e) => setFormData({ ...formData, incomeCurrency: e.target.value })}
                    required={isFieldRequired('incomeCurrency')}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  >
                    <option value="XOF">XOF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charges */}
        {(isFieldEnabled('rentOrMortgage') || isFieldEnabled('otherMonthlyCharges') || isFieldEnabled('existingLoans')) && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
              Charges & engagements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {isFieldEnabled('rentOrMortgage') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Loyer ou hypothèque {isFieldRequired('rentOrMortgage') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rentOrMortgage}
                    onChange={(e) => setFormData({ ...formData, rentOrMortgage: e.target.value })}
                    required={isFieldRequired('rentOrMortgage')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              )}

              {isFieldEnabled('otherMonthlyCharges') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Autres charges mensuelles {isFieldRequired('otherMonthlyCharges') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.otherMonthlyCharges}
                    onChange={(e) => setFormData({ ...formData, otherMonthlyCharges: e.target.value })}
                    required={isFieldRequired('otherMonthlyCharges')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Prêts existants */}
            {isFieldEnabled('existingLoans') && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-white mb-3">
                  Prêts existants {isFieldRequired('existingLoans') && <span className="text-red-400">*</span>}
                </label>
                {existingLoans.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {existingLoans.map((loan, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex-1">
                          <p className="text-white text-sm font-semibold">{loan.type}</p>
                          <p className="text-[#CBD5E1] text-xs">
                            {loan.monthlyPayment} {formData.incomeCurrency}/mois • {loan.remainingDurationMonths} mois restants • {loan.outstandingAmount} {formData.incomeCurrency} restants
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingLoan(index)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <select
                    value={newLoan.type}
                    onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value })}
                    className="px-4 py-2 bg-[#1a1f3a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="CONSO">Consommation</option>
                    <option value="IMMO">Immobilier</option>
                    <option value="AUTO">Auto</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={newLoan.monthlyPayment}
                    onChange={(e) => setNewLoan({ ...newLoan, monthlyPayment: e.target.value })}
                    placeholder="Mensualité"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <input
                    type="number"
                    value={newLoan.remainingDurationMonths}
                    onChange={(e) => setNewLoan({ ...newLoan, remainingDurationMonths: e.target.value })}
                    placeholder="Durée (mois)"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newLoan.outstandingAmount}
                    onChange={(e) => setNewLoan({ ...newLoan, outstandingAmount: e.target.value })}
                    placeholder="Encours restant"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={addExistingLoan}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crédit demandé */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#2563EB]/30">
            Crédit demandé
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Montant du crédit <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.loanAmount}
                onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Durée (mois) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.loanDurationMonths}
                onChange={(e) => setFormData({ ...formData, loanDurationMonths: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Type de crédit <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.loanType}
                onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
              >
                <option value="CONSO">Consommation</option>
                <option value="IMMO">Immobilier</option>
                <option value="AUTO">Auto</option>
                <option value="TRAVAUX">Travaux</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Taux d'intérêt annuel (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={formData.annualInterestRate}
                onChange={(e) => setFormData({ ...formData, annualInterestRate: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                placeholder="Ex: 5.5 pour 5.5%"
              />
              <p className="text-xs text-[#CBD5E1] mt-1">
                Laissez vide pour utiliser le taux par défaut (5%)
              </p>
            </div>
            {formData.loanType === 'IMMO' && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Valeur du bien
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.propertyValue}
                  onChange={(e) => setFormData({ ...formData, propertyValue: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-300"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-bold rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#2563EB]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyse en cours...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>🤖 Analyser le dossier avec l'IA</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}
      
      {/* Résultats de l'analyse */}
      {analysis && (
        <ScrollReveal direction="up" delay={0}>
          <div className="mt-8 bg-gradient-to-br from-[#1a1f3a]/90 via-[#2563EB]/10 to-[#1a1f3a]/90 backdrop-blur-xl rounded-[28px] border border-[#2563EB]/30 p-6 sm:p-8 shadow-xl">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center space-x-2">
              <span>📊</span>
              <span>Résultats de l'analyse</span>
            </h3>

            {/* Décision IA */}
            <div
              className={`p-6 rounded-xl mb-6 border-l-4 ${
                analysis.ai_decision === 'APPROUVE'
                  ? 'bg-green-500/10 border-green-500'
                  : analysis.ai_decision === 'REFUSE'
                  ? 'bg-red-500/10 border-red-500'
                  : 'bg-orange-500/10 border-orange-500'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-white">
                  Décision:{' '}
                  <span
                    className={
                      analysis.ai_decision === 'APPROUVE'
                        ? 'text-green-400'
                        : analysis.ai_decision === 'REFUSE'
                        ? 'text-red-400'
                        : 'text-orange-400'
                    }
                  >
                    {analysis.ai_decision === 'APPROUVE'
                      ? '✅ APPROUVÉ'
                      : analysis.ai_decision === 'REFUSE'
                      ? '❌ REFUSÉ'
                      : '⚠️ CONDITIONNEL'}
                  </span>
                </h4>
                {analysis.calculated_metrics?.annualInterestRate !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-[#CBD5E1]">Taux d'intérêt</p>
                    <p className="text-lg font-bold text-white">{analysis.calculated_metrics.annualInterestRate}%</p>
                  </div>
                )}
              </div>
              <div className="text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                {analysis.ai_analysis}
              </div>
            </div>

            {/* Recommandations */}
            {analysis.ai_recommendations && (
              <div className="p-6 bg-[#2563EB]/10 rounded-xl border border-[#2563EB]/30">
                <h4 className="text-lg font-bold text-white mb-3">💡 Recommandations</h4>
                <div className="text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                  {analysis.ai_recommendations}
                </div>
              </div>
            )}

            {/* Bouton pour discuter avec l'IA */}
            <div className="flex justify-center mt-6 space-x-4">
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-6 py-3 bg-gradient-to-r from-[#2563EB]/20 to-[#7C3AED]/20 hover:from-[#2563EB]/30 hover:to-[#7C3AED]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all duration-300 flex items-center space-x-2"
              >
                <span>💬</span>
                <span>{showChat ? 'Masquer la discussion' : 'Discuter de ce dossier avec l\'IA'}</span>
              </button>
              
              <button
                onClick={() => setShowVoiceModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 font-semibold rounded-lg border border-green-500/30 transition-all duration-300 flex items-center space-x-2"
              >
                <span>🎙️</span>
                <span>Discuter avec l\'agent vocal</span>
              </button>
            </div>

            {/* Interface de chat */}
            {showChat && (
              <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-lg font-bold text-white mb-4">💬 Discussion avec l'expert crédit</h4>
                
                {/* Messages */}
                <div className="h-64 overflow-y-auto mb-4 space-y-3 p-3 bg-white/5 rounded-lg">
                  {chatMessages.length === 0 ? (
                    <p className="text-[#CBD5E1] text-center text-sm">
                      Posez vos questions sur l'analyse de ce dossier de crédit...
                    </p>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-[#2563EB]/20 text-white' 
                            : 'bg-white/10 text-[#CBD5E1]'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !chatLoading && sendChatMessage()}
                    placeholder="Tapez votre question..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chatLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Envoyer'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Métriques calculées */}
            {analysis.calculated_metrics && (
              <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-lg font-bold text-white mb-4">📈 Métriques calculées</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {/* Taux d'intérêt - mis en évidence */}
                  {analysis.calculated_metrics?.annualInterestRate !== undefined && (
                    <div key="interestRate" className="p-3 bg-gradient-to-br from-[#2563EB]/20 to-[#7C3AED]/20 rounded-lg border border-[#2563EB]/30">
                      <p className="text-[#CBD5E1] text-xs mb-1">Taux d'intérêt annuel</p>
                      <p className="text-white font-bold text-lg">{analysis.calculated_metrics.annualInterestRate}%</p>
                    </div>
                  )}
                  
                  {/* Mensualité du crédit */}
                  {analysis.calculated_metrics.newLoanMonthlyPayment && (
                    <div key="monthlyPayment" className="p-3 bg-white/5 rounded-lg">
                      <p className="text-[#CBD5E1] text-xs mb-1">Mensualité du crédit</p>
                      <p className="text-white font-semibold">{analysis.calculated_metrics.newLoanMonthlyPayment.toLocaleString()} XOF</p>
                    </div>
                  )}
                  
                  {/* Total des intérêts */}
                  {analysis.calculated_metrics?.totalInterestPaid !== undefined && (
                    <div key="totalInterest" className="p-3 bg-white/5 rounded-lg">
                      <p className="text-[#CBD5E1] text-xs mb-1">Total des intérêts</p>
                      <p className="text-white font-semibold">{analysis.calculated_metrics.totalInterestPaid.toLocaleString()} XOF</p>
                    </div>
                  )}
                  
                  {/* Taux d'endettement */}
                  {analysis.calculated_metrics.newDebtToIncomeRatio && (
                    <div key="debtRatio" className={`p-3 rounded-lg ${
                      analysis.calculated_metrics.newDebtToIncomeRatio > 33 
                        ? 'bg-red-500/20 border border-red-500/30' 
                        : 'bg-green-500/20 border border-green-500/30'
                    }`}>
                      <p className="text-[#CBD5E1] text-xs mb-1">Taux d'endettement</p>
                      <p className={`font-semibold ${
                        analysis.calculated_metrics.newDebtToIncomeRatio > 33 ? 'text-red-400' : 'text-green-400'
                      }`}>{analysis.calculated_metrics.newDebtToIncomeRatio}%</p>
                    </div>
                  )}
                  
                  {/* Reste à vivre */}
                  {analysis.calculated_metrics.resteAVivre !== undefined && (
                    <div key="resteAVivre" className={`p-3 rounded-lg ${
                      analysis.calculated_metrics.resteAVivre < 50000 
                        ? 'bg-red-500/20 border border-red-500/30' 
                        : 'bg-green-500/20 border border-green-500/30'
                    }`}>
                      <p className="text-[#CBD5E1] text-xs mb-1">Reste à vivre</p>
                      <p className={`font-semibold ${
                        analysis.calculated_metrics.resteAVivre < 50000 ? 'text-red-400' : 'text-green-400'
                      }`}>{analysis.calculated_metrics.resteAVivre.toLocaleString()} XOF</p>
                    </div>
                  )}
                  
                  {/* Loan-to-Income */}
                  {analysis.calculated_metrics.loanToIncome && (
                    <div key="loanToIncome" className="p-3 bg-white/5 rounded-lg">
                      <p className="text-[#CBD5E1] text-xs mb-1">Ratio Crédit/Revenu</p>
                      <p className="text-white font-semibold">{analysis.calculated_metrics.loanToIncome}%</p>
                    </div>
                  )}
                  
                  {/* Loan-to-Value (si crédit immo) */}
                  {analysis.calculated_metrics.loanToValue && (
                    <div key="loanToValue" className="p-3 bg-white/5 rounded-lg">
                      <p className="text-[#CBD5E1] text-xs mb-1">Ratio Crédit/Valeur</p>
                      <p className="text-white font-semibold">{analysis.calculated_metrics.loanToValue}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}
      
      {/* Modal Agent Vocal ElevenLabs */}
      <CreditVoiceAssistantModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        analysis={analysis}
        formData={formData}
      />
    </div>
  );
};
