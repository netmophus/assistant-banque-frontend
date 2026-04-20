'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { RATIO_VARIABLES_STANDARDS, RATIO_VARIABLES_STANDARDS_BY_KEY } from './ratioVariablesStandards';

interface Ratio {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  formule: string;
  type_rapport: string;
  categorie: string;
  seuil_min?: number;
  seuil_max?: number;
  unite: string;
  is_reglementaire: boolean;
  is_active: boolean;
  postes_requis: string[];
  ordre_affichage: number;
}

type RatioVariableCatalogItem = {
  id: string;
  key: string;
  label: string;
  unit: string;
  description?: string | null;
  is_active: boolean;
};

type RatioVariableValueItem = {
  id: string;
  date_solde?: string | null;
  key: string;
  value?: number | null;
};

type PosteItem = {
  id: string;
  code: string;
  libelle: string;
  type: string;
  parent_id?: string | null;
  ordre?: number;
};

interface RatioForm {
  code: string;
  libelle: string;
  description: string;
  formule: string;
  type_rapport: string;
  categorie: string;
  seuil_min: number | null;
  seuil_max: number | null;
  unite: string;
  is_reglementaire: boolean;
  is_active: boolean;
  postes_requis: string[];
  ordre_affichage: number;
}

const RatiosTab = () => {
  const { isMobile } = useResponsive();
  const [ratios, setRatios] = useState<Ratio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRatio, setEditingRatio] = useState<Ratio | null>(null);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterTypeRapport, setFilterTypeRapport] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [postes, setPostes] = useState<PosteItem[]>([]);
  const formuleInputRef = useRef<HTMLInputElement | null>(null);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [previewResultsByType, setPreviewResultsByType] = useState<Record<string, Record<string, number | null>>>(
    {}
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [catalogItems, setCatalogItems] = useState<RatioVariableCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<RatioVariableCatalogItem | null>(null);
  const [catalogForm, setCatalogForm] = useState<{ key: string; label: string; unit: string }>(
    { key: '', label: '', unit: '' }
  );
  // Mode de saisie de la variable: 'standard' (liste BCEAO) ou 'custom' (libre)
  const [catalogMode, setCatalogMode] = useState<'standard' | 'custom'>('standard');
  // Saisie directe du montant + date au moment de créer la variable
  const [catalogInitialValue, setCatalogInitialValue] = useState<string>('');
  const [catalogInitialDate, setCatalogInitialDate] = useState<string>('');

  const [valuesByKey, setValuesByKey] = useState<Record<string, number | ''>>({});
  const [valuesLoading, setValuesLoading] = useState(false);
  const [valuesError, setValuesError] = useState('');
  const [form, setForm] = useState<RatioForm>({
    code: '',
    libelle: '',
    description: '',
    formule: '',
    type_rapport: 'bilan_reglementaire',
    categorie: 'solvabilite',
    seuil_min: null,
    seuil_max: null,
    unite: '%',
    is_reglementaire: true,
    is_active: true,
    postes_requis: [],
    ordre_affichage: 1,
  });

  // Helper function to get headers with authentication token
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

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const key = (catalogForm.key || '').trim();
      const payload = {
        key,
        label: (catalogForm.label || '').trim(),
        unit: (catalogForm.unit || '').trim(),
        description: null,
        is_active: true,
      };
      const res = await fetch('/api/pcb/ratio-variables/catalog', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Erreur création (${res.status}): ${body || res.statusText}`);
      }

      // Si l'utilisateur a saisi un montant + une date, on sauvegarde la valeur
      const hasMontant = catalogInitialValue !== '' && !Number.isNaN(Number(catalogInitialValue));
      if (hasMontant && catalogInitialDate) {
        const dateStr = catalogInitialDate.includes('T') ? catalogInitialDate.split('T')[0] : catalogInitialDate;
        try {
          await fetch(`/api/pcb/ratio-variables/values?date_solde=${encodeURIComponent(dateStr)}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ key, value: Number(catalogInitialValue) }),
          });
          // Si la date saisie correspond à la date courante, rafraîchit la table
          if (selectedDate === dateStr) {
            await fetchValuesForDate(selectedDate);
          }
        } catch {
          // Ne bloque pas : la variable est créée, la valeur échouée sera modifiable ensuite
        }
      }

      setShowCatalogModal(false);
      setEditingCatalogItem(null);
      setCatalogForm({ key: '', label: '', unit: '' });
      setCatalogInitialValue('');
      setCatalogInitialDate('');
      await fetchCatalog();
    } catch (e2) {
      setCatalogError(e2 instanceof Error ? e2.message : 'Erreur lors de la création');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleUpdateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatalogItem?.id) return;
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const payload = {
        label: (catalogForm.label || '').trim(),
        unit: (catalogForm.unit || '').trim(),
      };
      const res = await fetch(`/api/pcb/ratio-variables/catalog/${editingCatalogItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Erreur modification (${res.status}): ${body || res.statusText}`);
      }
      setShowCatalogModal(false);
      setEditingCatalogItem(null);
      setCatalogForm({ key: '', label: '', unit: '' });
      await fetchCatalog();
    } catch (e2) {
      setCatalogError(e2 instanceof Error ? e2.message : 'Erreur lors de la modification');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleDeleteCatalogItem = async (item: RatioVariableCatalogItem) => {
    if (!item?.id) return;
    const ok = confirm(`Supprimer la variable "${item.key}" ?`);
    if (!ok) return;
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const res = await fetch(`/api/pcb/ratio-variables/catalog/${item.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Erreur suppression (${res.status}): ${body || res.statusText}`);
      }
      await fetchCatalog();
    } catch (e2) {
      setCatalogError(e2 instanceof Error ? e2.message : 'Erreur lors de la suppression');
    } finally {
      setCatalogLoading(false);
    }
  };

  const openEditCatalogModal = (item: RatioVariableCatalogItem) => {
    setEditingCatalogItem(item);
    setCatalogForm({ key: item.key || '', label: item.label || '', unit: item.unit || '' });
    setShowCatalogModal(true);
  };

  const handleSaveValue = async (key: string, value: number | '') => {
    if (!selectedDate) return;
    const dateStr = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
    setValuesLoading(true);
    setValuesError('');
    try {
      const payload = { key, value: value === '' ? 0 : Number(value) };
      const res = await fetch(`/api/pcb/ratio-variables/values?date_solde=${encodeURIComponent(dateStr)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Erreur sauvegarde (${res.status}): ${body || res.statusText}`);
      }
      await fetchValuesForDate(selectedDate);
    } catch (e) {
      setValuesError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setValuesLoading(false);
    }
  };

  const fetchPostes = useCallback(async () => {
    try {
      const response = await fetch('/api/pcb/postes', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur lors du chargement des postes');
      const data = await response.json();
      setPostes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur fetchPostes:', err);
      setPostes([]);
    }
  }, []);

  const fetchRatiosPreview = useCallback(async () => {
    if (!selectedDate) {
      setPreviewResultsByType({});
      return;
    }

    setPreviewLoading(true);
    setPreviewError('');
    try {
      const dateStr = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
      const types = ['bilan_reglementaire', 'compte_resultat', 'les_deux'];
      const results: Record<string, Record<string, number | null>> = {};

      await Promise.all(
        types.map(async (t) => {
          const url = `/api/pcb/ratios/preview?type_rapport=${encodeURIComponent(t)}&date_cloture=${encodeURIComponent(dateStr)}`;
          const res = await fetch(url, { headers: getAuthHeaders() });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`${res.status}: ${body || res.statusText}`);
          }
          const data = await res.json();
          const ratios = (data && (data.ratios as Record<string, any>)) || {};
          const next: Record<string, number | null> = {};
          Object.entries(ratios).forEach(([k, v]) => {
            if (v === null || v === undefined) {
              next[k] = null;
              return;
            }
            const num = Number(v);
            next[k] = Number.isFinite(num) ? num : null;
          });
          results[t] = next;
        })
      );

      setPreviewResultsByType(results);
    } catch (e) {
      setPreviewResultsByType({});
      setPreviewError(e instanceof Error ? e.message : 'Erreur lors du calcul');
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    fetchRatiosPreview();
  }, [selectedDate, fetchRatiosPreview]);

  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await fetch('/api/pcb/gl/dates', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur lors du chargement des dates');
      const data = await response.json();
      const list = Array.isArray(data) ? (data as string[]) : [];
      setAvailableDates(list);
      if (!selectedDate && list.length > 0) {
        setSelectedDate(list[0]);
      }
    } catch {
      setAvailableDates([]);
    }
  }, [selectedDate]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const res = await fetch('/api/pcb/ratio-variables/catalog?include_inactive=true', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Erreur catalogue (${res.status}): ${body || res.statusText}`);
      }
      const data = await res.json();
      setCatalogItems(Array.isArray(data) ? (data as RatioVariableCatalogItem[]) : []);
    } catch (e) {
      setCatalogItems([]);
      setCatalogError(e instanceof Error ? e.message : 'Erreur lors du chargement du catalogue');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const fetchValuesForDate = useCallback(
    async (dateIso: string) => {
      if (!dateIso) {
        setValuesByKey({});
        return;
      }
      setValuesLoading(true);
      setValuesError('');
      try {
        const dateStr = dateIso.includes('T') ? dateIso.split('T')[0] : dateIso;
        const res = await fetch(`/api/pcb/ratio-variables/values?date_solde=${encodeURIComponent(dateStr)}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Erreur valeurs (${res.status}): ${body || res.statusText}`);
        }
        const data = (await res.json()) as RatioVariableValueItem[];
        const next: Record<string, number | ''> = {};
        for (const it of data || []) {
          if (it?.key) next[String(it.key)] = typeof it.value === 'number' ? it.value : '';
        }
        setValuesByKey(next);
      } catch (e) {
        setValuesByKey({});
        setValuesError(e instanceof Error ? e.message : 'Erreur lors du chargement des valeurs');
      } finally {
        setValuesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPostes();
    fetchAvailableDates();
    fetchCatalog();
  }, [fetchPostes, fetchAvailableDates, fetchCatalog]);

  useEffect(() => {
    if (selectedDate) {
      fetchValuesForDate(selectedDate);
    }
  }, [selectedDate, fetchValuesForDate]);

  const postesForRatioFormula = useMemo(() => {
    const allowed = new Set(['bilan_actif', 'bilan_passif', 'cr_produit', 'cr_charge']);
    return (postes || []).filter((p) => allowed.has(String(p?.type || '')) && p?.code);
  }, [postes]);

  const flattenedPostesForSelect = useMemo(() => {
    const byParent = new Map<string, PosteItem[]>();
    const roots: PosteItem[] = [];

    for (const p of postesForRatioFormula) {
      const parentId = p.parent_id ? String(p.parent_id) : '';
      if (!parentId) {
        roots.push(p);
      } else {
        const arr = byParent.get(parentId) || [];
        arr.push(p);
        byParent.set(parentId, arr);
      }
    }

    const sortFn = (a: PosteItem, b: PosteItem) => {
      const oa = typeof a.ordre === 'number' ? a.ordre : 0;
      const ob = typeof b.ordre === 'number' ? b.ordre : 0;
      if (oa !== ob) return oa - ob;
      return String(a.code || '').localeCompare(String(b.code || ''));
    };

    roots.sort(sortFn);
    for (const [, arr] of byParent.entries()) {
      arr.sort(sortFn);
    }

    const out: Array<PosteItem & { __level: number; __label: string }> = [];

    const dfs = (node: PosteItem, level: number) => {
      const indent = level > 0 ? `${'—'.repeat(level)} ` : '';
      out.push({ ...node, __level: level, __label: `${indent}${node.code} - ${node.libelle}` });
      const children = byParent.get(String(node.id)) || [];
      for (const c of children) dfs(c, level + 1);
    };

    for (const r of roots) dfs(r, 0);
    return out;
  }, [postesForRatioFormula]);

  const insertIntoFormule = (text: string) => {
    const el = formuleInputRef.current;
    const current = form.formule || '';
    if (!el) {
      setForm({ ...form, formule: current + text });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    setForm({ ...form, formule: next });
    setTimeout(() => {
      try {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      } catch {
        // ignore
      }
    }, 0);
  };

  const fetchRatios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterCategorie) params.append('categorie', filterCategorie);
      if (filterTypeRapport) params.append('type_rapport', filterTypeRapport);
      if (filterActive !== null) params.append('is_active', String(filterActive));

      const response = await fetch(`/api/pcb/ratios?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      const normalized = Array.isArray(data)
        ? (data as any[]).map((r) => {
            const rawId = r?.id;
            const isRawValid =
              rawId !== undefined &&
              rawId !== null &&
              String(rawId).trim() !== '' &&
              String(rawId) !== 'undefined' &&
              String(rawId) !== 'null';

            const fallbackId = r?._id || r?.Id;
            return {
              ...r,
              id: isRawValid ? rawId : fallbackId,
            };
          })
        : [];
      setRatios(normalized as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des ratios');
      console.error('Erreur fetchRatios:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCategorie, filterTypeRapport, filterActive]);

  useEffect(() => {
    fetchRatios();
  }, [fetchRatios]);

  const handleInitDefaults = async () => {
    if (!window.confirm('Voulez-vous initialiser les ratios par défaut UEMOA ? Cela créera 15 ratios standards.')) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/pcb/ratios/init', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      alert('Ratios par défaut initialisés avec succès !');
      fetchRatios();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ratioId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/pcb/ratios/${ratioId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!response.ok) throw new Error('Erreur');
      fetchRatios();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleEdit = (ratio: Ratio) => {
    const rid = (ratio as any)?.id;
    const valid =
      rid !== undefined &&
      rid !== null &&
      String(rid).trim() !== '' &&
      String(rid) !== 'undefined' &&
      String(rid) !== 'null';
    if (!valid) {
      setError("Impossible de modifier: ID du ratio manquant (refresh la page puis réessaye).");
      return;
    }
    setEditingRatio(ratio);
    setForm({
      code: ratio.code,
      libelle: ratio.libelle,
      description: ratio.description || '',
      formule: ratio.formule,
      type_rapport: ratio.type_rapport,
      categorie: ratio.categorie,
      seuil_min: ratio.seuil_min || null,
      seuil_max: ratio.seuil_max || null,
      unite: ratio.unite,
      is_reglementaire: ratio.is_reglementaire,
      is_active: ratio.is_active,
      postes_requis: ratio.postes_requis || [],
      ordre_affichage: ratio.ordre_affichage,
    });
    setShowFormModal(true);
  };

  const handleDelete = async (ratioId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ratio ?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/pcb/ratios/${ratioId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      alert('Ratio supprimé avec succès !');
      fetchRatios();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const eid = (editingRatio as any)?.id;
      const valid =
        eid !== undefined &&
        eid !== null &&
        String(eid).trim() !== '' &&
        String(eid) !== 'undefined' &&
        String(eid) !== 'null';
      if (editingRatio && !valid) {
        throw new Error('ID du ratio manquant');
      }

      const method = editingRatio ? 'PUT' : 'POST';
      const url = editingRatio ? `/api/pcb/ratios/${String(eid)}` : '/api/pcb/ratios';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`${response.status}: ${body || response.statusText}`);
      }
      
      alert(editingRatio ? 'Ratio modifié avec succès !' : 'Ratio créé avec succès !');
      setShowFormModal(false);
      resetForm();
      fetchRatios();
    } catch (err) {
      setError('Erreur lors de la sauvegarde: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      code: '',
      libelle: '',
      description: '',
      formule: '',
      type_rapport: 'bilan_reglementaire',
      categorie: 'solvabilite',
      seuil_min: null,
      seuil_max: null,
      unite: '%',
      is_reglementaire: true,
      is_active: true,
      postes_requis: [],
      ordre_affichage: 1,
    });
    setEditingRatio(null);
  };

  const getCategorieColor = (categorie: string) => {
    const colors: Record<string, string> = {
      solvabilite: '#0F1E48',
      liquidite: '#0288d1',
      rentabilite: '#f57c00',
      efficacite: '#7b1fa2',
      qualite_portefeuille: '#c62828',
    };
    return colors[categorie] || '#718096';
  };

  const getStatutColor = (ratio: Ratio) => {
    if (!ratio.is_active) return '#999';
    if (ratio.is_reglementaire) return '#0F1E48';
    return '#0288d1';
  };

  const categories = [
    'solvabilite',
    'division_risques',
    'levier',
    'participations',
    'immobilisations',
    'parties_liees',
    'liquidite',
    'rentabilite',
    'efficacite',
    'qualite_portefeuille',
  ];
  const typesRapport = ['bilan_reglementaire', 'compte_resultat', 'les_deux'];

  return (
    <div style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#fff' }}>
        📊 Configuration des ratios bancaires
      </h4>

      {/* Actions */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleInitDefaults}
          disabled={loading}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
            color: '#fff',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          🔧 Initialiser les ratios par défaut (UEMOA)
        </button>
        <button
          onClick={() => {
            resetForm();
            setShowFormModal(true);
          }}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          ➕ Créer un ratio personnalisé
        </button>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            padding: '0.75rem',
            borderRadius: '12px',
            border: '1px solid rgba(59,130,246,0.35)',
            background: '#0B1026',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#CBD5E1' }}>📅 Date de solde</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.55rem',
                borderRadius: '10px',
                border: '1px solid #3B82F6',
                minWidth: '220px',
                background: '#1E3A8A',
                color: '#ffffff',
                colorScheme: 'dark',
              }}
            >
              <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>
                {availableDates.length === 0 ? 'Aucune date (import GL requis)' : 'Sélectionnez une date'}
              </option>
              {availableDates
                .map((d) => {
                  try {
                    const dt = new Date(d);
                    return {
                      iso: d,
                      display: dt.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
                    };
                  } catch {
                    return { iso: d, display: d };
                  }
                })
                .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
                .map((it) => (
                  <option key={it.iso} value={it.iso} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                    {it.display}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#CBD5E1', paddingBottom: '0.25rem' }}>
            {previewLoading && selectedDate ? 'Calcul des ratios…' : ''}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: '#e53e3e', marginBottom: '1rem', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {previewError && (
        <div style={{ color: '#e53e3e', marginBottom: '1rem', fontWeight: 'bold' }}>
          Résultat (preview): {previewError}
        </div>
      )}

      {/* Filtres */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#CBD5E1' }}>
            Catégorie
          </label>
          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #3B82F6', width: '150px', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
          >
            <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Toutes</option>
            {categories.map((c) => (
              <option key={c} value={c} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                {c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#CBD5E1' }}>
            Type de rapport
          </label>
          <select
            value={filterTypeRapport}
            onChange={(e) => setFilterTypeRapport(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #3B82F6', width: '180px', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
          >
            <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Tous</option>
            {typesRapport.map((t) => (
              <option key={t} value={t} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                {t === 'les_deux' ? 'Les deux' : t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#CBD5E1' }}>
            Statut
          </label>
          <select
            value={filterActive === null ? '' : String(filterActive)}
            onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #3B82F6', width: '120px', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
          >
            <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Tous</option>
            <option value="true" style={{ background: '#1E3A8A', color: '#ffffff' }}>Actifs</option>
            <option value="false" style={{ background: '#1E3A8A', color: '#ffffff' }}>Inactifs</option>
          </select>
        </div>
        <button
          onClick={() => {
            setFilterCategorie('');
            setFilterTypeRapport('');
            setFilterActive(null);
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid #3B82F6',
            background: '#1D4ED8',
            color: '#E2E8F0',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Liste des ratios */}
      {loading ? (
        <p>Chargement des ratios...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
          {ratios.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#0B1026',
                borderRadius: '12px',
                border: '1px solid #3B82F6',
                color: '#CBD5E1',
                gridColumn: '1 / -1',
              }}
            >
              Aucun ratio configuré. Cliquez sur &quot;Initialiser les ratios par défaut&quot; pour commencer.
            </div>
          ) : (
            ratios.map((ratio) => (
              <div
                key={ratio.id}
                style={{
                  padding: '1.5rem',
                  background: '#0B1026',
                  borderRadius: '12px',
                  border: `2px solid ${getStatutColor(ratio)}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                        {ratio.code}
                      </h5>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: `${getCategorieColor(ratio.categorie)}20`,
                          color: getCategorieColor(ratio.categorie),
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        {ratio.categorie.replace('_', ' ')}
                      </span>
                      {ratio.is_reglementaire && (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: '#0F1E4820',
                            color: '#0F1E48',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                          }}
                        >
                          Réglementaire
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#CBD5E1', fontWeight: '600' }}>
                      {ratio.libelle}
                    </p>
                    {ratio.description && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        {ratio.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleToggleActive(ratio.id, ratio.is_active)}
                      style={{
                        padding: '0.4rem 0.7rem',
                        borderRadius: '6px',
                        border: `1px solid ${ratio.is_active ? '#c62828' : '#0F1E48'}`,
                        background: ratio.is_active ? 'rgba(198, 40, 40, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                        color: ratio.is_active ? '#c62828' : '#0F1E48',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {ratio.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#1E3A8A', borderRadius: '8px', border: '1px solid #3B82F6' }}>
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                    <strong>Formule:</strong> {ratio.formule}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                    <strong>Type:</strong> {ratio.type_rapport === 'les_deux' ? 'Les deux' : ratio.type_rapport.replace('_', ' ')}
                  </div>
                  {ratio.seuil_min !== null && ratio.seuil_min !== undefined && (
                    <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                      <strong>Seuil min:</strong> {ratio.seuil_min}%
                    </div>
                  )}
                  {ratio.seuil_max !== null && ratio.seuil_max !== undefined && (
                    <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                      <strong>Seuil max:</strong> {ratio.seuil_max}%
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '0.5rem' }}>
                    <strong>Résultat (à la date):</strong>{' '}
                    {(() => {
                      if (!selectedDate) return '—';
                      const typeKey = ratio.type_rapport || 'les_deux';
                      const store = previewResultsByType[typeKey] || {};
                      const val = store[ratio.code];
                      if (val === undefined) return previewLoading ? 'Calcul…' : '—';
                      if (val === null) return '—';
                      return `${Number(val).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${ratio.unite || ''}`;
                    })()}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                    <strong>Valeurs utilisées:</strong>{' '}
                    {(() => {
                      if (!selectedDate) return '—';
                      const formule = String(ratio.formule || '');
                      const tokens = formule.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
                      const uniq = Array.from(new Set(tokens));

                      const canonicalizeKey = (k: string) => {
                        const map: Record<string, string> = {
                          'FOND_PROPRE': 'FONDS_PROPRES',
                        };
                        return map[k] || k;
                      };

                      const items = uniq
                        .map((t) => {
                          const canon = canonicalizeKey(t);
                          const v = (valuesByKey as any)?.[t] ?? (valuesByKey as any)?.[canon];
                          if (v === undefined || v === null || v === '') return null;
                          const num = Number(v);
                          const disp = Number.isFinite(num)
                            ? num.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                            : String(v);
                          return `${canon}=${disp}`;
                        })
                        .filter(Boolean) as string[];

                      return items.length > 0 ? items.join(' | ') : '—';
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => handleEdit(ratio)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #0288d1',
                      background: 'rgba(2, 136, 209, 0.2)',
                      color: '#7DD3FC',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(ratio.id)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d32f2f',
                      background: 'rgba(211, 47, 47, 0.2)',
                      color: '#d32f2f',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de formulaire */}
      {showFormModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            overflowY: 'auto',
          }}
          onClick={() => !loading && setShowFormModal(false)}
        >
          <div
            style={{
              background: '#0B1026',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '700px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              margin: '2rem 0',
              border: '1px solid #3B82F6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              {editingRatio ? 'Modifier le ratio' : 'Créer un ratio personnalisé'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Code *
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    disabled={!!editingRatio}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                    placeholder="ex: SOLVABILITE_1"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Catégorie *
                  </label>
                  <select
                    value={form.categorie}
                    onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                        {c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  Libellé *
                </label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                  placeholder="ex: Ratio de solvabilité"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff', resize: 'vertical' }}
                  placeholder="Description détaillée du ratio"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  Formule *
                </label>
                <input
                  type="text"
                  ref={formuleInputRef}
                  value={form.formule}
                  onChange={(e) => setForm({ ...form, formule: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                  placeholder="ex: FONDS_PROPRES / ACTIF_PONDERE"
                />

                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['+', '-', '*', '/', '(', ')'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => insertIntoFormule(op)}
                        style={{
                          padding: '0.4rem 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid #3B82F6',
                          background: '#111827',
                          color: '#E2E8F0',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        {op}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, minWidth: isMobile ? '100%' : '320px' }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        insertIntoFormule(v);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: '1px solid #3B82F6',
                        background: '#1E3A8A',
                        color: '#ffffff',
                        colorScheme: 'dark',
                      }}
                    >
                      <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>
                        Insérer un poste (bilan/CR)
                      </option>
                      {flattenedPostesForSelect.map((p: any) => (
                        <option key={p.id} value={p.code} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                          {p.__label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, minWidth: isMobile ? '100%' : '320px' }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        insertIntoFormule(v);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: '1px solid #3B82F6',
                        background: '#1E3A8A',
                        color: '#ffffff',
                        colorScheme: 'dark',
                      }}
                    >
                      <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>
                        Insérer une variable (catalogue)
                      </option>
                      {(catalogItems || [])
                        .filter((v) => v?.key)
                        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
                        .map((v) => (
                          <option key={v.id} value={v.key} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                            {v.key} - {v.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#CBD5E1' }}>
                  Utilisez les codes de postes ou variables standards (FONDS_PROPRES, TOTAL_ACTIF, etc.)
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Type de rapport *
                  </label>
                  <select
                    value={form.type_rapport}
                    onChange={(e) => setForm({ ...form, type_rapport: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    {typesRapport.map((t) => (
                      <option key={t} value={t} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                        {t === 'les_deux' ? 'Les deux' : t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Unité
                  </label>
                  <select
                    value={form.unite}
                    onChange={(e) => setForm({ ...form, unite: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff', colorScheme: 'dark' }}
                  >
                    <option value="%" style={{ background: '#1E3A8A', color: '#ffffff' }}>%</option>
                    <option value="XOF" style={{ background: '#1E3A8A', color: '#ffffff' }}>XOF</option>
                    <option value="nombre" style={{ background: '#1E3A8A', color: '#ffffff' }}>Nombre</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Seuil minimum (%)
                  </label>
                  <input
                    type="number"
                    value={form.seuil_min || ''}
                    onChange={(e) => setForm({ ...form, seuil_min: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.1"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>
                    Seuil maximum (%)
                  </label>
                  <input
                    type="number"
                    value={form.seuil_max || ''}
                    onChange={(e) => setForm({ ...form, seuil_max: e.target.value ? parseFloat(e.target.value) : null })}
                    step="0.1"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_reglementaire}
                    onChange={(e) => setForm({ ...form, is_reglementaire: e.target.checked })}
                  />
                  <span style={{ fontWeight: '600', color: '#CBD5E1' }}>Ratio réglementaire BCEAO</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span style={{ fontWeight: '600', color: '#CBD5E1' }}>Actif</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #3B82F6',
                    background: '#1D4ED8',
                    color: '#E2E8F0',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {editingRatio ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== CATALOGUE VARIABLES (FALLBACK) ===================== */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(59, 130, 246, 0.25)' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
          🧮 Catalogue variables (fallback) pour calcul des ratios
        </h4>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#CBD5E1' }}>📅 Date de solde</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.6rem',
                borderRadius: '10px',
                border: '1px solid #3B82F6',
                minWidth: '220px',
                background: '#1E3A8A',
                color: '#ffffff',
                colorScheme: 'dark',
              }}
            >
              <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>
                {availableDates.length === 0 ? 'Aucune date (import GL requis)' : 'Sélectionnez une date'}
              </option>
              {availableDates
                .map((d) => {
                  try {
                    const dt = new Date(d);
                    return {
                      iso: d,
                      display: dt.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
                    };
                  } catch {
                    return { iso: d, display: d };
                  }
                })
                .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
                .map((it) => (
                  <option key={it.iso} value={it.iso} style={{ background: '#1E3A8A', color: '#ffffff' }}>
                    {it.display}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEditingCatalogItem(null);
              setCatalogForm({ key: '', label: '', unit: '' });
              setCatalogMode('standard');
              setShowCatalogModal(true);
            }}
            style={{
              padding: '0.7rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'linear-gradient(135deg, #1B3A8C 0%, #7C3AED 100%)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ➕ Ajouter une variable
          </button>

          <button
            onClick={() => {
              fetchCatalog();
              if (selectedDate) fetchValuesForDate(selectedDate);
            }}
            style={{
              padding: '0.7rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: '#0B1026',
              color: '#E2E8F0',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔄 Rafraîchir
          </button>
        </div>

        {(catalogError || valuesError) && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#FECACA', marginBottom: '1rem' }}>
            {catalogError || valuesError}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0B1026', borderRadius: '12px', overflow: 'hidden', border: '1px solid #3B82F6' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', color: '#fff' }}>
                <th style={{ padding: '0.9rem', textAlign: 'left', fontWeight: '700' }}>Key</th>
                <th style={{ padding: '0.9rem', textAlign: 'left', fontWeight: '700' }}>Libellé</th>
                <th style={{ padding: '0.9rem', textAlign: 'left', fontWeight: '700' }}>Unité</th>
                <th style={{ padding: '0.9rem', textAlign: 'right', fontWeight: '700' }}>Valeur (à la date)</th>
                <th style={{ padding: '0.9rem', textAlign: 'right', fontWeight: '700' }}></th>
              </tr>
            </thead>
            <tbody>
              {(catalogItems || []).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', color: '#CBD5E1' }}>
                    {catalogLoading ? 'Chargement...' : "Aucune variable dans le catalogue. Ajoute-en une (ex: FONDS_PROPRES, ACTIF_PONDERE)."}
                  </td>
                </tr>
              ) : (
                (catalogItems || []).map((it, idx) => {
                  const currentValue = valuesByKey[it.key] ?? '';
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #3B82F6', background: idx % 2 === 0 ? '#0B1026' : '#0B1026' }}>
                      <td style={{ padding: '0.9rem', color: '#fff', fontWeight: 800 }}>{it.key}</td>
                      <td style={{ padding: '0.9rem', color: '#E2E8F0' }}>{it.label}</td>
                      <td style={{ padding: '0.9rem', color: '#E2E8F0' }}>{it.unit || '—'}</td>
                      <td style={{ padding: '0.9rem', textAlign: 'right' }}>
                        <input
                          type="number"
                          value={currentValue}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : Number(e.target.value);
                            setValuesByKey((p) => ({ ...p, [it.key]: v as any }));
                          }}
                          disabled={!selectedDate}
                          style={{
                            width: '220px',
                            padding: '0.65rem 0.75rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(59,130,246,0.5)',
                            background: '#1E3A8A',
                            color: '#ffffff',
                            textAlign: 'right',
                            opacity: selectedDate ? 1 : 0.6,
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.9rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleSaveValue(it.key, valuesByKey[it.key] ?? '')}
                          disabled={!selectedDate || valuesLoading}
                          style={{
                            padding: '0.6rem 0.9rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: selectedDate ? 'linear-gradient(135deg, #1B3A8C 0%, #7C3AED 100%)' : '#334155',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: !selectedDate || valuesLoading ? 'not-allowed' : 'pointer',
                            opacity: !selectedDate || valuesLoading ? 0.7 : 1,
                          }}
                        >
                          Enregistrer
                        </button>

                        <button
                          onClick={() => openEditCatalogModal(it)}
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.6rem 0.9rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(2, 136, 209, 0.6)',
                            background: 'rgba(2, 136, 209, 0.18)',
                            color: '#7DD3FC',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => handleDeleteCatalogItem(it)}
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.6rem 0.9rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(211, 47, 47, 0.6)',
                            background: 'rgba(211, 47, 47, 0.18)',
                            color: '#FCA5A5',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCatalogModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
          onClick={() => {
            setShowCatalogModal(false);
            setEditingCatalogItem(null);
            setCatalogForm({ key: '', label: '', unit: '' });
            setCatalogInitialValue('');
            setCatalogInitialDate('');
          }}
        >
          <div
            style={{ width: 'min(720px, 100%)', background: '#0B1026', borderRadius: '18px', border: '1px solid rgba(59,130,246,0.35)', padding: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.15rem' }}>
                {editingCatalogItem ? `Modifier la variable ${editingCatalogItem.key}` : 'Ajouter une variable au catalogue'}
              </div>
              <button
                onClick={() => {
                  setShowCatalogModal(false);
                  setEditingCatalogItem(null);
                  setCatalogForm({ key: '', label: '', unit: '' });
                }}
                style={{ padding: '0.5rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: '#111827', color: '#E2E8F0', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingCatalogItem ? handleUpdateCatalogItem : handleCreateCatalogItem}>
              {/* Toggle Standard / Personnalisée (caché en mode édition, la clé ne change pas) */}
              {!editingCatalogItem && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Type de variable
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', background: '#0A1434', padding: '0.35rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogMode('standard');
                        setCatalogForm({ key: '', label: '', unit: '' });
                      }}
                      style={{
                        flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px',
                        border: 'none',
                        background: catalogMode === 'standard' ? '#1B3A8C' : 'transparent',
                        color: catalogMode === 'standard' ? '#fff' : 'rgba(226,232,240,0.6)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        boxShadow: catalogMode === 'standard' ? '0 2px 8px rgba(27,58,140,0.4)' : 'none',
                      }}
                    >
                      📚 Standard BCEAO
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogMode('custom');
                        setCatalogForm({ key: '', label: '', unit: '' });
                      }}
                      style={{
                        flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px',
                        border: 'none',
                        background: catalogMode === 'custom' ? '#7C3AED' : 'transparent',
                        color: catalogMode === 'custom' ? '#fff' : 'rgba(226,232,240,0.6)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                        boxShadow: catalogMode === 'custom' ? '0 2px 8px rgba(124,58,237,0.4)' : 'none',
                      }}
                    >
                      ✏️ Personnalisée
                    </button>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(203,213,225,0.65)', lineHeight: 1.4 }}>
                    {catalogMode === 'standard'
                      ? 'Sélectionne une clé officielle BCEAO — libellé et unité pré-remplis pour garantir la cohérence avec les formules des ratios prudentiels.'
                      : 'Saisie libre pour une variable qui n\'existe pas dans le référentiel BCEAO.'}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                {/* Key — select ou input selon le mode */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Key *
                    {catalogMode === 'standard' && !editingCatalogItem && (
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'rgba(203,213,225,0.55)', marginLeft: '0.5rem' }}>
                        (choisir dans la liste)
                      </span>
                    )}
                  </label>
                  {catalogMode === 'standard' && !editingCatalogItem ? (
                    <select
                      value={catalogForm.key}
                      onChange={(e) => {
                        const k = e.target.value;
                        const std = RATIO_VARIABLES_STANDARDS_BY_KEY[k];
                        setCatalogForm({
                          key: k,
                          label: std?.label || '',
                          unit: std?.unit || 'M FCFA',
                        });
                      }}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.5)', background: '#1E3A8A', color: '#fff' }}
                    >
                      <option value="" style={{ background: '#1E3A8A' }}>— Sélectionne une clé BCEAO —</option>
                      {Array.from(new Set(RATIO_VARIABLES_STANDARDS.map((v) => v.category))).map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {RATIO_VARIABLES_STANDARDS.filter((v) => v.category === cat).map((v) => (
                            <option key={v.key} value={v.key} style={{ background: '#1E3A8A' }}>
                              {v.key} — {v.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={catalogForm.key}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, key: e.target.value.trim().toUpperCase().replace(/\s+/g, '_') }))}
                      placeholder="ex: MA_VARIABLE_PERSO"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.5)', background: '#1E3A8A', color: '#fff', fontFamily: 'monospace' }}
                      required
                      disabled={!!editingCatalogItem}
                    />
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Unité
                    {catalogMode === 'standard' && !editingCatalogItem && (
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'rgba(203,213,225,0.55)', marginLeft: '0.5rem' }}>
                        (auto)
                      </span>
                    )}
                  </label>
                  <input
                    value={catalogForm.unit}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="ex: M FCFA"
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '12px',
                      border: '1px solid rgba(59,130,246,0.5)',
                      background: catalogMode === 'standard' && !editingCatalogItem ? '#0A1434' : '#1E3A8A',
                      color: catalogMode === 'standard' && !editingCatalogItem ? 'rgba(255,255,255,0.6)' : '#fff',
                      cursor: catalogMode === 'standard' && !editingCatalogItem ? 'not-allowed' : 'text',
                    }}
                    readOnly={catalogMode === 'standard' && !editingCatalogItem}
                  />
                </div>
                <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 800, color: '#CBD5E1' }}>
                    Libellé *
                    {catalogMode === 'standard' && !editingCatalogItem && (
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'rgba(203,213,225,0.55)', marginLeft: '0.5rem' }}>
                        (pré-rempli depuis la clé BCEAO — non modifiable)
                      </span>
                    )}
                  </label>
                  <input
                    value={catalogForm.label}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="ex: Fonds propres effectifs"
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '12px',
                      border: '1px solid rgba(59,130,246,0.5)',
                      background: catalogMode === 'standard' && !editingCatalogItem ? '#0A1434' : '#1E3A8A',
                      color: catalogMode === 'standard' && !editingCatalogItem ? 'rgba(255,255,255,0.6)' : '#fff',
                      cursor: catalogMode === 'standard' && !editingCatalogItem ? 'not-allowed' : 'text',
                    }}
                    required
                    readOnly={catalogMode === 'standard' && !editingCatalogItem}
                  />
                </div>
              </div>

              {/* Saisie directe du montant + date (uniquement en mode création) */}
              {!editingCatalogItem && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(5,150,105,0.08)',
                  border: '1px solid rgba(5,150,105,0.3)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#6EE7B7', fontWeight: 700, marginBottom: '0.6rem' }}>
                    💰 Saisie du montant (optionnel)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, color: '#CBD5E1', fontSize: '0.8rem' }}>
                        Date de référence
                      </label>
                      <input
                        type="date"
                        value={catalogInitialDate}
                        onChange={(e) => setCatalogInitialDate(e.target.value)}
                        style={{
                          width: '100%', padding: '0.65rem', borderRadius: '10px',
                          border: '1px solid rgba(59,130,246,0.4)',
                          background: '#1E3A8A', color: '#fff', colorScheme: 'dark',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, color: '#CBD5E1', fontSize: '0.8rem' }}>
                        Montant {catalogForm.unit ? `(${catalogForm.unit})` : ''}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={catalogInitialValue}
                        onChange={(e) => setCatalogInitialValue(e.target.value)}
                        placeholder="ex: 15430"
                        className="no-spinner"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(59,130,246,0.4)',
                          background: '#1E3A8A', color: '#fff',
                          textAlign: 'right', fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          MozAppearance: 'textfield',
                        }}
                      />
                      <style jsx>{`
                        input.no-spinner::-webkit-outer-spin-button,
                        input.no-spinner::-webkit-inner-spin-button {
                          -webkit-appearance: none;
                          margin: 0;
                        }
                      `}</style>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'rgba(203,213,225,0.55)', lineHeight: 1.4 }}>
                    Si tu saisis un montant et une date, ils seront enregistrés directement en même temps que la variable. Sinon, tu pourras le faire plus tard dans la table des valeurs.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCatalogModal(false);
                    setEditingCatalogItem(null);
                    setCatalogForm({ key: '', label: '', unit: '' });
                  }}
                  style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: '#111827', color: '#E2E8F0', cursor: 'pointer', fontWeight: 800 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={catalogLoading}
                  style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'linear-gradient(135deg, #1B3A8C 0%, #7C3AED 100%)', color: '#fff', cursor: catalogLoading ? 'not-allowed' : 'pointer', fontWeight: 900, opacity: catalogLoading ? 0.7 : 1 }}
                >
                  {catalogLoading ? 'En cours…' : editingCatalogItem ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatiosTab;
