'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

interface CreditPMEVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis?: any;
  formData?: any;
}

export default function CreditPMEVoiceAssistantModal({
  isOpen,
  onClose,
  analysis,
  formData,
}: CreditPMEVoiceAssistantModalProps) {
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
      // Charger les dossiers PME disponibles quand le modal s'ouvre
      loadAvailableDossiers();
    }
  }, [isOpen]);

  const loadAvailableDossiers = async () => {
    setIsLoadingDossiers(true);
    try {
      const response = await apiClient.get('/credit/pme/requests') as any[];
      setAvailableDossiers(response);
      
      // Sélectionner automatiquement le dossier le plus récent
      if (response.length > 0) {
        setSelectedDossierId(response[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers PME:', error);
    } finally {
      setIsLoadingDossiers(false);
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
      setIsRecording(true);
      setTranscript('');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      
      if (event.results[0].isFinal) {
        console.log('Texte final:', transcript);
        processVoiceCommand(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
        console.error('Aucun dossier PME sélectionné');
        return;
      }
      
      // Envoyer au backend pour traitement avec ElevenLabs (endpoint PME)
      console.log('📡 Envoi requête vocale PME:', { text, dossier_id: selectedDossierId });
      const response = await apiClient.post('/credit/pme/voice/process-command', {
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
      
      console.log('📊 Réponse backend vocale:', response);
      console.log('📝 Réponse détaillée:', response.reponse_detaillee);
      console.log('🔊 Audio disponible:', !!response.audio_data);
      
      // Ajouter la réponse de l'assistant à l'historique (même sans audio)
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: response.reponse_detaillee || 'Réponse non disponible', 
        timestamp: new Date() 
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      // Jouer l'audio depuis les données base64 si disponible
      if (response.audio_data) {
        playAudioFromBase64(response.audio_data);
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement vocal PME:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioFromBase64 = (base64Audio: string) => {
    try {
      const audioBlob = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
      
      const audio = new Audio(audioUrl);
      audio.play();
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      };
    } catch (error) {
      console.error('Erreur lors de la lecture audio:', error);
    }
  };

  const prepareContext = () => {
    const secteur = formData?.secteur_activite || 'Secteur non spécifié';
    const montant = formData?.montant || 0;
    return `Analyse de crédit PME pour ${secteur}, montant: ${montant.toLocaleString()} XOF`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white mr-3">
                  🎙️
                </span>
                Assistant Vocal PME
              </h3>
              <p className="text-gray-600 mt-1">Discutez de votre dossier de crédit PME avec l'IA</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Sélection du dossier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dossier PME à analyser
            </label>
            {isLoadingDossiers ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                <p className="text-gray-500 mt-2">Chargement des dossiers...</p>
              </div>
            ) : (
              <select
                value={selectedDossierId}
                onChange={(e) => setSelectedDossierId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {availableDossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>
                    {dossier.request_data?.secteur_activite} - {new Date(dossier.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contexte actuel */}
          {analysis && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Contexte actuel</h4>
              <p className="text-sm text-green-700">{prepareContext()}</p>
              <p className="text-sm text-green-600 mt-1">
                Décision: <span className="font-semibold">{analysis.ai_decision}</span>
              </p>
            </div>
          )}

          {/* Interface d'enregistrement */}
          <div className="text-center space-y-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`px-8 py-4 rounded-full text-white font-semibold transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? '🔴 Enregistrement...' : '🎙️ Parler'}
            </button>
            
            {isProcessing && (
              <p className="text-gray-600">Traitement de la commande vocale...</p>
            )}
            
            {transcript && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Transcription:</p>
                <p className="text-blue-700">{transcript}</p>
              </div>
            )}
          </div>

          {/* Historique de conversation */}
          {conversationHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-gray-800 mb-3">Conversation</h4>
              <div className="space-y-3">
                {conversationHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio player */}
          {audioUrl && (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">Réponse vocale:</p>
              <audio controls className="w-full" src={audioUrl}>
                Votre navigateur ne supporte pas l'audio.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
