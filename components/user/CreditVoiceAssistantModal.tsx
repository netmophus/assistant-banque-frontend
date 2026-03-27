'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

interface CreditVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis?: any;
  formData?: any;
}

export default function CreditVoiceAssistantModal({
  isOpen,
  onClose,
  analysis,
  formData,
}: CreditVoiceAssistantModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string, timestamp: Date}>>([]);
  const [availableDossiers, setAvailableDossiers] = useState<Array<any>>([]);
  const [selectedDossierId, setSelectedDossierId] = useState<string>("");
  const [isLoadingDossiers, setIsLoadingDossiers] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
    } else {
      // Charger les dossiers disponibles quand le modal s'ouvre
      loadAvailableDossiers();
    }
  }, [isOpen]);

  const loadAvailableDossiers = async () => {
    setIsLoadingDossiers(true);
    try {
      const response = await apiClient.get('/voice/dossiers') as { dossiers: any[] };
      setAvailableDossiers(response.dossiers);
      
      // Sélectionner automatiquement le dossier le plus récent
      if (response.dossiers.length > 0) {
        setSelectedDossierId(response.dossiers[0]._id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    } finally {
      setIsLoadingDossiers(false);
    }
  };

  const startRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        console.log('Reconnaissance vocale démarrée');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          console.log('Texte final:', transcript);
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const playAudioFromBase64 = (audioBase64: string) => {
    try {
      // Convertir base64 en blob audio
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      audio.play();
      
      // Nettoyer l'URL après la lecture
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Erreur lors de la lecture de l\'audio:', error);
    }
  };

  const processVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    
    try {
      // Ajouter le message utilisateur à l'historique
      const userMessage = { role: 'user' as const, content: text, timestamp: new Date() };
      const updatedHistory = [...conversationHistory, userMessage];
      setConversationHistory(updatedHistory);
      
      // Utiliser le dossier sélectionné dynamiquement
      if (!selectedDossierId) {
        console.error('Aucun dossier sélectionné');
        return;
      }
      
      // Envoyer au backend pour traitement avec ElevenLabs
      const response = await apiClient.post('/voice/process-command', {
        text: text,
        dossier_id: selectedDossierId,
        conversation_history: updatedHistory.slice(-10) // Garder les 10 derniers messages
      }) as { 
        reponse_courte: string; 
        reponse_detaillee: string; 
        audio_data: string; 
        analyse_complete: any;
        conversation_history: Array<{role: string, content: string, timestamp: string}>;
      };
      
      if (response.audio_data) {
        // Jouer l'audio depuis les données base64
        playAudioFromBase64(response.audio_data);
        
        // Ajouter la réponse de l'assistant à l'historique
        const assistantMessage = { 
          role: 'assistant' as const, 
          content: response.reponse_detaillee, 
          timestamp: new Date() 
        };
        setConversationHistory(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const prepareContext = () => {
    const clientName = formData?.clientName || 'Client';
    const loanAmount = analysis?.recommendedAmount || formData?.loanAmount || 0;
    const duration = analysis?.recommendedDuration || formData?.loanDurationMonths || 0;
    const decision = analysis?.decision || 'EN_ATTENTE';
    const summary = analysis?.summary || 'Analyse en cours...';
    
    return {
      dossier: {
        client: clientName,
        montant: loanAmount,
        duree: duration,
        decision: decision,
        resume: summary
      },
      instructions: "Tu es un expert-conseil bancaire spécialisé en crédit. Réponds aux questions du client concernant CE DOSSIER UNIQUEMENT. Sois clair, précis et professionnel."
    };
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Assistant Vocal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Sélecteur de dossier */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Sélection du dossier</h3>
          {isLoadingDossiers ? (
            <p className="text-sm text-gray-600">Chargement des dossiers...</p>
          ) : (
            <select
              value={selectedDossierId}
              onChange={(e) => setSelectedDossierId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              disabled={isProcessing}
            >
              <option value="">Choisir un dossier...</option>
              {availableDossiers.map((dossier) => (
                <option key={dossier._id} value={dossier._id}>
                  {dossier.client_name} - {dossier.montant.toLocaleString()} XOF - {dossier.decision}
                </option>
              ))}
            </select>
          )}
          {selectedDossierId && (
            <p className="text-xs text-green-600 mt-1">
              Dossier sélectionné : {availableDossiers.find(d => d._id === selectedDossierId)?.client_name}
            </p>
          )}
        </div>

        {/* Contexte du dossier */}
        {(analysis || formData) && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Contexte du dossier</h3>
            <div className="text-sm text-blue-800">
              <p><strong>Client:</strong> {availableDossiers.find(d => d._id === selectedDossierId)?.request_data?.clientName || formData?.clientName || 'Non spécifié'}</p>
              <p><strong>Montant:</strong> {(availableDossiers.find(d => d._id === selectedDossierId)?.request_data?.loanAmount || formData?.loanAmount || 0).toLocaleString()} XOF</p>
              <p><strong>Durée:</strong> {availableDossiers.find(d => d._id === selectedDossierId)?.request_data?.loanDurationMonths || formData?.loanDurationMonths || 0} mois</p>
              <p><strong>Décision:</strong> {availableDossiers.find(d => d._id === selectedDossierId)?.ai_decision || analysis?.ai_decision || 'En attente'}</p>
            </div>
          </div>
        )}

        {/* Interface vocale */}
        <div className="text-center mb-6">
          {/* Historique de conversation */}
          {conversationHistory.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
              <div className="text-sm space-y-2">
                {conversationHistory.map((msg, index) => (
                  <div key={index} className={`text-left ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                    <span className="font-semibold">{msg.role === 'user' ? 'Vous:' : 'Assistant:'}</span> {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-4">
            {transcript && (
              <div className="p-3 bg-gray-100 rounded-lg mb-4">
                <p className="text-gray-800">{transcript}</p>
              </div>
            )}
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`px-8 py-4 rounded-full text-white font-semibold transition-colors ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRecording ? '🔴 Arrêter' : '🎤 Parler'}
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Traitement en cours...</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Cliquez sur "Parler" pour poser votre question</li>
            <li>• Parlez clairement et naturellement</li>
            <li>• L'assistant vous répondra vocalement</li>
          </ul>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
