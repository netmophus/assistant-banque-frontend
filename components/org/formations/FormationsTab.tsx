'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

// FormationsTab
//
// Rôle (côté admin organisation):
// - CRUD des formations (liste, création, édition)
// - Saisie assistée via un wizard en étapes (infos -> modules -> aperçu -> publication)
// - Gestion du brouillon (status=draft) via "Sauvegarder brouillon" (PUT/POST)
// - Publication (draft -> published) via une modale (options IA: contenu/QCM)
// - Affectation d'une formation publiée aux départements (modale)
//
// Routes API utilisées (Next.js proxy):
// - GET/POST /api/formations
// - GET/PUT /api/formations/[id]
// - POST /api/formations/[id]/publish?auto_generate_content&auto_generate_qcm
// - GET /api/formations/[id]/assigned-departments
// - POST /api/formations/[id]/assign-departments
//
// Notes UX:
// - Feedback non-bloquant via `error`/`message` (pas de alert/confirm)
// - Fermeture: on bloque uniquement si des changements non sauvegardés sont détectés.

interface Partie {
  titre: string;
  contenu: string;
  contenu_genere?: string;
  id?: string;
}

interface Chapitre {
  titre: string;
  introduction: string;
  nombre_parties: number;
  parties: Partie[];
  contenu_genere?: string;
  id?: string;
}

interface Module {
  titre: string;
  nombre_chapitres: number;
  chapitres: Chapitre[];
  questions_qcm?: any[];
  id?: string;
}

interface Formation {
  id?: string;
  titre: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  modules_count?: number;
  modules?: Module[];
  bloc_numero?: number | null;
  bloc_titre?: string | null;
  bloc_label?: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface FormationForm {
  titre: string;
  description: string;
  modules: Module[];
  bloc_numero: number | '';
  bloc_titre: string;
}

// Blocs prédéfinis PCB-UEMOA
const BLOCS_PREDEFINIS = [
  { numero: 1, titre: 'Plan Comptable Bancaire (PCB révisé)' },
  { numero: 2, titre: 'Réglementation prudentielle UEMOA' },
  { numero: 3, titre: 'Gestion du risque de crédit' },
  { numero: 4, titre: 'Gestion des impayés et recouvrement' },
  { numero: 5, titre: 'Analyse financière et scoring bancaire' },
  { numero: 6, titre: 'Conformité et lutte contre le blanchiment' },
  { numero: 7, titre: 'Opérations de trésorerie et marchés' },
  { numero: 8, titre: 'Financement des PME et microfinance' },
  { numero: 9, titre: 'Gouvernance et contrôle interne bancaire' },
  { numero: 10, titre: 'Transformation digitale et innovation bancaire' },
];

const FormationsTab = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  // 'blocs' = vue principale groupée | 'select-bloc' = choisir un bloc | 'form' = wizard
  const [view, setView] = useState<'blocs' | 'select-bloc' | 'form'>('blocs');
  const [showFormationForm, setShowFormationForm] = useState(false);
  const [selectedBlocForNew, setSelectedBlocForNew] = useState<{ bloc_numero: number | ''; bloc_titre: string } | null>(null);
  const [newBlocNumero, setNewBlocNumero] = useState<number | ''>('');
  const [newBlocTitre, setNewBlocTitre] = useState('');
  const [editingFormationId, setEditingFormationId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<'infos' | 'modules' | 'preview' | 'publish'>('infos');
  const [showPreview, setShowPreview] = useState(false);
  const [expandedPreviewModuleIndex, setExpandedPreviewModuleIndex] = useState<number | null>(null);
  const [expandedPreviewChapterKey, setExpandedPreviewChapterKey] = useState<string | null>(null);
  const [expandedEditModuleIndex, setExpandedEditModuleIndex] = useState<number | null>(null);
  const [expandedEditChapterKey, setExpandedEditChapterKey] = useState<string | null>(null);
  const [formationForm, setFormationForm] = useState<FormationForm>({
    titre: '',
    description: '',
    modules: [],
    bloc_numero: '',
    bloc_titre: '',
  });
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedFormationForAssign, setSelectedFormationForAssign] = useState<Formation | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishFormationId, setPublishFormationId] = useState<string | null>(null);
  const [publishGenerateContent, setPublishGenerateContent] = useState(true);
  const [publishGenerateQcm, setPublishGenerateQcm] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const serializeFormationForm = (form: FormationForm) => {
    const normalized = {
      titre: form?.titre || '',
      description: form?.description || '',
      bloc_numero: form?.bloc_numero || null,
      bloc_titre: form?.bloc_titre || '',
      modules: (form?.modules || []).map((m) => ({
        titre: m?.titre || '',
        chapitres: (m?.chapitres || []).map((c) => ({
          titre: c?.titre || '',
          introduction: c?.introduction || '',
          parties: (c?.parties || []).map((p) => ({
            titre: p?.titre || '',
            contenu: p?.contenu || '',
          })),
        })),
      })),
    };
    return JSON.stringify(normalized);
  };

  const currentSnapshot = serializeFormationForm(formationForm);
  const isDirty = !!editingFormationId && !!lastSavedSnapshot && currentSnapshot !== lastSavedSnapshot;

  const getFormationId = (formation: any): string | undefined => {
    return formation?.id || formation?._id;
  };

  useEffect(() => {
    fetchFormations();
    fetchDepartments();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const fetchFormations = async () => {
    try {
      const response = await fetch('/api/formations', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des formations');
      }

      const data = await response.json();
      const normalized = (data || []).map((f: any) => ({
        ...f,
        id: getFormationId(f),
      }));
      setFormations(normalized);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des formations:', err);
      setError(err.message || 'Erreur lors de la récupération des formations');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data || []);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const prepareFormationData = () => {
    const modulesToSend = formationForm.modules.map((module) => ({
      titre: module.titre || '',
      nombre_chapitres: module.chapitres ? module.chapitres.length : 0,
      chapitres: (module.chapitres || []).map((chapitre) => ({
        titre: chapitre.titre || '',
        introduction: chapitre.introduction || '',
        nombre_parties: chapitre.parties ? chapitre.parties.length : 0,
        parties: (chapitre.parties || []).map((partie) => ({
          titre: partie.titre || '',
          contenu: partie.contenu || '',
        })),
        contenu_genere: chapitre.contenu_genere || null,
      })),
      questions_qcm: module.questions_qcm || [],
    }));

    return {
      titre: formationForm.titre || '',
      description: formationForm.description || null,
      organization_id: currentUser?.organization_id,
      modules: modulesToSend,
      bloc_numero: formationForm.bloc_numero !== '' ? Number(formationForm.bloc_numero) : null,
      bloc_titre: formationForm.bloc_titre || null,
    };
  };

  const handleSaveDraft = async () => {
    try {
      const formationData = prepareFormationData();

      if (editingFormationId) {
        const response = await fetch(`/api/formations/${editingFormationId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            titre: formationData.titre,
            description: formationData.description,
            modules: formationData.modules,
            status: 'draft',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
        }

        setMessage('Brouillon sauvegardé avec succès.');
        setError('');
        setLastSavedSnapshot(serializeFormationForm(formationForm));
      } else {
        const response = await fetch('/api/formations', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...formationData,
            status: 'draft',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
        }

        const data = await response.json();
        const newId = getFormationId(data);
        if (newId) setEditingFormationId(newId);

        setMessage('Brouillon sauvegardé avec succès.');
        setError('');
        setLastSavedSnapshot(serializeFormationForm(formationForm));
      }

      fetchFormations();
    } catch (err: any) {
      console.error('Erreur:', err);
      setMessage('');
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCreateFormation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formationForm.titre || formationForm.titre.trim() === '') {
      setMessage('');
      setError('Veuillez saisir au moins le titre de la formation.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formationData = prepareFormationData();

      if (editingFormationId) {
        const response = await fetch(`/api/formations/${editingFormationId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            titre: formationData.titre,
            description: formationData.description,
            modules: formationData.modules,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erreur lors de la mise à jour');
        }

        setMessage('Formation modifiée avec succès.');
        setError('');
        setLastSavedSnapshot(serializeFormationForm(formationForm));
      } else {
        const response = await fetch('/api/formations', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(formationData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erreur lors de la création');
        }

        const data = await response.json();
        const newId = getFormationId(data);
        if (newId) setEditingFormationId(newId);

        setMessage('Formation créée avec succès.');
        setError('');
        setLastSavedSnapshot(serializeFormationForm(formationForm));
      }

      fetchFormations();
    } catch (err: any) {
      setMessage('');
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFormation = async (formation: Formation) => {
    try {
      const formationId = getFormationId(formation);
      if (!formationId || formationId === 'undefined') {
        throw new Error("Formation non identifiée (id manquant)");
      }

      const response = await fetch(`/api/formations/${formationId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la formation');
      }

      const fullFormation = await response.json();

      const modulesWithIds = (fullFormation.modules || []).map((module: any) => ({
        titre: module.titre || '',
        nombre_chapitres: module.nombre_chapitres || 0,
        chapitres: (module.chapitres || []).map((chapitre: any) => ({
          titre: chapitre.titre || '',
          introduction: chapitre.introduction || '',
          nombre_parties: chapitre.nombre_parties || 0,
          parties: (chapitre.parties || []).map((partie: any) => ({
            titre: partie.titre || '',
            contenu: partie.contenu || '',
          })),
          contenu_genere: chapitre.contenu_genere || null,
          id: chapitre.id,
        })),
        questions_qcm: module.questions_qcm || [],
        id: module.id,
      }));

      setShowFormationForm(true);
      setEditingFormationId(formationId);
      setExpandedEditModuleIndex(null);
      setExpandedEditChapterKey(null);
      const nextForm: FormationForm = {
        titre: fullFormation.titre || '',
        description: fullFormation.description || '',
        modules: modulesWithIds,
        bloc_numero: fullFormation.bloc_numero ?? '',
        bloc_titre: fullFormation.bloc_titre || '',
      };
      setFormationForm(nextForm);
      setLastSavedSnapshot(serializeFormationForm(nextForm));
    } catch (err: any) {
      setMessage('');
      setError(err.message || 'Erreur lors du chargement de la formation');
    }
  };

  const openPublishModal = (formationId: string) => {
    if (!formationId || formationId === 'undefined') {
      setMessage('');
      setError("Formation non identifiée: veuillez d'abord créer/sauvegarder la formation, puis réessayer.");
      return;
    }

    setPublishFormationId(formationId);
    setPublishGenerateContent(true);
    setPublishGenerateQcm(false);
    setShowPublishModal(true);
    setError('');
    setMessage('');
  };

  const handlePublishFormation = async (formationId: string, options: { generateContent: boolean; generateQcm: boolean }) => {
    if (!formationId || formationId === 'undefined') {
      setMessage('');
      setError("Formation non identifiée: veuillez réessayer.");
      return;
    }

    setPublishing(true);
    setLoading(true);
    setError('');
    setMessage('Publication en cours...');

    try {
      const params = new URLSearchParams();
      if (options.generateContent) params.append('auto_generate_content', 'true');
      if (options.generateQcm) params.append('auto_generate_qcm', 'true');

      const url = `/api/formations/${formationId}/publish${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de la publication');
      }

      setMessage('Formation publiée avec succès.');
      setError('');
      setShowPublishModal(false);
      setPublishFormationId(null);
      fetchFormations();
    } catch (err: any) {
      setMessage('');
      setError(err.message || 'Erreur lors de la publication');
    } finally {
      setPublishing(false);
      setLoading(false);
    }
  };

  const addModule = () => {
    setFormationForm({
      ...formationForm,
      modules: [
        ...formationForm.modules,
        {
          titre: '',
          nombre_chapitres: 0,
          chapitres: [],
        },
      ],
    });
  };

  const updateModule = (moduleIndex: number, field: keyof Module, value: any) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removeModule = (moduleIndex: number) => {
    const updatedModules = formationForm.modules.filter((_, idx) => idx !== moduleIndex);
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const addChapitre = (moduleIndex: number) => {
    const updatedModules = [...formationForm.modules];
    if (!updatedModules[moduleIndex].chapitres) {
      updatedModules[moduleIndex].chapitres = [];
    }
    updatedModules[moduleIndex].chapitres.push({
      titre: '',
      introduction: '',
      nombre_parties: 0,
      parties: [],
    });
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const updateChapitre = (moduleIndex: number, chapitreIndex: number, field: keyof Chapitre, value: any) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex] = {
      ...updatedModules[moduleIndex].chapitres[chapitreIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removeChapitre = (moduleIndex: number, chapitreIndex: number) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres = updatedModules[moduleIndex].chapitres.filter(
      (_, idx) => idx !== chapitreIndex
    );
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const addPartie = (moduleIndex: number, chapitreIndex: number) => {
    const updatedModules = [...formationForm.modules];
    if (!updatedModules[moduleIndex].chapitres[chapitreIndex].parties) {
      updatedModules[moduleIndex].chapitres[chapitreIndex].parties = [];
    }
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties.push({
      titre: '',
      contenu: '',
    });
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const updatePartie = (moduleIndex: number, chapitreIndex: number, partieIndex: number, field: keyof Partie, value: string) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties[partieIndex] = {
      ...updatedModules[moduleIndex].chapitres[chapitreIndex].parties[partieIndex],
      [field]: value,
    };
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const removePartie = (moduleIndex: number, chapitreIndex: number, partieIndex: number) => {
    const updatedModules = [...formationForm.modules];
    updatedModules[moduleIndex].chapitres[chapitreIndex].parties = updatedModules[moduleIndex].chapitres[
      chapitreIndex
    ].parties.filter((_, idx) => idx !== partieIndex);
    setFormationForm({ ...formationForm, modules: updatedModules });
  };

  const resetForm = () => {
    setFormationForm({ titre: '', description: '', modules: [], bloc_numero: '', bloc_titre: '' });
    setShowFormationForm(false);
    setView('blocs');
    setSelectedBlocForNew(null);
    setNewBlocNumero('');
    setNewBlocTitre('');
    setEditingFormationId(null);
    setLastSavedSnapshot('');
    setActiveStep('infos');
    setShowPreview(false);
    setExpandedPreviewModuleIndex(null);
    setExpandedPreviewChapterKey(null);
    setExpandedEditModuleIndex(null);
    setExpandedEditChapterKey(null);
  };

  // ── Grouper les formations par bloc ───────────────────────────────────────
  const groupedFormations = React.useMemo(() => {
    const groups: Record<string, { bloc_numero: number | null; bloc_titre: string | null; bloc_label: string; formations: Formation[] }> = {};
    for (const f of formations) {
      const key = f.bloc_numero != null ? String(f.bloc_numero) : '__sans_bloc__';
      if (!groups[key]) {
        groups[key] = {
          bloc_numero: f.bloc_numero ?? null,
          bloc_titre: f.bloc_titre ?? null,
          bloc_label: f.bloc_label ?? (f.bloc_numero != null ? `BLOC ${f.bloc_numero}` : 'Sans bloc'),
          formations: [],
        };
      }
      groups[key].formations.push(f);
    }
    // Trier : blocs numérotés d'abord, puis sans bloc
    return Object.values(groups).sort((a, b) => {
      if (a.bloc_numero == null) return 1;
      if (b.bloc_numero == null) return -1;
      return (a.bloc_numero as number) - (b.bloc_numero as number);
    });
  }, [formations]);

  // ── Ouvrir la création dans un bloc donné ────────────────────────────────
  const openFormInBloc = (bloc: { bloc_numero: number | ''; bloc_titre: string }) => {
    setSelectedBlocForNew(bloc);
    setFormationForm({ titre: '', description: '', modules: [], bloc_numero: bloc.bloc_numero, bloc_titre: bloc.bloc_titre });
    setEditingFormationId(null);
    setLastSavedSnapshot('');
    setActiveStep('infos');
    setShowFormationForm(true);
    setView('form');
    setError('');
    setMessage('');
  };

  const canGoToStep = (step: 'infos' | 'modules' | 'preview' | 'publish') => {
    if (step === 'modules' || step === 'preview' || step === 'publish') {
      return !!formationForm.titre?.trim();
    }
    return true;
  };

  const goToStep = (step: 'infos' | 'modules' | 'preview' | 'publish') => {
    if (!canGoToStep(step)) {
      setMessage('');
      setError('Veuillez saisir au moins le titre de la formation.');
      return;
    }
    setError('');
    setMessage('');
    setActiveStep(step);
  };

  // ─── Miznas Pilot design tokens ──────────────────────────────────────────────────
  const nb = {
    deepNavy:    '#040B1E',
    darkNavy:    '#070E28',
    surface:     '#0A1434',
    surfaceLight:'#0F1E48',
    royal:       '#1B3A8C',
    gold:        '#C9A84C',
    purple:      '#7C3AED',
    green:       '#059669',
    red:         '#EF4444',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(27,58,140,0.35)',
    background: nb.deepNavy,
    color: '#fff',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '90px',
    resize: 'vertical',
  };

  const cardStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(124,58,237,0.2)',
    borderRight: '1px solid rgba(124,58,237,0.2)',
    borderBottom: '1px solid rgba(124,58,237,0.2)',
    borderLeft: '3px solid #7C3AED',
    background: nb.darkNavy,
    borderRadius: '14px',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #7C3AED, #6d28d9)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnGhost: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnDanger: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #EF4444, #dc2626)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
  };

  const btnGreen: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const btnBlue: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #1B3A8C, #2e5bb8)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  // ─── SVG Icons ───────────────────────────────────────────────────────────────
  const IconBook = ({ size = 20, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );

  const IconPlus = ({ size = 16, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const IconChevron = ({ isOpen, size = 16, color = '#7C3AED' }: { isOpen: boolean; size?: number; color?: string }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const IconEye = ({ size = 20, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const IconWarning = ({ size = 18, color = '#EF4444' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const IconCheck = ({ size = 18, color = '#059669' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const IconEdit = ({ size = 15, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const IconSend = ({ size = 15, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );

  const IconBuilding = ({ size = 18, color = '#1B3A8C' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );

  const IconSave = ({ size = 15, color = '#7C3AED' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );

  const IconRocket = ({ size = 18, color = '#059669' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );

  const IconArrowLeft = ({ size = 15, color = 'rgba(255,255,255,0.7)' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );

  const IconArrowRight = ({ size = 15, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  const IconPin = ({ size = 15, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
    </svg>
  );

  // ─── renderPreview ────────────────────────────────────────────────────────────
  const renderPreview = () => {
    const modules = formationForm.modules || [];

    return (
      <div
        style={{
          marginTop: '16px',
          padding: '20px',
          ...cardStyle,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
            <IconEye size={22} color={nb.purple} />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? '1rem' : '1.1rem' }}>
                {formationForm.titre?.trim() ? formationForm.titre : 'Titre non renseigné'}
              </div>
              {!!formationForm.description?.trim() && (
                <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {formationForm.description}
                </div>
              )}
            </div>
          </div>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.35)',
              color: '#c4b5fd',
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {modules.length} module(s)
          </span>
        </div>

        {modules.length === 0 ? (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              border: '1px dashed rgba(124,58,237,0.35)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.9rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <IconBook size={28} color="rgba(124,58,237,0.5)" />
            Aucun module à prévisualiser.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {modules.map((m, moduleIndex) => {
              const moduleTitle = (m?.titre || '').trim() || `Module ${moduleIndex + 1}`;
              const isModuleOpen = expandedPreviewModuleIndex === moduleIndex;
              return (
                <div
                  key={`preview-module-${moduleIndex}`}
                  style={{
                    borderRadius: '14px',
                    borderTop: '1px solid rgba(124,58,237,0.2)',
                    borderRight: '1px solid rgba(124,58,237,0.2)',
                    borderBottom: '1px solid rgba(124,58,237,0.2)',
                    borderLeft: '3px solid #7C3AED',
                    background: nb.darkNavy,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedPreviewModuleIndex((prev) => (prev === moduleIndex ? null : moduleIndex));
                      setExpandedPreviewChapterKey(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      border: 'none',
                      background: 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconChevron isOpen={isModuleOpen} size={16} color={nb.purple} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff' }}>{moduleTitle}</div>
                        <div style={{ marginTop: '2px', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                          {(m?.chapitres || []).length} chapitre(s)
                          {Array.isArray(m?.questions_qcm) ? ` • ${(m.questions_qcm || []).length} QCM` : ''}
                        </div>
                      </div>
                    </div>
                  </button>

                  {isModuleOpen && (
                    <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                      {(m?.chapitres || []).length === 0 ? (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1px dashed rgba(27,58,140,0.4)',
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: '0.88rem',
                            textAlign: 'center',
                          }}
                        >
                          Aucun chapitre.
                        </div>
                      ) : (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(m.chapitres || []).map((c, chapitreIndex) => {
                            const chapterKey = `${moduleIndex}::${chapitreIndex}`;
                            const chapterTitle = (c?.titre || '').trim() || `Chapitre ${chapitreIndex + 1}`;
                            const isChapterOpen = expandedPreviewChapterKey === chapterKey;

                            return (
                              <div
                                key={`preview-chapter-${chapterKey}`}
                                style={{
                                  borderRadius: '12px',
                                  borderTop: '1px solid rgba(27,58,140,0.2)',
                                  borderRight: '1px solid rgba(27,58,140,0.2)',
                                  borderBottom: '1px solid rgba(27,58,140,0.2)',
                                  borderLeft: '3px solid #1B3A8C',
                                  background: nb.surface,
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedPreviewChapterKey((prev) => (prev === chapterKey ? null : chapterKey))}
                                  style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                >
                                  <IconChevron isOpen={isChapterOpen} size={14} color={nb.royal} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{chapterTitle}</div>
                                    {!!c?.introduction?.trim() && (
                                      <div style={{ marginTop: '2px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                        {c.introduction}
                                      </div>
                                    )}
                                  </div>
                                </button>

                                {isChapterOpen && (
                                  <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid rgba(27,58,140,0.15)' }}>
                                    {!!c?.contenu_genere?.trim() && (
                                      <div
                                        style={{
                                          marginTop: '10px',
                                          padding: '12px',
                                          borderRadius: '10px',
                                          background: 'rgba(27,58,140,0.10)',
                                          border: '1px solid rgba(27,58,140,0.25)',
                                          color: 'rgba(255,255,255,0.8)',
                                          fontSize: '0.88rem',
                                          whiteSpace: 'pre-wrap',
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {c.contenu_genere}
                                      </div>
                                    )}

                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {(c?.parties || []).map((p, partieIndex) => {
                                        const partieTitle = (p?.titre || '').trim() || `Partie ${partieIndex + 1}`;
                                        return (
                                          <div
                                            key={`preview-part-${chapterKey}-${partieIndex}`}
                                            style={{
                                              padding: '12px',
                                              borderRadius: '10px',
                                              borderTop: '1px solid rgba(201,168,76,0.15)',
                                              borderRight: '1px solid rgba(201,168,76,0.15)',
                                              borderBottom: '1px solid rgba(201,168,76,0.15)',
                                              borderLeft: '3px solid #C9A84C',
                                              background: 'rgba(201,168,76,0.04)',
                                            }}
                                          >
                                            <div style={{ color: nb.gold, fontWeight: 700, fontSize: '0.88rem' }}>{partieTitle}</div>
                                            {!!p?.contenu?.trim() && (
                                              <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                                                {p.contenu}
                                              </div>
                                            )}
                                            {!!p?.contenu_genere?.trim() && (
                                              <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                                                {p.contenu_genere}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-6" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconBook size={isMobile ? 22 : 26} color={nb.purple} />
          <h3 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: isMobile ? '1.2rem' : '1.4rem' }}>
            Formations
          </h3>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              background: 'rgba(124,58,237,0.18)',
              border: '1px solid rgba(124,58,237,0.35)',
              color: '#c4b5fd',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {formations.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (view === 'form' && editingFormationId) {
              if (isDirty) {
                setMessage('');
                setError('Tu as des modifications non sauvegardées. Sauvegarde le brouillon avant de fermer.');
                return;
              }
              resetForm();
            } else if (view !== 'blocs') {
              resetForm();
            } else {
              setView('select-bloc');
              setNewBlocNumero('');
              setNewBlocTitre('');
              setError('');
              setMessage('');
            }
          }}
          style={btnPrimary}
        >
          {view === 'form' && editingFormationId ? (
            'Fermer'
          ) : view !== 'blocs' ? (
            '← Retour'
          ) : (
            <>
              <IconPlus size={15} color="#fff" />
              Nouvelle formation
            </>
          )}
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.08)',
            borderLeft: '4px solid #EF4444',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <IconWarning size={18} color={nb.red} />
          <span style={{ color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</span>
        </div>
      )}

      {/* ── Success banner ── */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(5,150,105,0.08)',
            borderLeft: '4px solid #059669',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <IconCheck size={18} color={nb.green} />
          <span style={{ color: '#6ee7b7', fontSize: '0.9rem', lineHeight: 1.5 }}>{message}</span>
        </div>
      )}

      {/* ── Vue : Sélection de bloc ── */}
      {view === 'select-bloc' && (
        <div style={{ padding: '24px', background: nb.darkNavy, borderRadius: '16px', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9A84C' }} />
            <span style={{ color: '#C9A84C', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Étape 1 sur 2
            </span>
          </div>
          <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
            Dans quel bloc créer cette formation ?
          </h4>
          <p style={{ margin: '0 0 20px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
            Sélectionnez un bloc existant ou définissez un nouveau bloc.
          </p>

          {/* Blocs existants (extraits des formations) */}
          {groupedFormations.filter(g => g.bloc_numero != null).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Blocs existants
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupedFormations.filter(g => g.bloc_numero != null).map(g => (
                  <button
                    key={g.bloc_numero}
                    type="button"
                    onClick={() => openFormInBloc({ bloc_numero: g.bloc_numero as number, bloc_titre: g.bloc_titre || '' })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)',
                      color: '#fff', width: '100%', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.07)')}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#C9A84C' }}>{g.bloc_label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                        {g.formations.length} formation{g.formations.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ color: '#C9A84C', fontSize: '1.1rem' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blocs prédéfinis non utilisés */}
          {(() => {
            const usedNums = new Set(groupedFormations.filter(g => g.bloc_numero != null).map(g => g.bloc_numero));
            const unused = BLOCS_PREDEFINIS.filter(b => !usedNums.has(b.numero));
            if (!unused.length) return null;
            return (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Blocs prédéfinis PCB-UEMOA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {unused.map(b => (
                    <button
                      key={b.numero}
                      type="button"
                      onClick={() => openFormInBloc({ bloc_numero: b.numero, bloc_titre: b.titre })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                        background: 'rgba(27,58,140,0.2)', border: '1px solid rgba(27,58,140,0.4)',
                        color: '#fff', width: '100%', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,58,140,0.35)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(27,58,140,0.2)')}
                    >
                      <span style={{ fontSize: '0.9rem' }}>
                        <span style={{ color: '#C9A84C', fontWeight: 700 }}>BLOC {b.numero}</span>
                        {' — '}{b.titre}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Nouveau bloc personnalisé */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Créer un nouveau bloc
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 600 }}>N° Bloc</label>
                <input type="number" min={1} max={99}
                  value={newBlocNumero}
                  onChange={e => setNewBlocNumero(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ ...inputStyle, textAlign: 'center' } as React.CSSProperties}
                  placeholder="Ex: 11"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 600 }}>Titre du bloc</label>
                <input type="text"
                  value={newBlocTitre}
                  onChange={e => setNewBlocTitre(e.target.value)}
                  style={inputStyle as React.CSSProperties}
                  placeholder="Ex: Financement de projet et LBO"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!newBlocNumero || !newBlocTitre.trim()}
              onClick={() => openFormInBloc({ bloc_numero: newBlocNumero as number, bloc_titre: newBlocTitre.trim() })}
              style={{
                ...btnPrimary,
                opacity: (!newBlocNumero || !newBlocTitre.trim()) ? 0.45 : 1,
                cursor: (!newBlocNumero || !newBlocTitre.trim()) ? 'not-allowed' : 'pointer',
              } as React.CSSProperties}
            >
              <IconPlus size={14} color="#fff" />
              Créer dans ce bloc
            </button>
          </div>
        </div>
      )}

      {/* ── Wizard form ── */}
      {view === 'form' && showFormationForm && (
        <form
          onSubmit={handleCreateFormation}
          style={{
            padding: '24px',
            background: nb.darkNavy,
            borderRadius: '16px',
            marginBottom: '28px',
            borderTop: '1px solid rgba(124,58,237,0.2)',
            borderRight: '1px solid rgba(124,58,237,0.2)',
            borderBottom: '1px solid rgba(124,58,237,0.2)',
            borderLeft: '3px solid #7C3AED',
          }}
        >
          {/* Form header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
              {editingFormationId ? 'Modifier la formation' : 'Nouvelle formation'}
            </h4>
            {editingFormationId && (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: 'rgba(201,168,76,0.12)',
                  color: nb.gold,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <IconSave size={13} color={nb.gold} />
                Brouillon en cours
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'flex-start',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* ── Step sidebar ── */}
            <div
              style={{
                width: isMobile ? '100%' : '240px',
                background: nb.deepNavy,
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '16px',
                padding: '16px',
                position: isMobile ? 'static' : 'sticky',
                top: '100px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  color: nb.gold,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Etapes
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {([
                  { key: 'infos', label: '1. Informations' },
                  { key: 'modules', label: '2. Modules' },
                  { key: 'preview', label: '3. Apercu' },
                  { key: 'publish', label: '4. Publication' },
                ] as const).map((s) => {
                  const disabled = !canGoToStep(s.key);
                  const isActive = activeStep === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => goToStep(s.key)}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #7C3AED' : '3px solid transparent',
                        background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                        color: disabled ? 'rgba(255,255,255,0.2)' : isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontWeight: isActive ? 800 : 600,
                        fontSize: '0.9rem',
                        opacity: disabled ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Resume */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Résumé
                </div>
                <div style={{ color: nb.gold, fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>
                  {formationForm.titre?.trim() ? formationForm.titre : 'Titre manquant'}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(27,58,140,0.18)',
                    color: '#93c5fd',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid rgba(27,58,140,0.3)',
                  }}
                >
                  {formationForm.modules?.length || 0} module(s)
                </div>
              </div>
            </div>

            {/* ── Step content ── */}
            <div style={{ flex: 1, width: '100%', minWidth: 0 }}>

              {/* Step 1 - Informations */}
              {activeStep === 'infos' && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      color: nb.gold,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '16px',
                    }}
                  >
                    Informations de base
                  </div>

                  {/* Bloc — lecture seule (pré-sélectionné à l'étape précédente) */}
                  {selectedBlocForNew && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
                      background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Bloc</div>
                        <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: '0.92rem' }}>
                          {selectedBlocForNew.bloc_numero !== '' && selectedBlocForNew.bloc_titre
                            ? `BLOC ${selectedBlocForNew.bloc_numero} — ${selectedBlocForNew.bloc_titre}`
                            : selectedBlocForNew.bloc_titre || `BLOC ${selectedBlocForNew.bloc_numero}`}
                        </div>
                      </div>
                      <button type="button" onClick={() => { setView('select-bloc'); setShowFormationForm(false); }}
                        style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Changer
                      </button>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.88rem',
                      }}
                    >
                      Titre de la formation <span style={{ color: nb.red }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formationForm.titre}
                      onChange={(e) => setFormationForm({ ...formationForm, titre: e.target.value })}
                      style={inputStyle}
                      placeholder="Ex: Formation sur la réglementation bancaire"
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.88rem',
                      }}
                    >
                      Description <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <textarea
                      value={formationForm.description}
                      onChange={(e) => setFormationForm({ ...formationForm, description: e.target.value })}
                      style={textareaStyle}
                      placeholder="Décris l'objectif, la cible, et les résultats attendus..."
                    />
                  </div>

                  {/* ── Sélecteur de Bloc ── */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.2)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#C9A84C',
                      }} />
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const,
                        color: '#C9A84C',
                      }}>
                        Bloc de formation
                      </span>
                    </div>

                    {/* Sélection rapide d'un bloc prédéfini */}
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                      Sélectionner un bloc prédéfini <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optionnel)</span>
                    </label>
                    <select
                      value={formationForm.bloc_numero !== '' ? `${formationForm.bloc_numero}` : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormationForm({ ...formationForm, bloc_numero: '', bloc_titre: '' });
                        } else {
                          const found = BLOCS_PREDEFINIS.find(b => String(b.numero) === val);
                          setFormationForm({
                            ...formationForm,
                            bloc_numero: Number(val),
                            bloc_titre: found?.titre || formationForm.bloc_titre,
                          });
                        }
                      }}
                      style={{
                        ...inputStyle,
                        marginBottom: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">-- Choisir un bloc --</option>
                      {BLOCS_PREDEFINIS.map(b => (
                        <option key={b.numero} value={String(b.numero)}>
                          BLOC {b.numero} — {b.titre}
                        </option>
                      ))}
                      <option value="custom">Bloc personnalisé…</option>
                    </select>

                    {/* Champs manuels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                          N° Bloc
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={formationForm.bloc_numero}
                          onChange={(e) => setFormationForm({ ...formationForm, bloc_numero: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ ...inputStyle, textAlign: 'center' }}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                          Titre du bloc
                        </label>
                        <input
                          type="text"
                          value={formationForm.bloc_titre}
                          onChange={(e) => setFormationForm({ ...formationForm, bloc_titre: e.target.value })}
                          style={inputStyle}
                          placeholder="Ex: Plan Comptable Bancaire (PCB révisé)"
                        />
                      </div>
                    </div>

                    {/* Aperçu du label */}
                    {(formationForm.bloc_numero !== '' || formationForm.bloc_titre) && (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(201,168,76,0.1)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        fontSize: '0.82rem',
                        color: '#C9A84C',
                        fontWeight: 600,
                      }}>
                        {formationForm.bloc_numero !== '' && formationForm.bloc_titre
                          ? `BLOC ${formationForm.bloc_numero} — ${formationForm.bloc_titre}`
                          : formationForm.bloc_numero !== ''
                          ? `BLOC ${formationForm.bloc_numero}`
                          : formationForm.bloc_titre}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => goToStep('modules')}
                      style={btnPrimary}
                    >
                      Continuer
                      <IconArrowRight size={15} color="#fff" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 - Modules */}
              {activeStep === 'modules' && (
                <div style={{ marginBottom: '20px' }}>
                  {/* Modules header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        color: nb.gold,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Modules
                    </div>
                    <button
                      type="button"
                      onClick={addModule}
                      style={{ ...btnPrimary, padding: '8px 14px', fontSize: '0.88rem' }}
                    >
                      <IconPlus size={13} color="#fff" />
                      Ajouter un module
                    </button>
                  </div>

                  {/* Module list */}
                  {formationForm.modules && formationForm.modules.length > 0 ? (
                    formationForm.modules.map((module, moduleIndex) => (
                      <div
                        key={moduleIndex}
                        style={{
                          marginBottom: '14px',
                          borderRadius: '14px',
                          borderTop: '1px solid rgba(124,58,237,0.2)',
                          borderRight: '1px solid rgba(124,58,237,0.2)',
                          borderBottom: '1px solid rgba(124,58,237,0.2)',
                          borderLeft: '3px solid #7C3AED',
                          background: nb.darkNavy,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Module header row */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedEditModuleIndex((prev) => (prev === moduleIndex ? null : moduleIndex));
                              setExpandedEditChapterKey(null);
                            }}
                            style={{
                              flex: 1,
                              padding: '13px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              border: 'none',
                              background: 'transparent',
                              color: '#fff',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <IconChevron isOpen={expandedEditModuleIndex === moduleIndex} size={16} color={nb.purple} />
                            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                              Module {moduleIndex + 1}
                              {module?.titre?.trim() ? ` : ${module.titre}` : ''}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeModule(moduleIndex)}
                            style={{
                              ...btnDanger,
                              borderRadius: 0,
                              padding: '0 16px',
                              fontSize: '0.8rem',
                            }}
                          >
                            Supprimer
                          </button>
                        </div>

                        {/* Module expanded */}
                        {expandedEditModuleIndex === moduleIndex && (
                          <div style={{ padding: '16px', borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                            <div style={{ marginBottom: '14px' }}>
                              <label
                                style={{
                                  display: 'block',
                                  marginBottom: '6px',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: 'rgba(255,255,255,0.7)',
                                }}
                              >
                                Titre du module <span style={{ color: nb.red }}>*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={module.titre}
                                onChange={(e) => updateModule(moduleIndex, 'titre', e.target.value)}
                                style={inputStyle}
                                placeholder="Ex: Module 1 : Introduction à la banque"
                              />
                            </div>

                            {/* Chapters */}
                            <div style={{ marginTop: '18px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '12px',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}
                              >
                                <div
                                  style={{
                                    color: '#93c5fd',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Chapitres ({module.chapitres?.length || 0})
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addChapitre(moduleIndex)}
                                  style={{
                                    ...btnBlue,
                                    padding: '6px 12px',
                                    fontSize: '0.82rem',
                                  }}
                                >
                                  <IconPlus size={12} color="#fff" />
                                  Ajouter un chapitre
                                </button>
                              </div>

                              {module.chapitres && module.chapitres.length > 0 ? (
                                module.chapitres.map((chapitre, chapitreIndex) => (
                                  <div
                                    key={chapitreIndex}
                                    style={{
                                      marginBottom: '10px',
                                      borderRadius: '12px',
                                      borderTop: '1px solid rgba(27,58,140,0.2)',
                                      borderRight: '1px solid rgba(27,58,140,0.2)',
                                      borderBottom: '1px solid rgba(27,58,140,0.2)',
                                      borderLeft: '3px solid #1B3A8C',
                                      background: nb.surface,
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {/* Chapter header row */}
                                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const key = `${moduleIndex}::${chapitreIndex}`;
                                          setExpandedEditChapterKey((prev) => (prev === key ? null : key));
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '11px 14px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#fff',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                        }}
                                      >
                                        <IconChevron
                                          isOpen={expandedEditChapterKey === `${moduleIndex}::${chapitreIndex}`}
                                          size={14}
                                          color={nb.royal}
                                        />
                                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                          Chapitre {chapitreIndex + 1}
                                          {chapitre?.titre?.trim() ? ` : ${chapitre.titre}` : ''}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeChapitre(moduleIndex, chapitreIndex)}
                                        style={{
                                          ...btnDanger,
                                          borderRadius: 0,
                                          padding: '0 12px',
                                          fontSize: '0.78rem',
                                        }}
                                      >
                                        Supprimer
                                      </button>
                                    </div>

                                    {/* Chapter expanded */}
                                    {expandedEditChapterKey === `${moduleIndex}::${chapitreIndex}` && (
                                      <div style={{ padding: '14px', borderTop: '1px solid rgba(27,58,140,0.2)' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                          <label
                                            style={{
                                              display: 'block',
                                              marginBottom: '5px',
                                              fontWeight: 600,
                                              fontSize: '0.83rem',
                                              color: 'rgba(255,255,255,0.65)',
                                            }}
                                          >
                                            Titre du chapitre <span style={{ color: nb.red }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            required
                                            value={chapitre.titre || ''}
                                            onChange={(e) => updateChapitre(moduleIndex, chapitreIndex, 'titre', e.target.value)}
                                            style={inputStyle}
                                            placeholder="Ex: Notions de conformité"
                                          />
                                        </div>

                                        <div style={{ marginBottom: '14px' }}>
                                          <label
                                            style={{
                                              display: 'block',
                                              marginBottom: '5px',
                                              fontWeight: 600,
                                              fontSize: '0.83rem',
                                              color: 'rgba(255,255,255,0.65)',
                                            }}
                                          >
                                            Introduction du chapitre
                                          </label>
                                          <textarea
                                            value={chapitre.introduction || ''}
                                            onChange={(e) =>
                                              updateChapitre(moduleIndex, chapitreIndex, 'introduction', e.target.value)
                                            }
                                            style={{ ...textareaStyle, minHeight: '70px' }}
                                            placeholder="Introduction du chapitre..."
                                          />
                                        </div>

                                        {/* Parts */}
                                        <div style={{ marginTop: '14px' }}>
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginBottom: '10px',
                                              flexWrap: 'wrap',
                                              gap: '6px',
                                            }}
                                          >
                                            <div
                                              style={{
                                                color: nb.gold,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                              }}
                                            >
                                              Parties ({chapitre.parties?.length || 0})
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => addPartie(moduleIndex, chapitreIndex)}
                                              style={{
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(201,168,76,0.35)',
                                                background: 'rgba(201,168,76,0.08)',
                                                color: nb.gold,
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                              }}
                                            >
                                              <IconPlus size={11} color={nb.gold} />
                                              Ajouter une partie
                                            </button>
                                          </div>

                                          {chapitre.parties && chapitre.parties.length > 0 ? (
                                            chapitre.parties.map((partie, partieIndex) => (
                                              <div
                                                key={partieIndex}
                                                style={{
                                                  marginBottom: '10px',
                                                  padding: '12px',
                                                  borderRadius: '10px',
                                                  borderTop: '1px solid rgba(201,168,76,0.15)',
                                                  borderRight: '1px solid rgba(201,168,76,0.15)',
                                                  borderBottom: '1px solid rgba(201,168,76,0.15)',
                                                  borderLeft: '3px solid #C9A84C',
                                                  background: 'rgba(201,168,76,0.04)',
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '10px',
                                                  }}
                                                >
                                                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: nb.gold }}>
                                                    Partie {partieIndex + 1}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => removePartie(moduleIndex, chapitreIndex, partieIndex)}
                                                    style={{
                                                      ...btnDanger,
                                                      padding: '3px 8px',
                                                      fontSize: '0.72rem',
                                                      borderRadius: '6px',
                                                    }}
                                                  >
                                                    Supprimer
                                                  </button>
                                                </div>

                                                <div style={{ marginBottom: '8px' }}>
                                                  <label
                                                    style={{
                                                      display: 'block',
                                                      marginBottom: '4px',
                                                      fontWeight: 600,
                                                      fontSize: '0.8rem',
                                                      color: 'rgba(255,255,255,0.6)',
                                                    }}
                                                  >
                                                    Titre de la partie
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={partie.titre || ''}
                                                    onChange={(e) =>
                                                      updatePartie(moduleIndex, chapitreIndex, partieIndex, 'titre', e.target.value)
                                                    }
                                                    style={{ ...inputStyle, fontSize: '0.85rem' }}
                                                    placeholder="Titre de la partie..."
                                                  />
                                                </div>

                                                <div>
                                                  <label
                                                    style={{
                                                      display: 'block',
                                                      marginBottom: '4px',
                                                      fontWeight: 600,
                                                      fontSize: '0.8rem',
                                                      color: 'rgba(255,255,255,0.6)',
                                                    }}
                                                  >
                                                    Contenu de la partie (prompt pour génération IA)
                                                  </label>
                                                  <textarea
                                                    value={partie.contenu || ''}
                                                    onChange={(e) =>
                                                      updatePartie(moduleIndex, chapitreIndex, partieIndex, 'contenu', e.target.value)
                                                    }
                                                    style={{ ...textareaStyle, fontSize: '0.85rem', minHeight: '80px' }}
                                                    placeholder="Contenu de la partie (sera utilisé comme prompt pour la génération IA)..."
                                                  />
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <div
                                              style={{
                                                padding: '14px',
                                                textAlign: 'center',
                                                borderRadius: '10px',
                                                border: '1px dashed rgba(201,168,76,0.3)',
                                                color: 'rgba(255,255,255,0.3)',
                                                fontSize: '0.83rem',
                                              }}
                                            >
                                              Aucune partie. Cliquez sur "Ajouter une partie" pour commencer.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div
                                  style={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    borderRadius: '10px',
                                    border: '1px dashed rgba(27,58,140,0.35)',
                                    color: 'rgba(255,255,255,0.3)',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  Aucun chapitre. Cliquez sur "Ajouter un chapitre" pour commencer.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '32px 24px',
                        textAlign: 'center',
                        borderRadius: '14px',
                        border: '2px dashed rgba(124,58,237,0.3)',
                        color: 'rgba(255,255,255,0.3)',
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <IconBook size={32} color="rgba(124,58,237,0.4)" />
                      <span style={{ fontSize: '0.9rem' }}>
                        Aucun module pour le moment. Cliquez sur "Ajouter un module" pour commencer.
                      </span>
                    </div>
                  )}

                  {/* Step 2 nav */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => goToStep('infos')}
                      style={btnGhost}
                    >
                      <IconArrowLeft size={14} />
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep('preview')}
                      style={btnBlue}
                    >
                      Apercu
                      <IconArrowRight size={14} color="#fff" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 - Preview */}
              {activeStep === 'preview' && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      color: nb.gold,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}
                  >
                    Apercu de la formation
                  </div>
                  {renderPreview()}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => goToStep('modules')}
                      style={btnGhost}
                    >
                      <IconArrowLeft size={14} />
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep('publish')}
                      style={btnGreen}
                    >
                      Publication
                      <IconArrowRight size={14} color="#fff" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 - Publication */}
              {activeStep === 'publish' && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      color: nb.gold,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '16px',
                    }}
                  >
                    Sauvegarde et publication
                  </div>

                  {/* Info card */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      background: 'rgba(27,58,140,0.08)',
                      borderTop: '1px solid rgba(27,58,140,0.2)',
                      borderRight: '1px solid rgba(27,58,140,0.2)',
                      borderBottom: '1px solid rgba(27,58,140,0.2)',
                      borderLeft: '3px solid #1B3A8C',
                      marginBottom: '18px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <IconBook size={20} color={nb.royal} />
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, marginBottom: '4px', fontSize: '0.92rem' }}>Recommandation</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.87rem', lineHeight: 1.5 }}>
                        Sauvegarde en brouillon, puis publie avec génération IA si nécessaire.
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => goToStep('preview')}
                      style={btnGhost}
                    >
                      <IconArrowLeft size={14} />
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      style={{
                        ...btnGhost,
                        border: '1px solid rgba(124,58,237,0.5)',
                        color: '#c4b5fd',
                      }}
                    >
                      <IconSave size={14} color="#c4b5fd" />
                      Sauvegarder brouillon
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        ...btnPrimary,
                        background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7C3AED, #6d28d9)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.75 : 1,
                      }}
                    >
                      {loading ? 'En cours...' : editingFormationId ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>

                  {/* Publish button (editing only) */}
                  {editingFormationId && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => openPublishModal(editingFormationId)}
                        disabled={loading || publishing}
                        style={{
                          ...btnGreen,
                          cursor: loading || publishing ? 'not-allowed' : 'pointer',
                          opacity: loading || publishing ? 0.65 : 1,
                        }}
                      >
                        <IconRocket size={15} color="#fff" />
                        Publier
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '18px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
              Navigation via le menu à gauche
            </div>
          </div>
        </form>
      )}

      {/* ── Formations list — visible uniquement sur la vue blocs ── */}
      {view === 'blocs' && <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
            Formations par bloc
          </h4>
          <span style={{ padding: '2px 10px', borderRadius: '999px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: '0.78rem', fontWeight: 700 }}>
            {formations.length} formation{formations.length > 1 ? 's' : ''}
          </span>
        </div>

        {formations.length === 0 ? (
          <div
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              borderRadius: '16px',
              border: '2px dashed rgba(124,58,237,0.3)',
              color: 'rgba(255,255,255,0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <IconBook size={36} color="rgba(124,58,237,0.4)" />
            <span style={{ fontSize: '0.95rem' }}>Aucune formation créée pour le moment.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groupedFormations.map((group) => (
              <div key={group.bloc_numero ?? '__sans_bloc__'}>
                {/* ── En-tête du bloc ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '12px', paddingBottom: '10px',
                  borderBottom: '1px solid rgba(201,168,76,0.15)',
                }}>
                  {group.bloc_numero != null ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 14px', borderRadius: '20px',
                      background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
                      <span style={{ color: '#C9A84C', fontWeight: 800, fontSize: '0.92rem' }}>{group.bloc_label}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: '0.85rem', fontStyle: 'italic' }}>Sans bloc</span>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                    {group.formations.length} formation{group.formations.length > 1 ? 's' : ''}
                  </span>
                  {/* Bouton ajouter dans ce bloc */}
                  {group.bloc_numero != null && (
                    <button
                      type="button"
                      onClick={() => openFormInBloc({ bloc_numero: group.bloc_numero as number, bloc_titre: group.bloc_titre || '' })}
                      style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C',
                      }}
                    >
                      <IconPlus size={12} color="#C9A84C" />
                      Ajouter
                    </button>
                  )}
                </div>

                {/* ── Formations du bloc ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.formations.map((formation) => (
              <div
                key={formation.id || formation.titre}
                style={{
                  padding: '18px 20px',
                  background: nb.surface,
                  borderRadius: '14px',
                  borderTop: '1px solid rgba(124,58,237,0.2)',
                  borderRight: '1px solid rgba(124,58,237,0.2)',
                  borderBottom: '1px solid rgba(124,58,237,0.2)',
                  borderLeft: '3px solid #7C3AED',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    {formation.bloc_label && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginBottom: '6px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(201,168,76,0.1)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#C9A84C',
                        letterSpacing: '0.05em',
                      }}>
                        {formation.bloc_label}
                      </div>
                    )}
                    <h5 style={{ margin: '0 0 6px 0', color: '#fff', fontWeight: 800, fontSize: isMobile ? '1rem' : '1.1rem' }}>
                      {formation.titre}
                    </h5>
                    {formation.description && (
                      <p
                        style={{
                          margin: '0 0 10px 0',
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '0.88rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {formation.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Module count badge */}
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: 'rgba(27,58,140,0.18)',
                          color: '#93c5fd',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: '1px solid rgba(27,58,140,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <IconBook size={12} color="#93c5fd" />
                        {formation.modules_count || formation.modules?.length || 0} module(s)
                      </span>
                      {/* Status badge */}
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background:
                            formation.status === 'published'
                              ? 'rgba(5,150,105,0.15)'
                              : formation.status === 'archived'
                                ? 'rgba(100,116,139,0.15)'
                                : 'rgba(201,168,76,0.15)',
                          color:
                            formation.status === 'published'
                              ? '#6ee7b7'
                              : formation.status === 'archived'
                                ? '#94a3b8'
                                : nb.gold,
                          border: `1px solid ${
                            formation.status === 'published'
                              ? 'rgba(5,150,105,0.3)'
                              : formation.status === 'archived'
                                ? 'rgba(100,116,139,0.3)'
                                : 'rgba(201,168,76,0.3)'
                          }`,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {formation.status === 'published'
                          ? 'Publiée'
                          : formation.status === 'archived'
                            ? 'Archivée'
                            : 'Brouillon'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleEditFormation(formation)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(124,58,237,0.45)',
                        background: 'rgba(124,58,237,0.08)',
                        color: '#c4b5fd',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <IconEdit size={13} color="#c4b5fd" />
                      Modifier
                    </button>
                    {formation.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => openPublishModal(formation.id || '')}
                        disabled={loading}
                        style={{
                          ...btnGreen,
                          padding: '7px 14px',
                          fontSize: '0.85rem',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                        }}
                      >
                        <IconSend size={13} color="#fff" />
                        Publier
                      </button>
                    )}
                    {formation.status === 'published' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const formationId = getFormationId(formation);
                          if (!formationId || formationId === 'undefined') {
                            setMessage('');
                            setError('Formation non identifiée: veuillez réessayer.');
                            return;
                          }

                          setSelectedFormationForAssign(formation);
                          setShowAssignForm(true);
                          try {
                            const response = await fetch(`/api/formations/${formationId}/assigned-departments`, {
                              headers: getAuthHeaders(),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setSelectedDepartments(data.department_ids || []);
                            } else {
                              setSelectedDepartments([]);
                            }
                          } catch (err) {
                            console.error('Erreur lors du chargement des départements affectés:', err);
                            setSelectedDepartments([]);
                          }
                        }}
                        style={{
                          ...btnBlue,
                          padding: '7px 14px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <IconPin size={13} color="#fff" />
                        Affecter
                      </button>
                    )}
                  </div>
                </div>
              </div>
              ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* ── Assign modal ── */}
      {showAssignForm && selectedFormationForAssign && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(4,11,30,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setShowAssignForm(false);
            setSelectedFormationForAssign(null);
            setSelectedDepartments([]);
          }}
        >
          <div
            style={{
              background: nb.surface,
              padding: '28px',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              borderTop: '1px solid rgba(27,58,140,0.3)',
              borderRight: '1px solid rgba(27,58,140,0.3)',
              borderBottom: '1px solid rgba(27,58,140,0.3)',
              borderLeft: '4px solid #1B3A8C',
              boxShadow: '0 16px 48px rgba(4,11,30,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <IconBuilding size={20} color={nb.royal} />
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                Affecter aux départements
              </h3>
            </div>
            <p style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem' }}>
              Sélectionnez les départements qui auront accès à{' '}
              <span style={{ color: '#fff', fontWeight: 700 }}>{selectedFormationForAssign.titre}</span>
            </p>

            <div
              style={{
                marginBottom: '16px',
                maxHeight: '360px',
                overflowY: 'auto',
                borderRadius: '12px',
                padding: '10px',
                border: '1px solid rgba(27,58,140,0.2)',
                background: nb.darkNavy,
              }}
            >
              {departments.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '20px' }}>Aucun département disponible</p>
              ) : (
                departments.map((dept) => {
                  const isChecked = selectedDepartments.includes(dept.id);
                  return (
                    <label
                      key={dept.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isChecked ? 'rgba(27,58,140,0.2)' : 'rgba(255,255,255,0.03)',
                        border: isChecked ? '1px solid rgba(27,58,140,0.5)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDepartments([...selectedDepartments, dept.id]);
                          } else {
                            setSelectedDepartments(selectedDepartments.filter((id) => id !== dept.id));
                          }
                        }}
                        style={{
                          marginRight: '12px',
                          width: '17px',
                          height: '17px',
                          cursor: 'pointer',
                          accentColor: nb.royal,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: isChecked ? 700 : 400,
                          color: isChecked ? '#fff' : 'rgba(255,255,255,0.65)',
                          fontSize: '0.88rem',
                        }}
                      >
                        {dept.name}{' '}
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>({dept.code})</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedFormationForAssign(null);
                  setSelectedDepartments([]);
                }}
                style={btnGhost}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const formationId = getFormationId(selectedFormationForAssign);
                    if (!formationId || formationId === 'undefined') {
                      throw new Error('Formation non identifiée');
                    }

                    const response = await fetch(
                      `/api/formations/${formationId}/assign-departments`,
                      {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                          formation_id: formationId,
                          department_ids: selectedDepartments,
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.detail || "Erreur lors de l'affectation");
                    }

                    setMessage('Formation affectée aux départements avec succès.');
                    setError('');
                    setShowAssignForm(false);
                    setSelectedFormationForAssign(null);
                    setSelectedDepartments([]);
                    fetchFormations();
                  } catch (err: any) {
                    setMessage('');
                    setError(err.message || "Erreur lors de l'affectation");
                  }
                }}
                disabled={selectedDepartments.length === 0}
                style={{
                  ...btnBlue,
                  cursor: selectedDepartments.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedDepartments.length === 0 ? 0.5 : 1,
                }}
              >
                <IconCheck size={15} color="#fff" />
                Confirmer ({selectedDepartments.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish modal ── */}
      {showPublishModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(4,11,30,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            if (publishing) return;
            setShowPublishModal(false);
            setPublishFormationId(null);
          }}
        >
          <div
            style={{
              background: nb.surface,
              padding: '28px',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              borderTop: '1px solid rgba(5,150,105,0.25)',
              borderRight: '1px solid rgba(5,150,105,0.25)',
              borderBottom: '1px solid rgba(5,150,105,0.25)',
              borderLeft: '4px solid #059669',
              boxShadow: '0 16px 48px rgba(4,11,30,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <IconRocket size={22} color={nb.green} />
              <h3 style={{ margin: 0, color: nb.green, fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                Publier la formation
              </h3>
            </div>
            <p style={{ marginBottom: '18px', color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem' }}>
              Choisis les options de publication :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(5,150,105,0.06)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  cursor: publishing ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={publishGenerateContent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPublishGenerateContent(checked);
                    if (!checked) setPublishGenerateQcm(false);
                  }}
                  disabled={publishing}
                  style={{ width: '17px', height: '17px', accentColor: nb.green, flexShrink: 0, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Générer le contenu des chapitres (IA)</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', marginTop: '2px' }}>
                    Remplit automatiquement le contenu à partir de tes prompts.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: publishGenerateContent ? 'rgba(5,150,105,0.06)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(5,150,105,0.15)',
                  cursor: publishing || !publishGenerateContent ? 'not-allowed' : 'pointer',
                  opacity: publishGenerateContent ? 1 : 0.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={publishGenerateQcm}
                  onChange={(e) => setPublishGenerateQcm(e.target.checked)}
                  disabled={publishing || !publishGenerateContent}
                  style={{ width: '17px', height: '17px', accentColor: nb.green, flexShrink: 0, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Générer les QCM (IA)</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', marginTop: '2px' }}>
                    Crée automatiquement des questions par module.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (publishing) return;
                  setShowPublishModal(false);
                  setPublishFormationId(null);
                }}
                style={{
                  ...btnGhost,
                  cursor: publishing ? 'not-allowed' : 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!publishFormationId) return;
                  handlePublishFormation(publishFormationId, {
                    generateContent: publishGenerateContent,
                    generateQcm: publishGenerateQcm,
                  });
                }}
                disabled={publishing || !publishFormationId}
                style={{
                  ...btnGreen,
                  background: publishing ? 'rgba(5,150,105,0.35)' : 'linear-gradient(135deg, #059669, #047857)',
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  opacity: publishing ? 0.75 : 1,
                }}
              >
                <IconRocket size={14} color="#fff" />
                {publishing ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationsTab;
