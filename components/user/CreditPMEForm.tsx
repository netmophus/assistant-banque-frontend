'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';
import CreditPMEVoiceAssistantModal from './CreditPMEVoiceAssistantModal';

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

interface FinancialYear {
  year: number;
  chiffre_affaires: string;
  ebitda: string;
  resultat_net: string;
  fonds_propres: string;
  dettes_financieres_totales: string;
  charges_financieres: string;
  tresorerie: string;
  stocks: string;
  creances_clients: string;
  dettes_fournisseurs: string;
}

interface AnalysisResult {
  id: string;
  calculated_metrics: any;
  ai_analysis: string;
  ai_decision: 'APPROUVE' | 'REFUSE' | 'CONDITIONNEL';
  ai_recommendations?: string;
}

export default function CreditPMEForm() {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fieldConfig, setFieldConfig] = useState<CreditPMEFieldConfig | null>(null);
  const currentYear = new Date().getFullYear();
  
  // États pour le chat IA
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // États pour l'assistant vocal
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<Array<{command: string, response: string}>>([]);
  
  // États pour l'historique PME
  const [pmeHistory, setPMEHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPMERequest, setSelectedPMERequest] = useState<any | null>(null);
  
  // États pour le chat IA PME (comme crédit particulier)
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // État pour le modal vocal PME
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const calculatedMetricLabels: Record<string, string> = {
    croissance_ca: 'Croissance du CA (%)',
    ebitda_margin: 'Marge EBE (%)',
    net_margin: 'Marge nette (%)',
    debt_to_equity: "Ratio d'endettement (Dettes financières / Fonds propres) (%)",
    debt_to_ebitda: 'Dette/EBE',
    interest_coverage: 'Couverture des intérêts (EBE / Charges financières)',
    debt_service_coverage: 'Capacité de remboursement (DSCR = CAF / Service annuel de la dette)',
    new_installment_weight: 'Poids nouvelle échéance dans CAF (%)',
    current_ratio: 'Ratio de liquidité générale (Actif courant / Passif courant)',
    quick_ratio: 'Ratio de liquidité immédiate ((Actif courant - Stocks) / Passif courant)',
    ltv: 'Ratio Crédit/Valeur des garanties (%)',
    caf_annuelle: 'CAF annuelle',
    nouvelle_mensualite: 'Nouvelle mensualité',
    service_annuel_dette: 'Service annuel de la dette',
  };
  
  // Référence pour l'enregistrement vocal
  const recognitionRef = useRef<any>(null);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([
    {
      year: currentYear - 1,
      chiffre_affaires: '',
      ebitda: '',
      resultat_net: '',
      fonds_propres: '',
      dettes_financieres_totales: '',
      charges_financieres: '',
      tresorerie: '',
      stocks: '',
      creances_clients: '',
      dettes_fournisseurs: '',
    },
    {
      year: currentYear - 2,
      chiffre_affaires: '',
      ebitda: '',
      resultat_net: '',
      fonds_propres: '',
      dettes_financieres_totales: '',
      charges_financieres: '',
      tresorerie: '',
      stocks: '',
      creances_clients: '',
      dettes_fournisseurs: '',
    },
  ]);

  const [formData, setFormData] = useState({
    raison_sociale: '',
    secteur_activite: '',
    taille: 'PME',
    nombre_employes: '',
    annee_creation: '',
    forme_juridique: 'SARL',
    positionnement: '',
    montant: '',
    objet: 'investissement',
    duree_mois: '',
    type_remboursement: 'amortissable',
    garanties: '',
    valeur_garanties: '',
    source_remboursement: 'cash-flow exploitation',
    concentration_clients: '',
    dependance_fournisseur: '',
    historique_incidents: '',
    currency: 'XOF',
  });

  useEffect(() => {
    loadPMEConfig();
  }, []);

  const loadPMEConfig = async () => {
    setLoadingConfig(true);
    try {
      const response = await apiClient.get<{ field_config: CreditPMEFieldConfig }>('/credit/pme/config');
      setFieldConfig(response.field_config || {});
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config PME:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const isFieldEnabled = (fieldName: keyof CreditPMEFieldConfig): boolean => {
    if (!fieldConfig) return true;
    return fieldConfig[fieldName]?.enabled !== false;
  };

  const isFieldRequired = (fieldName: keyof CreditPMEFieldConfig): boolean => {
    if (!fieldConfig) return false;
    return fieldConfig[fieldName]?.required === true;
  };

  const addFinancialYear = () => {
    if (financialYears.length < 3) {
      const newYear = currentYear - financialYears.length - 1;
      setFinancialYears([
        ...financialYears,
        {
          year: newYear,
          chiffre_affaires: '',
          ebitda: '',
          resultat_net: '',
          fonds_propres: '',
          dettes_financieres_totales: '',
          charges_financieres: '',
          tresorerie: '',
          stocks: '',
          creances_clients: '',
          dettes_fournisseurs: '',
        },
      ]);
    }
  };

  const removeFinancialYear = (index: number) => {
    if (financialYears.length > 2) {
      setFinancialYears(financialYears.filter((_, i) => i !== index));
    }
  };

  // ===================== FONCTIONS CHAT IA =====================
  
  const handleChatMessage = async () => {
    if (!chatMessage.trim() || !analysis) return;
    
    setIsChatLoading(true);
    const userMessage = chatMessage.trim();
    
    // Ajouter le message utilisateur à l'historique
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatMessage('');
    
    try {
      // Appeler l'endpoint chat PME
      const response = await apiClient.post('/credit/pme/chat', {
        message: userMessage,
        dossier_id: analysis.id || null
      });
      
      const responseData = response as any;
      const assistantMessage = responseData.response;
      
      // Ajouter la réponse de l'IA à l'historique
      setChatHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Erreur chat PME:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ===================== FONCTIONS VOICE ASSISTANT =====================
  
  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsVoiceRecording(true);
      setTranscript('');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      
      // Traiter la commande vocale
      processVoiceCommand(transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
      setIsVoiceRecording(false);
    };
    
    recognition.onend = () => {
      setIsVoiceRecording(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processVoiceCommand = async (command: string) => {
    setIsVoiceProcessing(true);
    
    try {
      // Appeler l'endpoint vocal PME
      const response = await apiClient.post('/credit/pme/voice/process-command', {
        text: command,
        dossier_id: analysis?.id || null
      });
      
      const responseData = response as any;
      const responseText = responseData.response || 'Réponse non disponible';
      const audio_url = responseData.audio_url;
      
      // Ajouter à l'historique vocal
      setVoiceHistory(prev => [...prev, { command, response: responseText }]);
      
      // Jouer l'audio si disponible
      if (audio_url) {
        setAudioUrl(audio_url);
      }
    } catch (error) {
      console.error('Erreur vocal PME:', error);
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // ===================== FONCTIONS HISTORIQUE PME =====================
  
  const loadPMEHistory = async () => {
    setIsLoadingHistory(true);
    console.log('🔄 Début chargement historique PME...');
    
    try {
      console.log('📡 Appel API /credit/pme/requests');
      const response = await apiClient.get('/credit/pme/requests');
      console.log('📊 Réponse API brute:', response);
      console.log('📋 Données reçues:', response);
      
      const responseData = response as any;
      console.log('📈 Type des données:', typeof responseData);
      console.log('📏 Longueur des données:', responseData?.length || 'N/A');
      
      setPMEHistory(responseData || []);
      console.log('✅ Historique PME mis à jour:', responseData || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement historique PME:', error);
      console.error('📝 Détails erreur:', error.response?.data || error.message);
    } finally {
      setIsLoadingHistory(false);
      console.log('🏁 Fin chargement historique PME');
    }
  };

  // Charger l'historique au montage du composant
  useEffect(() => {
    if (showHistory) {
      loadPMEHistory();
    }
  }, [showHistory]);

  useEffect(() => {
    setChatMessages([]);
    setShowChat(false);
    
    if (showHistory) {
      loadPMEHistory();
    }
  }, [showHistory]);

  // ===================== FONCTIONS HISTORIQUE PME (COMME CRÉDIT PARTICULIER) =====================
  
  const viewAnalysisDetails = (request: any) => {
    console.log('📋 Vue détaillée de la demande PME:', request);
    setSelectedPMERequest(request);
  };

  const backToList = () => {
    console.log('🔙 Retour à la liste des demandes PME');
    setSelectedPMERequest(null);
  };

  // ===================== FONCTIONS CHAT IA PME (COMME CRÉDIT PARTICULIER) =====================
  
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !analysis) return;
    
    setChatLoading(true);
    try {
      // Préparer les données du formulaire PME
      const requestData = {
        raison_sociale: formData.raison_sociale,
        secteur_activite: formData.secteur_activite,
        taille: formData.taille,
        nombre_employes: formData.nombre_employes,
        annee_creation: formData.annee_creation,
        forme_juridique: formData.forme_juridique,
        positionnement: formData.positionnement,
        donnees_financieres: financialYears,
        montant: formData.montant,
        objet: formData.objet,
        duree_mois: formData.duree_mois,
        type_remboursement: formData.type_remboursement,
        garanties: formData.garanties,
        valeur_garanties: formData.valeur_garanties,
        source_remboursement: formData.source_remboursement,
        concentration_clients: formData.concentration_clients,
        dependance_fournisseur: formData.dependance_fournisseur,
        historique_incidents: formData.historique_incidents,
        currency: 'XOF'
      };

      const response = await apiClient.post<{response: string, messages: {role: 'user' | 'assistant', content: string}[], metadata?: any}>('/credit/pme/chat', {
        request_data: requestData,
        calculated_metrics: analysis.calculated_metrics,
        ai_analysis: analysis.ai_analysis,
        ai_decision: analysis.ai_decision,
        ai_recommendations: analysis.ai_recommendations,
        messages: chatMessages,
        user_message: chatInput
      });

      // Utiliser les messages retournés par le backend
      setChatMessages(response.messages);
      setChatInput('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la conversation');
    } finally {
      setChatLoading(false);
    }
  };

  const updateFinancialYear = (index: number, field: keyof FinancialYear, value: string) => {
    const updated = [...financialYears];
    updated[index] = { ...updated[index], [field]: value };
    setFinancialYears(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAnalysis(null);
    setLoading(true);

    try {
      // Préparer les données financières
      const donnees_financieres = financialYears
        .filter((year) => year.chiffre_affaires && year.ebitda !== '')
        .map((year) => ({
          year: parseInt(String(year.year)),
          chiffre_affaires: parseFloat(year.chiffre_affaires),
          ebitda: parseFloat(year.ebitda),
          resultat_net: parseFloat(year.resultat_net || '0'),
          fonds_propres: parseFloat(year.fonds_propres || '0'),
          dettes_financieres_totales: parseFloat(year.dettes_financieres_totales || '0'),
          charges_financieres: parseFloat(year.charges_financieres || '0'),
          tresorerie: parseFloat(year.tresorerie || '0'),
          stocks: year.stocks ? parseFloat(year.stocks) : null,
          creances_clients: year.creances_clients ? parseFloat(year.creances_clients) : null,
          dettes_fournisseurs: year.dettes_fournisseurs ? parseFloat(year.dettes_fournisseurs) : null,
        }));

      if (donnees_financieres.length < 2) {
        setError('Au moins 2 années de données financières sont requises');
        setLoading(false);
        return;
      }

      const requestData = {
        raison_sociale: formData.raison_sociale,
        secteur_activite: formData.secteur_activite,
        taille: formData.taille,
        nombre_employes: formData.nombre_employes ? parseInt(formData.nombre_employes) : null,
        annee_creation: parseInt(formData.annee_creation),
        forme_juridique: formData.forme_juridique,
        positionnement: formData.positionnement || null,
        donnees_financieres: donnees_financieres,
        montant: parseFloat(formData.montant),
        objet: formData.objet,
        duree_mois: parseInt(formData.duree_mois),
        type_remboursement: formData.type_remboursement,
        garanties: formData.garanties || null,
        valeur_garanties: formData.valeur_garanties ? parseFloat(formData.valeur_garanties) : null,
        source_remboursement: formData.source_remboursement,
        concentration_clients: formData.concentration_clients || null,
        dependance_fournisseur: formData.dependance_fournisseur || null,
        historique_incidents: formData.historique_incidents || null,
        currency: formData.currency,
      };

      const response = await apiClient.post<AnalysisResult>('/credit/pme/analyze', requestData);
      setAnalysis(response);
      
      // Réinitialiser le chat pour la nouvelle analyse
      setChatMessages([]);
      setShowChat(false);
      
      // Recharger l'historique après une nouvelle analyse
      if (showHistory) {
        await loadPMEHistory();
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59E0B]"></div>
        <p className="mt-4">Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f3a]/90 via-[#2563EB]/10 to-[#1a1f3a]/90 backdrop-blur-xl rounded-[28px] border border-[#2563EB]/30 p-6 sm:p-8 shadow-xl">
      {/* Header avec bouton d'historique */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {showHistory ? 'Mes analyses PME précédentes' : 'Analyse de crédit PME/PMI'}
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
          {selectedPMERequest ? (
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
                    Analyse du {new Date(selectedPMERequest.created_at).toLocaleDateString()}
                  </h3>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                    selectedPMERequest.ai_decision === 'APPROUVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    selectedPMERequest.ai_decision === 'REFUSE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {selectedPMERequest.ai_decision}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">Demande</h4>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-[#CBD5E1]">
                        Secteur: {selectedPMERequest.request_data?.secteur_activite}<br/>
                        Taille: {selectedPMERequest.request_data?.taille}<br/>
                        Montant: {(selectedPMERequest.request_data?.montant || 0).toLocaleString()} XOF<br/>
                        Durée: {selectedPMERequest.request_data?.duree_mois} mois
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold text-white mb-2">Analyse IA</h4>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap">
                        {selectedPMERequest.ai_analysis}
                      </p>
                    </div>
                  </div>
                  
                  {selectedPMERequest.ai_recommendations && (
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Recommandations</h4>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-[#CBD5E1] whitespace-pre-wrap">
                          {selectedPMERequest.ai_recommendations}
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
              {isLoadingHistory ? (
                <div className="text-center py-12 text-[#CBD5E1]">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                  <p className="mt-4">Chargement de l\'historique...</p>
                </div>
              ) : pmeHistory.length === 0 ? (
                <div className="text-center py-12 text-[#CBD5E1]">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-lg">Aucune analyse PME précédente</p>
                  <p className="text-sm mt-2">Effectuez votre première analyse pour voir l\'historique ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pmeHistory.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                      onClick={() => viewAnalysisDetails(request)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">
                            {request.request_data?.secteur_activite} - {request.request_data?.taille}
                          </p>
                          <p className="text-sm text-[#CBD5E1]">
                            {(request.request_data?.montant || 0).toLocaleString()} XOF • {request.request_data?.duree_mois} mois
                          </p>
                          <p className="text-xs text-[#CBD5E1] mt-1">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                          request.ai_decision === 'APPROUVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          request.ai_decision === 'REFUSE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {request.ai_decision}
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
        {/* Profil entreprise */}
        {(isFieldEnabled('secteur_activite') || isFieldEnabled('taille') || isFieldEnabled('nombre_employes') || isFieldEnabled('annee_creation') || isFieldEnabled('forme_juridique') || isFieldEnabled('positionnement') || isFieldEnabled('raison_sociale')) && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
              🏢 Profil entreprise
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFieldEnabled('raison_sociale') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Raison sociale {isFieldRequired('raison_sociale') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.raison_sociale}
                    onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                    required={isFieldRequired('raison_sociale')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                    placeholder="Nom / raison sociale de l'entreprise"
                  />
                </div>
              )}
              {isFieldEnabled('secteur_activite') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Secteur d'activité {isFieldRequired('secteur_activite') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.secteur_activite}
                    onChange={(e) => setFormData({ ...formData, secteur_activite: e.target.value })}
                    required={isFieldRequired('secteur_activite')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                    placeholder="Ex: commerce, BTP, industrie..."
                  />
                </div>
              )}

              {isFieldEnabled('taille') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Taille {isFieldRequired('taille') && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={formData.taille}
                    onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                    required={isFieldRequired('taille')}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  >
                    <option value="TPE">TPE</option>
                    <option value="PME">PME</option>
                    <option value="PMI">PMI</option>
                    <option value="ETI">ETI</option>
                  </select>
                </div>
              )}

              {isFieldEnabled('nombre_employes') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nombre d'employés {isFieldRequired('nombre_employes') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.nombre_employes}
                    onChange={(e) => setFormData({ ...formData, nombre_employes: e.target.value })}
                    required={isFieldRequired('nombre_employes')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              )}

              {isFieldEnabled('annee_creation') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Année de création {isFieldRequired('annee_creation') && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={currentYear}
                    value={formData.annee_creation}
                    onChange={(e) => setFormData({ ...formData, annee_creation: e.target.value })}
                    required={isFieldRequired('annee_creation')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                    placeholder={String(currentYear)}
                  />
                </div>
              )}

              {isFieldEnabled('forme_juridique') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Forme juridique {isFieldRequired('forme_juridique') && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={formData.forme_juridique}
                    onChange={(e) => setFormData({ ...formData, forme_juridique: e.target.value })}
                    required={isFieldRequired('forme_juridique')}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  >
                    <option value="SARL">SARL</option>
                    <option value="SA">SA</option>
                    <option value="SAS">SAS</option>
                    <option value="SNC">SNC</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              )}

              {isFieldEnabled('positionnement') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">
                    Positionnement {isFieldRequired('positionnement') && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={formData.positionnement}
                    onChange={(e) => setFormData({ ...formData, positionnement: e.target.value })}
                    required={isFieldRequired('positionnement')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300 min-h-[80px]"
                    placeholder="Activité principale, gamme de clients..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Données financières */}
        {isFieldEnabled('donnees_financieres') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white pb-2 border-b-2 border-[#F59E0B]/30">
                💰 Données financières (2-3 ans)
              </h3>
              {financialYears.length < 3 && (
                <button
                  type="button"
                  onClick={addFinancialYear}
                  className="px-4 py-2 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  + Ajouter une année
                </button>
              )}
            </div>

            <div className="space-y-4">
              {financialYears.map((year, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-white">Année:</label>
                      <input
                        type="number"
                        min="1900"
                        max={currentYear}
                        value={year.year}
                        onChange={(e) => updateFinancialYear(index, 'year', e.target.value)}
                        className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                      />
                    </div>
                    {financialYears.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeFinancialYear(index)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        CA ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.chiffre_affaires}
                        onChange={(e) => updateFinancialYear(index, 'chiffre_affaires', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        EBE ({formData.currency}){' '}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.ebitda}
                        onChange={(e) => updateFinancialYear(index, 'ebitda', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Résultat net ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.resultat_net}
                        onChange={(e) => updateFinancialYear(index, 'resultat_net', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Fonds propres ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.fonds_propres}
                        onChange={(e) => updateFinancialYear(index, 'fonds_propres', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Dettes financières ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.dettes_financieres_totales}
                        onChange={(e) => updateFinancialYear(index, 'dettes_financieres_totales', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Charges financières ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.charges_financieres}
                        onChange={(e) => updateFinancialYear(index, 'charges_financieres', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Trésorerie ({formData.currency}) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.tresorerie}
                        onChange={(e) => updateFinancialYear(index, 'tresorerie', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Stocks ({formData.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.stocks}
                        onChange={(e) => updateFinancialYear(index, 'stocks', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Créances clients ({formData.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.creances_clients}
                        onChange={(e) => updateFinancialYear(index, 'creances_clients', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1">
                        Dettes fournisseurs ({formData.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={year.dettes_fournisseurs}
                        onChange={(e) => updateFinancialYear(index, 'dettes_fournisseurs', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crédit demandé */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
            💳 Crédit demandé
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFieldEnabled('montant') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Montant ({formData.currency}) {isFieldRequired('montant') && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  required={isFieldRequired('montant')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  placeholder="0"
                />
              </div>
            )}

            {isFieldEnabled('objet') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Objet {isFieldRequired('objet') && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={formData.objet}
                  onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                  required={isFieldRequired('objet')}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                >
                  <option value="investissement">Investissement</option>
                  <option value="tresorerie">Trésorerie</option>
                  <option value="ligne de fonctionnement">Ligne de fonctionnement</option>
                  <option value="equipement">Équipement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            )}

            {isFieldEnabled('duree_mois') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Durée (mois) {isFieldRequired('duree_mois') && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duree_mois}
                  onChange={(e) => setFormData({ ...formData, duree_mois: e.target.value })}
                  required={isFieldRequired('duree_mois')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  placeholder="0"
                />
              </div>
            )}

            {isFieldEnabled('type_remboursement') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Type de remboursement {isFieldRequired('type_remboursement') && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={formData.type_remboursement}
                  onChange={(e) => setFormData({ ...formData, type_remboursement: e.target.value })}
                  required={isFieldRequired('type_remboursement')}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                >
                  <option value="amortissable">Amortissable</option>
                  <option value="in fine">In fine</option>
                  <option value="differe">Différé</option>
                </select>
              </div>
            )}

            {isFieldEnabled('garanties') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Garanties {isFieldRequired('garanties') && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.garanties}
                  onChange={(e) => setFormData({ ...formData, garanties: e.target.value })}
                  required={isFieldRequired('garanties')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  placeholder="Ex: hypothèque, nantissement..."
                />
              </div>
            )}

            {isFieldEnabled('valeur_garanties') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Valeur des garanties ({formData.currency}) {isFieldRequired('valeur_garanties') && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valeur_garanties}
                  onChange={(e) => setFormData({ ...formData, valeur_garanties: e.target.value })}
                  required={isFieldRequired('valeur_garanties')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                  placeholder="0"
                />
              </div>
            )}

            {isFieldEnabled('source_remboursement') && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Source de remboursement {isFieldRequired('source_remboursement') && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={formData.source_remboursement}
                  onChange={(e) => setFormData({ ...formData, source_remboursement: e.target.value })}
                  required={isFieldRequired('source_remboursement')}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
                >
                  <option value="cash-flow exploitation">Cash-flow d'exploitation</option>
                  <option value="subvention">Subvention</option>
                  <option value="vente actif">Vente d'actif</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Devise <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300"
              >
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contexte risque */}
        {(isFieldEnabled('concentration_clients') || isFieldEnabled('dependance_fournisseur') || isFieldEnabled('historique_incidents')) && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b-2 border-[#F59E0B]/30">
              ⚠️ Contexte risque
            </h3>
            <div className="space-y-4">
              {isFieldEnabled('concentration_clients') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Concentration clients {isFieldRequired('concentration_clients') && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={formData.concentration_clients}
                    onChange={(e) => setFormData({ ...formData, concentration_clients: e.target.value })}
                    required={isFieldRequired('concentration_clients')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300 min-h-[80px]"
                    placeholder="Ex: 60% du CA avec 2 clients"
                  />
                </div>
              )}

              {isFieldEnabled('dependance_fournisseur') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Dépendance fournisseur {isFieldRequired('dependance_fournisseur') && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={formData.dependance_fournisseur}
                    onChange={(e) => setFormData({ ...formData, dependance_fournisseur: e.target.value })}
                    required={isFieldRequired('dependance_fournisseur')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300 min-h-[80px]"
                    placeholder="Dépendance à un fournisseur ou marché public"
                  />
                </div>
              )}

              {isFieldEnabled('historique_incidents') && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Historique incidents {isFieldRequired('historique_incidents') && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={formData.historique_incidents}
                    onChange={(e) => setFormData({ ...formData, historique_incidents: e.target.value })}
                    required={isFieldRequired('historique_incidents')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition-all duration-300 min-h-[80px]"
                    placeholder="Historique d'incidents de paiement si disponible"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white font-bold rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#F59E0B]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-2"
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

            {/* Métriques calculées */}
            {analysis.calculated_metrics && (
              <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-lg font-bold text-white mb-4">📈 Métriques calculées</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(analysis.calculated_metrics).map(([key, value]) => (
                    value !== null && (
                      <div key={key} className="p-3 bg-white/5 rounded-lg">
                        <p className="text-[#CBD5E1] text-xs mb-1">
                          {calculatedMetricLabels[key] || key}
                        </p>
                        <p className="text-white font-semibold">{String(value)}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}

      {/* Bouton pour discuter avec l'IA PME */}
      {analysis && (
        <div className="flex justify-center mt-6 space-x-4">
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-6 py-3 bg-gradient-to-r from-[#2563EB]/20 to-[#7C3AED]/20 hover:from-[#2563EB]/30 hover:to-[#7C3AED]/30 text-[#2563EB] font-semibold rounded-lg border border-[#2563EB]/30 transition-all duration-300 flex items-center space-x-2"
          >
            <span>💬</span>
            <span>{showChat ? 'Masquer la discussion' : 'Discuter de ce dossier PME avec l\'IA'}</span>
          </button>
          
          <button
            onClick={() => setShowVoiceModal(!showVoiceModal)}
            className="px-6 py-3 bg-gradient-to-r from-[#10B981]/20 to-[#3B82F6]/20 hover:from-[#10B981]/30 hover:to-[#3B82F6]/30 text-[#10B981] font-semibold rounded-lg border border-[#10B981]/30 transition-all duration-300 flex items-center space-x-2"
          >
            <span>🎙️</span>
            <span>{showVoiceModal ? 'Masquer l\'assistant vocal' : 'Assistant vocal'}</span>
          </button>
        </div>
      )}

      {/* Interface de chat IA PME */}
      {showChat && (
        <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-lg font-bold text-white mb-4">💬 Discussion avec l'expert crédit PME</h4>
          
          {/* Messages */}
          <div className="h-64 overflow-y-auto mb-4 space-y-3 p-3 bg-white/5 rounded-lg">
            {chatMessages.length === 0 ? (
              <p className="text-[#CBD5E1] text-center text-sm">
                Posez vos questions sur l'analyse de ce dossier de crédit PME...
              </p>
            ) : (
              chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-[#2563EB] text-white' 
                      : 'bg-white/10 text-[#CBD5E1] border border-white/20'
                  }`}>
                    {msg.content}
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
              placeholder="Tapez votre question sur le crédit PME..."
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

      {/* Modal Assistant Vocal PME */}
      <CreditPMEVoiceAssistantModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        analysis={analysis}
        formData={formData}
      />
    </div>
  );
}

