'use client';

import React, { useState, useEffect } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface GLCode {
  code: string;
  signe: '+' | '-';
}

interface Poste {
  id: string;
  code: string;
  libelle: string;
  type: string;
  niveau: number;
  parent_id?: string;
  parent_code?: string;
  contribution_signe?: '+' | '-';
  ordre: number;
  gl_codes: GLCode[];
  calculation_mode?: 'gl' | 'parents_formula';
  parents_formula?: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[];
  formule?: string;
  formule_custom?: string;
  is_active: boolean;
  children?: Poste[];
}

interface PosteExerciceValue {
  id: string;
  poste_id: string;
  exercice: string;
  n_1: number | null;
  budget: number | null;
}

type PostesReglementairesMode = 'full' | 'valuesOnly' | 'postesOnly';

interface PostesReglementairesTabProps {
  typeFilter?: string;
  mode?: PostesReglementairesMode;
  showHeader?: boolean;
  showCreateButton?: boolean;
}

const PostesReglementairesTab = ({
  typeFilter,
  mode = 'full',
  showHeader = true,
  showCreateButton = mode !== 'valuesOnly',
}: PostesReglementairesTabProps) => {
  const {} = useResponsive();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [allPostes, setAllPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPoste, setEditingPoste] = useState<Poste | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [formTab, setFormTab] = useState<'identity' | 'hierarchy' | 'computation' | 'gl'>('identity');
  const [formulaText, setFormulaText] = useState('');
  const [formulaCaret, setFormulaCaret] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const formulaInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedExercice, setSelectedExercice] = useState(String(new Date().getFullYear()));
  const [valuesByPosteId, setValuesByPosteId] = useState<Record<string, { n_1: number | null; budget: number | null }>>({});
  const [savingValues, setSavingValues] = useState(false);
  const [showExerciceBlock, setShowExerciceBlock] = useState(mode !== 'valuesOnly');
  const [realisationReferenceDate, setRealisationReferenceDate] = useState('');
  const [n1ReferenceDate, setN1ReferenceDate] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    type: 'bilan_actif',
    niveau: 1,
    parent_id: '',
    parent_code: '',
    contribution_signe: '+' as '+' | '-',
    ordre: 0,
    gl_codes: [] as GLCode[],
    calculation_mode: 'gl' as 'gl' | 'parents_formula',
    parents_formula: [] as { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[],
    formule: 'somme',
    formule_custom: '',
    is_active: true,
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

  const renderValuesTreeNode = (node: Poste & { children?: Poste[] }, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 24;
    const n1Value = getAggregatedValue(node, 'n_1');
    const realValue = getAggregatedValue(node, 'budget');

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            background: level % 2 === 0 ? '#0B1026' : '#1E3A8A',
            borderRadius: '8px',
            border: `1px solid ${(typeColors[node.type] || '#e2e8f0')}40`,
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => toggleNode(node.id)}
            style={{
              width: '24px',
              height: '24px',
              marginRight: '0.25rem',
              border: 'none',
              background: 'transparent',
              cursor: hasChildren ? 'pointer' : 'default',
              fontSize: '0.85rem',
              color: '#667eea',
            }}
            disabled={!hasChildren}
            type="button"
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </button>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  background: `${(typeColors[node.type] || '#667eea')}20`,
                  color: typeColors[node.type] || '#667eea',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}
              >
                {node.code}
              </span>
              <span style={{ fontWeight: '600', color: '#fff' }}>{node.libelle}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600', color: '#CBD5E1', fontSize: '0.8rem' }}>{n1Label}</label>
              <input
                type="number"
                value={hasChildren ? n1Value ?? 0 : valuesByPosteId[node.id]?.n_1 ?? ''}
                onChange={(e) => setValueForPoste(node.id, 'n_1', e.target.value)}
                disabled={hasChildren}
                style={{
                  width: '160px',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  color: '#ffffff',
                  background: hasChildren ? '#0B1026' : '#1E3A8A',
                  opacity: hasChildren ? 0.8 : 1,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600', color: '#CBD5E1', fontSize: '0.8rem' }}>Réalisation (date)</label>
              <input
                type="number"
                value={hasChildren ? realValue ?? 0 : valuesByPosteId[node.id]?.budget ?? ''}
                onChange={(e) => setValueForPoste(node.id, 'budget', e.target.value)}
                disabled={hasChildren}
                style={{
                  width: '160px',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: '1px solid #3B82F6',
                  color: '#ffffff',
                  background: hasChildren ? '#0B1026' : '#1E3A8A',
                  opacity: hasChildren ? 0.8 : 1,
                }}
              />
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && node.children && (
          <div style={{ marginLeft: '24px' }}>
            {node.children.map((child) => renderValuesTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchPostes();
  }, []);

  useEffect(() => {
    fetchAllPostes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `pcb_realisation_reference_date_${selectedExercice}`;
    const stored = localStorage.getItem(key);
    setRealisationReferenceDate(stored || '');
    const n1Key = `pcb_n1_reference_date_${selectedExercice}`;
    const n1Stored = localStorage.getItem(n1Key);
    setN1ReferenceDate(n1Stored || '');
  }, [selectedExercice]);

  // Formate une date ISO (YYYY-MM-DD) en DD/MM/YYYY pour affichage utilisateur
  const formatDateFR = (iso: string): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  // Label dynamique pour la colonne N-1 : date formatée si saisie, sinon "N-1"
  const n1Label = n1ReferenceDate ? formatDateFR(n1ReferenceDate) : 'N-1';

  useEffect(() => {
    if (postes.length === 0) return;
    fetchExerciceValues(selectedExercice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercice, postes.length]);

  const fetchPostes = async () => {
    setLoading(true);
    try {
      const url = typeFilter ? `/api/pcb/postes?type=${encodeURIComponent(typeFilter)}` : '/api/pcb/postes';
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      const filtered = typeFilter ? (data as Poste[]).filter((p) => p.type === typeFilter) : (data as Poste[]);
      setPostes(filtered);

      // Contracter tout l'arbre par défaut (y compris sous-sous-postes)
      setExpandedNodes(new Set());
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPostes = async () => {
    try {
      const response = await fetch('/api/pcb/postes', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = (await response.json()) as Poste[];
      setAllPostes(data || []);
    } catch {
      setAllPostes([]);
    }
  };

  const fetchExerciceValues = async (exercice: string) => {
    try {
      const response = await fetch(`/api/pcb/postes/values?exercice=${encodeURIComponent(exercice)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      const data = (await response.json()) as PosteExerciceValue[];

      const map: Record<string, { n_1: number | null; budget: number | null }> = {};
      data.forEach((item) => {
        map[item.poste_id] = {
          n_1: item.n_1 ?? null,
          budget: item.budget ?? null,
        };
      });
      setValuesByPosteId(map);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
      setValuesByPosteId({});
    }
  };

  const setValueForPoste = (posteId: string, key: 'n_1' | 'budget', raw: string) => {
    const parsed = raw === '' ? null : Number(raw);
    setValuesByPosteId((prev) => ({
      ...prev,
      [posteId]: {
        n_1: prev[posteId]?.n_1 ?? null,
        budget: prev[posteId]?.budget ?? null,
        [key]: Number.isFinite(parsed as number) ? (parsed as number) : null,
      },
    }));
  };

  const collectLeafPostes = (nodes: (Poste & { children?: Poste[] })[]) => {
    const leaves: Poste[] = [];
    const visit = (n: Poste & { children?: Poste[] }) => {
      const hasChildren = n.children && n.children.length > 0;
      if (!hasChildren) {
        leaves.push(n);
        return;
      }
      n.children!.forEach(visit);
    };
    nodes.forEach(visit);
    return leaves;
  };

  const getAggregatedValue = (node: Poste & { children?: Poste[] }, key: 'n_1' | 'budget'): number | null => {
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) {
      const v = valuesByPosteId[node.id]?.[key];
      return v ?? null;
    }
    const sum = (node.children || []).reduce((acc, c) => acc + (getAggregatedValue(c as Poste & { children?: Poste[] }, key) || 0), 0);
    return sum;
  };

  const handleSaveExerciceValues = async () => {
    setSavingValues(true);
    try {
      const leaves = collectLeafPostes(tree);
      await Promise.all(
        leaves.map(async (poste) => {
          const v = valuesByPosteId[poste.id] || { n_1: null, budget: null };
          const response = await fetch(
            `/api/pcb/postes/${poste.id}/values?exercice=${encodeURIComponent(selectedExercice)}`,
            {
              method: 'PUT',
              headers: getAuthHeaders(),
              body: JSON.stringify({ n_1: v.n_1, budget: v.budget }),
            }
          );
          if (!response.ok) throw new Error('Erreur');
        })
      );
      alert('Valeurs enregistrées avec succès !');
      fetchExerciceValues(selectedExercice);
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setSavingValues(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expandedGlCodes: GLCode[] = [];
      formData.gl_codes.forEach((gl) => {
        if (gl.code && gl.code.trim() !== '') {
          const code = gl.code.trim();
          if (code.includes(',')) {
            const codes = code.split(',').map(c => c.trim()).filter(c => c !== '');
            codes.forEach(singleCode => {
              expandedGlCodes.push({ code: singleCode, signe: gl.signe });
            });
          } else {
            expandedGlCodes.push({ code: code, signe: gl.signe });
          }
        }
      });

      const isCompteResultatType = formData.type === 'cr_produit' || formData.type === 'cr_charge';
      const isBilanType = formData.type === 'bilan_actif' || formData.type === 'bilan_passif';
      const canHaveParentsFormula = isCompteResultatType || isBilanType;

      const parentsFormulaNormalized = (formData.parents_formula || [])
        .map((t) => {
          if (!t) return null;
          const op = t.op;
          const poste_id = typeof t.poste_id === 'string' ? t.poste_id : '';

          if (op === '(' || op === ')') return { op };
          if (op === '+' || op === '-' || op === '*' || op === '/') {
            if (poste_id.trim() !== '') return { op, poste_id };
            return { op }; // opérateur seul
          }
          return null;
        })
        .filter(Boolean);

      const cleanedFormData = {
        ...formData,
        gl_codes: expandedGlCodes,
        contribution_signe: formData.parent_id ? formData.contribution_signe : '+',
        calculation_mode: canHaveParentsFormula ? formData.calculation_mode : 'gl',
        parents_formula:
          canHaveParentsFormula && formData.calculation_mode === 'parents_formula'
            ? (parentsFormulaNormalized as unknown[])
            : [],
      };

      const method = editingPoste ? 'PUT' : 'POST';
      const url = editingPoste ? `/api/pcb/postes/${editingPoste.id}` : '/api/pcb/postes';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanedFormData),
      });

      if (!response.ok) throw new Error('Erreur');
      alert(editingPoste ? 'Poste modifié avec succès !' : 'Poste créé avec succès !');
      setShowForm(false);
      setEditingPoste(null);
      resetForm();
      fetchPostes();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleEdit = (poste: Poste) => {
    setEditingPoste(poste);
    setFormData({
      code: poste.code,
      libelle: poste.libelle,
      type: poste.type,
      niveau: poste.niveau,
      parent_id: poste.parent_id || '',
      parent_code: poste.parent_code || '',
      contribution_signe: poste.contribution_signe || '+',
      ordre: poste.ordre,
      gl_codes: poste.gl_codes || [],
      calculation_mode: poste.calculation_mode || 'gl',
      parents_formula:
        (poste.parents_formula as { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[]) || [],
      formule: poste.formule || 'somme',
      formule_custom: poste.formule_custom || '',
      is_active: poste.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (posteId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce poste ?')) return;
    try {
      const response = await fetch(`/api/pcb/postes/${posteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      alert('Poste supprimé avec succès !');
      fetchPostes();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const resetForm = (forcedType?: string) => {
    setFormData({
      code: '',
      libelle: '',
      type: forcedType || 'bilan_actif',
      niveau: 1,
      parent_id: '',
      parent_code: '',
      contribution_signe: '+',
      ordre: 0,
      gl_codes: [],
      calculation_mode: 'gl',
      parents_formula: [],
      formule: 'somme',
      formule_custom: '',
      is_active: true,
    });
    setEditingPoste(null);
  };

  function buildTree(postesList: Poste[]) {
    const postesMap = new Map<string, Poste & { children: Poste[] }>();
    const rootNodes: (Poste & { children: Poste[] })[] = [];

    postesList.forEach((poste) => {
      postesMap.set(poste.id, { ...poste, children: [] });
    });

    postesList.forEach((poste) => {
      const node = postesMap.get(poste.id);
      if (node) {
        if (poste.parent_id && postesMap.has(poste.parent_id)) {
          postesMap.get(poste.parent_id)!.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });

    const sortNodes = (nodes: (Poste & { children?: Poste[] })[]) => {
      nodes.sort((a, b) => {
        const orderA = Number.isFinite(a.ordre) ? a.ordre : 0;
        const orderB = Number.isFinite(b.ordre) ? b.ordre : 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.code || '').localeCompare(b.code || '');
      });
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children as (Poste & { children?: Poste[] })[]);
        }
      });
    };
    sortNodes(rootNodes as (Poste & { children?: Poste[] })[]);

    return rootNodes;
  }

  function flattenTreeForSelect(nodes: (Poste & { children?: Poste[] })[], level: number = 0) {
    const rows: Array<{ poste: Poste; level: number }> = [];
    nodes.forEach((n) => {
      rows.push({ poste: n, level });
      if (n.children && n.children.length > 0) {
        rows.push(...flattenTreeForSelect(n.children as (Poste & { children?: Poste[] })[], level + 1));
      }
    });
    return rows;
  }

  function collectDescendantIds(nodes: (Poste & { children?: Poste[] })[], targetId: string) {
    const descendants = new Set<string>();
    const visit = (node: Poste & { children?: Poste[] }) => {
      if (node.id === targetId) {
        const collect = (n: Poste & { children?: Poste[] }) => {
          if (!n.children) return;
          n.children.forEach((c) => {
            descendants.add(c.id);
            collect(c as Poste & { children?: Poste[] });
          });
        };
        collect(node);
        return true;
      }
      if (node.children) {
        for (const c of node.children) {
          if (visit(c as Poste & { children?: Poste[] })) return true;
        }
      }
      return false;
    };
    nodes.forEach((n) => visit(n));
    return descendants;
  }

  const isCompteResultatType = formData.type === 'cr_produit' || formData.type === 'cr_charge' || formData.type === 'cr_exploitation';
  const isBilanType = formData.type === 'bilan_actif' || formData.type === 'bilan_passif';
  const canHaveParentsFormula = isCompteResultatType || isBilanType;
  const isRootPoste = formData.parent_id === '';
  const editingPosteHasChildren = !!editingPoste && postes.some((p) => p.parent_id === editingPoste.id);
  const canUseParentsFormula = canHaveParentsFormula && isRootPoste && !editingPosteHasChildren;

  const postesForFormula = typeFilter ? allPostes : postes;
  const selectablePostesForFormula = flattenTreeForSelect(
    buildTree(
      postesForFormula
        .filter((p) => {
          if (isCompteResultatType) {
            if (formData.type === 'cr_charge') {
              return p.type === 'cr_produit' || p.type === 'cr_charge' || p.type === 'bilan_actif' || p.type === 'bilan_passif';
            }
            return p.type === 'cr_produit' || p.type === 'cr_charge' || p.type === 'cr_exploitation';
          }
          if (isBilanType) return p.type === formData.type;
          return false;
        })
        .filter((p) => !editingPoste || p.id !== editingPoste.id)
    )
  );
  const disabledFormulaIds = editingPoste ? collectDescendantIds(buildTree(postesForFormula), editingPoste.id) : new Set<string>();

  const addParentsFormulaTerm = () => {
    const first = selectablePostesForFormula[0]?.poste?.id || '';
    setFormData((prev) => ({
      ...prev,
      parents_formula: [...(prev.parents_formula || []), { poste_id: first, op: '+' }],
    }));
  };

  const addParentsFormulaToken = (op: '(' | ')' | '+' | '-' | '*' | '/') => {
    setFormData((prev) => ({
      ...prev,
      parents_formula: [...(prev.parents_formula || []), { op }],
    }));
  };

  const getParentsFormulaPreview = () => {
    const byId = new Map<string, Poste>();
    (allPostes || []).forEach((p) => byId.set(p.id, p));
    (postes || []).forEach((p) => byId.set(p.id, p));

    const tokens = (formData.parents_formula || []).map((t) => {
      const op = t?.op;
      if (!op) return '';
      if (op === '(' || op === ')') return op;

      if (op === '+' || op === '-' || op === '*' || op === '/') {
        const posteId = typeof t.poste_id === 'string' ? t.poste_id : '';
        if (!posteId) return ` ${op} `;
        const p = byId.get(posteId);
        const label = p ? `${p.code}` : posteId;
        return `${op}${label}`;
      }
      return '';
    });

    const compact = tokens
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return compact || '(vide)';
  };

  const updateParentsFormulaTerm = (index: number, key: 'poste_id' | 'op', value: string) => {
    setFormData((prev) => {
      const next = [...(prev.parents_formula || [])];
      const curr = next[index] || { poste_id: '', op: '+' as '+' | '-' | '*' | '/' | '(' | ')' };
      if (key === 'op') {
        const op = value === '-' || value === '*' || value === '/' || value === '(' || value === ')' ? value : '+';
        next[index] = { ...curr, op };
      } else {
        next[index] = { ...curr, poste_id: value };
      }
      return { ...prev, parents_formula: next };
    });
  };

  const removeParentsFormulaTerm = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      parents_formula: (prev.parents_formula || []).filter((_, i) => i !== index),
    }));
  };

  const handleParentChange = (parentId: string) => {
    if (!parentId) {
      setFormData({
        ...formData,
        parent_id: '',
        parent_code: '',
        niveau: 1,
      });
      return;
    }
    const parent = postes.find((p) => p.id === parentId);
    setFormData({
      ...formData,
      parent_id: parentId,
      parent_code: parent?.code || '',
      contribution_signe: formData.contribution_signe || '+',
      niveau: (parent?.niveau ?? 1) + 1,
    });
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const addGLMapping = () => {
    setFormData({
      ...formData,
      gl_codes: [...formData.gl_codes, { code: '', signe: '+' }],
    });
  };

  const updateGLMapping = (index: number, field: 'code' | 'signe', value: string) => {
    const newGlCodes = [...formData.gl_codes];
    if (field === 'code' && value.includes(',')) {
      const codes = value.split(',').map(c => c.trim()).filter(c => c !== '');
      if (codes.length > 1) {
        newGlCodes[index] = { ...newGlCodes[index], code: codes[0] };
        const signe = newGlCodes[index].signe || '+';
        for (let i = 1; i < codes.length; i++) {
          newGlCodes.push({ code: codes[i], signe });
        }
        setFormData({ ...formData, gl_codes: newGlCodes });
        return;
      }
    }
    newGlCodes[index] = { ...newGlCodes[index], [field]: value };
    setFormData({ ...formData, gl_codes: newGlCodes });
  };

  const removeGLMapping = (index: number) => {
    setFormData({
      ...formData,
      gl_codes: formData.gl_codes.filter((_, i) => i !== index),
    });
  };

  const typeColors: Record<string, string> = {
    bilan_actif: '#1976d2',
    bilan_passif: '#388e3c',
    hors_bilan: '#f57c00',
    cr_produit: '#7b1fa2',
    cr_exploitation: '#0ea5e9',
    cr_charge: '#d32f2f',
  };

  const renderTreeNode = (node: Poste & { children?: Poste[] }, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 24;

    return (
      <div key={node.id} style={{ marginLeft: `${indent}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem',
            marginBottom: '0.5rem',
            background: level % 2 === 0 ? '#0B1026' : '#1E3A8A',
            borderRadius: '8px',
            border: `1px solid ${(typeColors[node.type] || '#e2e8f0')}40`,
          }}
        >
          <button
            onClick={() => toggleNode(node.id)}
            style={{
              width: '24px',
              height: '24px',
              marginRight: '0.5rem',
              border: 'none',
              background: 'transparent',
              cursor: hasChildren ? 'pointer' : 'default',
              fontSize: '0.85rem',
              color: '#667eea',
            }}
            disabled={!hasChildren}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px',
                  background: `${(typeColors[node.type] || '#667eea')}20`,
                  color: typeColors[node.type] || '#667eea',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}
              >
                {node.code}
              </span>
              <span style={{ fontWeight: '600', color: '#fff' }}>{node.libelle}</span>
              {node.gl_codes && node.gl_codes.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#E2E8F0', background: '#1D4ED8', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                  {node.gl_codes.length} GL
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleEdit(node)}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#2196f3',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✏️
            </button>
            <button
              onClick={() => handleDelete(node.id)}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              🗑️
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && node.children && (
          <div style={{ marginLeft: '24px' }}>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(postes);
  const leafPostes = collectLeafPostes(tree);
  const selectablePostes = flattenTreeForSelect(tree);
  const disabledParentIds = editingPoste ? collectDescendantIds(tree, editingPoste.id) : new Set<string>();

  // Recherche : filtre l'arbre en gardant les ancêtres des noeuds qui matchent
  const filterTreeByQuery = (
    nodes: (Poste & { children?: Poste[] })[],
    query: string,
  ): (Poste & { children?: Poste[] })[] => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    const matches = (n: Poste) =>
      (n.code || '').toLowerCase().includes(q) || (n.libelle || '').toLowerCase().includes(q);
    const walk = (arr: (Poste & { children?: Poste[] })[]): (Poste & { children?: Poste[] })[] => {
      const out: (Poste & { children?: Poste[] })[] = [];
      for (const node of arr) {
        const childrenFiltered = walk((node.children as (Poste & { children?: Poste[] })[]) || []);
        if (matches(node) || childrenFiltered.length > 0) {
          out.push({ ...node, children: childrenFiltered });
        }
      }
      return out;
    };
    return walk(nodes);
  };

  const collectAllIds = (nodes: (Poste & { children?: Poste[] })[]): string[] => {
    const ids: string[] = [];
    const walk = (arr: (Poste & { children?: Poste[] })[]) => {
      arr.forEach((n) => {
        ids.push(n.id);
        if (n.children) walk(n.children as (Poste & { children?: Poste[] })[]);
      });
    };
    walk(nodes);
    return ids;
  };

  const filteredTree = filterTreeByQuery(tree as (Poste & { children?: Poste[] })[], searchQuery);

  // ─── Formule texte libre : tokenizer / parser / formatter ───
  type FormulaTok =
    | { type: 'op'; value: '+' | '-' | '*' | '/'; pos: number; len: number }
    | { type: 'paren'; value: '(' | ')'; pos: number; len: number }
    | { type: 'ident'; value: string; pos: number; len: number };

  const tokenizeFormula = (text: string): FormulaTok[] => {
    const tokens: FormulaTok[] = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        tokens.push({ type: 'op', value: ch, pos: i, len: 1 });
        i++;
      } else if (ch === '(' || ch === ')') {
        tokens.push({ type: 'paren', value: ch, pos: i, len: 1 });
        i++;
      } else {
        let j = i;
        while (j < text.length && !/[\s+\-*/()]/.test(text[j])) j++;
        tokens.push({ type: 'ident', value: text.slice(i, j), pos: i, len: j - i });
        i = j;
      }
    }
    return tokens;
  };

  const parseFormulaText = (
    text: string,
    postesByCode: Map<string, Poste>,
  ): { parents_formula: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[]; errors: string[] } => {
    const tokens = tokenizeFormula(text);
    const result: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[] = [];
    const errors: string[] = [];
    let pendingOp: '+' | '-' | '*' | '/' = '+';
    let parenDepth = 0;

    for (const tok of tokens) {
      if (tok.type === 'paren') {
        result.push({ op: tok.value });
        if (tok.value === '(') parenDepth++;
        else {
          parenDepth--;
          if (parenDepth < 0) errors.push('Parenthèse fermante ) sans ouvrante');
        }
      } else if (tok.type === 'op') {
        pendingOp = tok.value;
      } else {
        const poste = postesByCode.get(tok.value);
        if (!poste) {
          errors.push(`Code « ${tok.value} » introuvable`);
        }
        result.push({ op: pendingOp, poste_id: poste?.id || '' });
        pendingOp = '+';
      }
    }
    if (parenDepth > 0) errors.push(`${parenDepth} parenthèse(s) ouvrante(s) non fermée(s)`);
    return { parents_formula: result, errors };
  };

  const formatFormulaToText = (
    formula: { poste_id?: string; op: '+' | '-' | '*' | '/' | '(' | ')' }[],
    postesById: Map<string, Poste>,
  ): string => {
    const parts: string[] = [];
    formula.forEach((term, idx) => {
      if (term.op === '(' || term.op === ')') {
        parts.push(term.op);
      } else if (term.poste_id) {
        const p = postesById.get(term.poste_id);
        const code = p?.code || '?';
        if (idx === 0 || (idx > 0 && formula[idx - 1]?.op === '(')) {
          if (term.op === '+') parts.push(code);
          else parts.push(term.op + code);
        } else {
          parts.push(term.op);
          parts.push(code);
        }
      }
    });
    return parts
      .join(' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Maps utilitaires (réutilise postesForFormula déclaré plus haut)
  const postesByCode = React.useMemo(() => {
    const m = new Map<string, Poste>();
    postesForFormula.forEach((p) => m.set(p.code, p));
    return m;
  }, [postesForFormula]);
  const postesById = React.useMemo(() => {
    const m = new Map<string, Poste>();
    postesForFormula.forEach((p) => m.set(p.id, p));
    return m;
  }, [postesForFormula]);

  // Parse live
  const parsedFormula = React.useMemo(
    () => parseFormulaText(formulaText, postesByCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formulaText, postesByCode],
  );

  // Détecte le token identifiant courant à la position du caret (pour autocomplete)
  const currentIdentToken = React.useMemo(() => {
    const toks = tokenizeFormula(formulaText);
    return toks.find((t) => t.type === 'ident' && formulaCaret > t.pos && formulaCaret <= t.pos + t.len) || null;
  }, [formulaText, formulaCaret]);

  const autocompleteSuggestions = React.useMemo(() => {
    if (!currentIdentToken || currentIdentToken.type !== 'ident') return [] as Poste[];
    const q = currentIdentToken.value.toLowerCase();
    if (!q) return [] as Poste[];
    const allowed = new Set(selectablePostesForFormula.map(({ poste }) => poste.id));
    return postesForFormula
      .filter((p) => allowed.has(p.id) && (p.code.toLowerCase().startsWith(q) || p.code.toLowerCase().includes(q) || p.libelle.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [currentIdentToken, postesForFormula, selectablePostesForFormula]);

  // Sync parents_formula depuis le texte (pour le submit)
  useEffect(() => {
    if (formData.calculation_mode !== 'parents_formula') return;
    if (parsedFormula.errors.length > 0) return;
    const a = JSON.stringify(parsedFormula.parents_formula);
    const b = JSON.stringify(formData.parents_formula || []);
    if (a !== b) {
      setFormData((prev) => ({ ...prev, parents_formula: parsedFormula.parents_formula }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulaText, formData.calculation_mode]);

  // Sync formulaText depuis parents_formula à l'ouverture / edit
  useEffect(() => {
    if (!showForm) return;
    const text = formatFormulaToText(formData.parents_formula || [], postesById);
    setFormulaText(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, editingPoste?.id]);

  const insertSuggestion = (p: Poste) => {
    if (!currentIdentToken) return;
    const before = formulaText.slice(0, currentIdentToken.pos);
    const after = formulaText.slice(currentIdentToken.pos + currentIdentToken.len);
    const next = `${before}${p.code}${after}`;
    setFormulaText(next);
    const newCaret = currentIdentToken.pos + p.code.length;
    setTimeout(() => {
      if (formulaInputRef.current) {
        formulaInputRef.current.focus();
        formulaInputRef.current.setSelectionRange(newCaret, newCaret);
        setFormulaCaret(newCaret);
      }
    }, 0);
    setSuggestionIndex(0);
  };

  // Auto-expand les noeuds quand on cherche
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedNodes(new Set(collectAllIds(filteredTree)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleExpandAll = () => {
    setExpandedNodes(new Set(collectAllIds(tree as (Poste & { children?: Poste[] })[])));
  };
  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const valuesSections = [
    { key: 'bilan_actif', label: 'Bilan Actif' },
    { key: 'bilan_passif', label: 'Bilan Passif' },
    { key: 'hors_bilan', label: 'Hors bilan' },
    { key: 'cr_produit', label: 'Compte de résultat' },
    { key: 'cr_exploitation', label: "Comptes d'exploitations bancaires" },
    { key: 'cr_charge', label: 'Ratio Caracteristique de Gestion' },
  ];

  return (
    <div>
      {showHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
            📋 Postes réglementaires
          </h3>
          {showCreateButton && (
            <button
              onClick={() => {
                resetForm(typeFilter);
                setShowForm(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              ➕ Créer un poste
            </button>
          )}
        </div>
      )}

      {!showHeader && showCreateButton && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => {
              resetForm(typeFilter);
              setShowForm(true);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ➕ Créer un poste
          </button>
        </div>
      )}

      {mode !== 'postesOnly' && (
        <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1rem', border: '1px solid #3B82F6', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: '700', color: '#fff' }}>{n1Label} / Réalisation</div>
            <button
              type="button"
              onClick={() => setShowExerciceBlock((v) => !v)}
              style={{
                padding: '0.5rem 1rem',
                background: '#1D4ED8',
                color: '#E2E8F0',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              {showExerciceBlock ? '✖ Fermer' : '▶ Ouvrir'}
            </button>
          </div>

          {showExerciceBlock && (
            <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Exercice</label>
                <input
                  type="number"
                  value={selectedExercice}
                  onChange={(e) => setSelectedExercice(e.target.value)}
                  style={{ width: '160px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                  placeholder="2025"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Date N-1 (référence)</label>
                <input
                  type="date"
                  value={n1ReferenceDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setN1ReferenceDate(next);
                    if (typeof window !== 'undefined') {
                      const key = `pcb_n1_reference_date_${selectedExercice}`;
                      if (next) localStorage.setItem(key, next);
                      else localStorage.removeItem(key);
                    }
                  }}
                  style={{ width: '200px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Date de réalisation (référence)</label>
                <input
                  type="date"
                  value={realisationReferenceDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRealisationReferenceDate(next);
                    if (typeof window !== 'undefined') {
                      const key = `pcb_realisation_reference_date_${selectedExercice}`;
                      localStorage.setItem(key, next);
                    }
                  }}
                  style={{ width: '200px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                />
              </div>
              <button
                onClick={handleSaveExerciceValues}
                disabled={savingValues || leafPostes.length === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1D4ED8',
                  color: '#E2E8F0',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: savingValues ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: savingValues || leafPostes.length === 0 ? 0.7 : 1,
                }}
              >
                {savingValues ? 'Enregistrement...' : `Enregistrer ${n1Label} / Réalisation`}
              </button>
            </div>

            {tree.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {mode === 'valuesOnly' && !typeFilter ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {valuesSections.map((section) => {
                      const sectionPostes = postes.filter((p) => p.type === section.key);
                      const sectionTree = buildTree(sectionPostes);
                      if (sectionTree.length === 0) return null;
                      return (
                        <div key={section.key} style={{ background: '#0B1026', borderRadius: '12px', border: '1px solid #3B82F6', padding: '1rem' }}>
                          <div style={{ fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>{section.label}</div>
                          <div>
                            {sectionTree.map((node) => renderValuesTreeNode(node))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  tree.map((node) => renderValuesTreeNode(node))
                )}
              </div>
            )}
            </>
          )}
        </div>
      )}

      {mode !== 'valuesOnly' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)',
                borderRadius: '14px',
                borderTop: '1px solid rgba(27,58,140,0.4)',
                borderRight: '1px solid rgba(27,58,140,0.4)',
                borderBottom: '1px solid rgba(27,58,140,0.4)',
                borderLeft: '3px solid #C9A84C',
                boxShadow: '0 0 24px rgba(27,58,140,0.12)',
                overflow: 'hidden',
              }}
            >
              {/* Barre de recherche + actions globales */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid rgba(27,58,140,0.35)',
                  background: 'rgba(7,14,40,0.55)',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#C9A84C',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un poste (code ou libellé)…"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.1rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(27,58,140,0.5)',
                      background: 'rgba(11,16,38,0.7)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(27,58,140,0.5)')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Effacer la recherche"
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    style={{
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(27,58,140,0.35)',
                      color: '#C9A84C',
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Tout ouvrir
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    style={{
                      padding: '0.55rem 0.85rem',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    Tout fermer
                  </button>
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.5)',
                    padding: '0.4rem 0.7rem',
                    background: 'rgba(7,14,40,0.5)',
                    borderRadius: '8px',
                    border: '1px solid rgba(27,58,140,0.3)',
                    fontWeight: 600,
                  }}
                >
                  {searchQuery ? `${collectAllIds(filteredTree).length} / ${postes.length}` : `${postes.length} poste${postes.length > 1 ? 's' : ''}`}
                </div>
              </div>

              <div style={{ padding: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                {filteredTree.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
                    {searchQuery
                      ? `Aucun poste ne correspond à « ${searchQuery} »`
                      : 'Aucun poste réglementaire. Créez-en un pour commencer.'}
                  </div>
                ) : (
                  filteredTree.map((node) => renderTreeNode(node))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de formulaire */}
      {mode !== 'valuesOnly' && showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,8,22,0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #070E28 0%, #0F1E48 60%, #0A1434 100%)',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 32px rgba(27,58,140,0.25)',
              marginTop: '2rem',
              borderTop: '2px solid rgba(27,58,140,0.4)',
              borderRight: '2px solid rgba(27,58,140,0.4)',
              borderBottom: '2px solid rgba(27,58,140,0.4)',
              borderLeft: '4px solid #C9A84C',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem 1rem',
                borderBottom: '1px solid rgba(27,58,140,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 100%)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 6px 18px rgba(27,58,140,0.4)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Poste réglementaire
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  {editingPoste ? 'Modifier le poste' : 'Créer un poste'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Fermer"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '2px',
                padding: '0 1.5rem',
                borderBottom: '1px solid rgba(27,58,140,0.35)',
                flexShrink: 0,
                overflowX: 'auto',
              }}
            >
              {([
                { key: 'identity', label: 'Identité', icon: (<><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" /></>) },
                { key: 'hierarchy', label: 'Hiérarchie', icon: (<><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4M5 17L12 11M19 17L12 11" /></>) },
                { key: 'computation', label: 'Calcul', icon: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>) },
                { key: 'gl', label: 'GL associés', icon: (<><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></>) },
              ] as const).map((t) => {
                const active = formTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormTab(t.key)}
                    style={{
                      padding: '0.8rem 1rem',
                      background: 'transparent',
                      color: active ? '#C9A84C' : 'rgba(255,255,255,0.55)',
                      border: 'none',
                      borderBottom: `2px solid ${active ? '#C9A84C' : 'transparent'}`,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      {t.icon}
                    </svg>
                    {t.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
            >
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                {/* Tab : Identité */}
                {formTab === 'identity' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code *</label>
                        <input
                          type="text"
                          required
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ordre *</label>
                        <input
                          type="number"
                          required
                          value={formData.ordre}
                          onChange={(e) => setFormData({ ...formData, ordre: Number(e.target.value) })}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Libellé *</label>
                      <input
                        type="text"
                        required
                        value={formData.libelle}
                        onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}

                {/* Tab : Hiérarchie */}
                {formTab === 'hierarchy' && (
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Poste parent (optionnel)</label>
                      <select
                        value={formData.parent_id}
                        onChange={(e) => handleParentChange(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', colorScheme: 'dark', outline: 'none' }}
                      >
                        <option value="" style={{ background: '#0B1026', color: '#fff' }}>Aucun (poste principal)</option>
                        {selectablePostes.map(({ poste, level }) => {
                          const isSelf = editingPoste?.id === poste.id;
                          const isDescendant = disabledParentIds.has(poste.id);
                          return (
                            <option
                              key={poste.id}
                              value={poste.id}
                              disabled={!!isSelf || !!isDescendant}
                              style={{ background: '#0B1026', color: '#fff' }}
                            >
                              {`${'— '.repeat(level)}${poste.code} - ${poste.libelle}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {!!formData.parent_id && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contribution au parent</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[{ v: '+', label: 'Ajouter (+)' }, { v: '-', label: 'Soustraire (−)' }].map(({ v, label }) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setFormData({ ...formData, contribution_signe: v as '+' | '-' })}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '10px',
                                border: `1px solid ${formData.contribution_signe === v ? '#C9A84C' : 'rgba(27,58,140,0.5)'}`,
                                background: formData.contribution_signe === v ? 'rgba(201,168,76,0.15)' : 'rgba(11,16,38,0.7)',
                                color: formData.contribution_signe === v ? '#C9A84C' : 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!formData.parent_id && (
                      <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: 'rgba(27,58,140,0.15)', border: '1px solid rgba(201,168,76,0.25)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                        Ce poste sera créé comme <strong style={{ color: '#C9A84C' }}>poste principal</strong> (racine de la hiérarchie).
                      </div>
                    )}
                  </div>
                )}

                {/* Tab : Calcul */}
                {formTab === 'computation' && (
                  <div>
                    {canHaveParentsFormula && isRootPoste && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mode de calcul</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[{ v: 'gl', label: 'Par GL' }, { v: 'parents_formula', label: 'Par formule (+ − × ÷)' }].map(({ v, label }) => (
                            <button
                              key={v}
                              type="button"
                              disabled={!canUseParentsFormula && v === 'parents_formula'}
                              onClick={() => setFormData({ ...formData, calculation_mode: v as 'gl' | 'parents_formula' })}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: '10px',
                                border: `1px solid ${formData.calculation_mode === v ? '#C9A84C' : 'rgba(27,58,140,0.5)'}`,
                                background: formData.calculation_mode === v ? 'rgba(201,168,76,0.15)' : 'rgba(11,16,38,0.7)',
                                color: formData.calculation_mode === v ? '#C9A84C' : 'rgba(255,255,255,0.7)',
                                cursor: (!canUseParentsFormula && v === 'parents_formula') ? 'not-allowed' : 'pointer',
                                opacity: (!canUseParentsFormula && v === 'parents_formula') ? 0.5 : 1,
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {canHaveParentsFormula && isRootPoste && formData.calculation_mode === 'parents_formula' && (
                      <div style={{ marginBottom: '1rem', position: 'relative' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Formule (postes parents)
                        </label>

                        <div style={{ position: 'relative' }}>
                          <input
                            ref={formulaInputRef}
                            type="text"
                            value={formulaText}
                            onChange={(e) => {
                              setFormulaText(e.target.value);
                              setFormulaCaret(e.target.selectionStart || 0);
                              setSuggestionIndex(0);
                            }}
                            onKeyUp={(e) => setFormulaCaret((e.target as HTMLInputElement).selectionStart || 0)}
                            onClick={(e) => setFormulaCaret((e.target as HTMLInputElement).selectionStart || 0)}
                            onKeyDown={(e) => {
                              if (autocompleteSuggestions.length === 0) return;
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSuggestionIndex((i) => (i + 1) % autocompleteSuggestions.length);
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSuggestionIndex((i) => (i - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length);
                              } else if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                insertSuggestion(autocompleteSuggestions[suggestionIndex]);
                              } else if (e.key === 'Escape') {
                                setSuggestionIndex(-1);
                              }
                            }}
                            placeholder="Ex : (101 + 102) / 200"
                            spellCheck={false}
                            autoComplete="off"
                            style={{
                              width: '100%',
                              padding: '0.85rem 1rem',
                              borderRadius: '12px',
                              border: `1px solid ${parsedFormula.errors.length > 0 ? 'rgba(248,113,113,0.5)' : 'rgba(27,58,140,0.5)'}`,
                              background: 'rgba(11,16,38,0.85)',
                              color: '#C9A84C',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              outline: 'none',
                              letterSpacing: '0.02em',
                            }}
                            onFocus={(e) => {
                              if (parsedFormula.errors.length === 0) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)';
                            }}
                            onBlur={(e) => {
                              if (parsedFormula.errors.length === 0) e.currentTarget.style.borderColor = 'rgba(27,58,140,0.5)';
                              setTimeout(() => setSuggestionIndex(-1), 150);
                            }}
                          />

                          {autocompleteSuggestions.length > 0 && suggestionIndex >= 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                background: 'linear-gradient(135deg, #0F1E48 0%, #070E28 100%)',
                                border: '1px solid rgba(201,168,76,0.4)',
                                borderRadius: '10px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                zIndex: 10,
                                overflow: 'hidden',
                                maxHeight: '240px',
                                overflowY: 'auto',
                              }}
                            >
                              {autocompleteSuggestions.map((p, i) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    insertSuggestion(p);
                                  }}
                                  onMouseEnter={() => setSuggestionIndex(i)}
                                  style={{
                                    width: '100%',
                                    padding: '0.6rem 0.85rem',
                                    background: i === suggestionIndex ? 'rgba(201,168,76,0.15)' : 'transparent',
                                    border: 'none',
                                    borderBottom: i < autocompleteSuggestions.length - 1 ? '1px solid rgba(27,58,140,0.3)' : 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      color: '#C9A84C',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      background: 'rgba(201,168,76,0.1)',
                                      border: '1px solid rgba(201,168,76,0.3)',
                                      flexShrink: 0,
                                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    }}
                                  >
                                    {p.code}
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.libelle}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {parsedFormula.errors.length > 0 && (
                          <div
                            style={{
                              marginTop: '0.55rem',
                              padding: '0.6rem 0.8rem',
                              borderRadius: '8px',
                              background: 'rgba(220,38,38,0.1)',
                              border: '1px solid rgba(248,113,113,0.3)',
                              fontSize: '0.75rem',
                              color: '#FCA5A5',
                              lineHeight: 1.5,
                            }}
                          >
                            {parsedFormula.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}

                        {parsedFormula.errors.length === 0 && parsedFormula.parents_formula.length > 0 && (
                          <div
                            style={{
                              marginTop: '0.55rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '10px',
                              background: 'rgba(5,150,105,0.08)',
                              border: '1px solid rgba(52,211,153,0.25)',
                            }}
                          >
                            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#6EE7B7', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                              Postes référencés
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {Array.from(
                                new Set(
                                  parsedFormula.parents_formula
                                    .filter((t) => t.poste_id)
                                    .map((t) => t.poste_id as string),
                                ),
                              ).map((pid) => {
                                const p = postesById.get(pid);
                                if (!p) return null;
                                return (
                                  <div
                                    key={pid}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '6px',
                                      background: 'rgba(27,58,140,0.35)',
                                      border: '1px solid rgba(201,168,76,0.3)',
                                      fontSize: '0.7rem',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <span style={{ color: '#C9A84C', fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{p.code}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {p.libelle}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {['+', '−', '×', '÷', '(', ')'].map((sym) => {
                            const op = sym === '−' ? '-' : sym === '×' ? '*' : sym === '÷' ? '/' : sym;
                            return (
                              <button
                                key={sym}
                                type="button"
                                onClick={() => {
                                  const caret = formulaCaret || formulaText.length;
                                  const before = formulaText.slice(0, caret);
                                  const after = formulaText.slice(caret);
                                  const needSpaceBefore = before.length > 0 && !/\s$/.test(before) && !/[(]$/.test(before);
                                  const inserted = `${needSpaceBefore ? ' ' : ''}${op}${op !== '(' && op !== ')' ? ' ' : ''}`;
                                  setFormulaText(`${before}${inserted}${after}`);
                                  const newCaret = caret + inserted.length;
                                  setTimeout(() => {
                                    if (formulaInputRef.current) {
                                      formulaInputRef.current.focus();
                                      formulaInputRef.current.setSelectionRange(newCaret, newCaret);
                                      setFormulaCaret(newCaret);
                                    }
                                  }, 0);
                                }}
                                style={{
                                  width: '36px',
                                  height: '32px',
                                  background: 'rgba(27,58,140,0.35)',
                                  color: '#C9A84C',
                                  border: '1px solid rgba(201,168,76,0.3)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                }}
                              >
                                {sym}
                              </button>
                            );
                          })}
                          {formulaText && (
                            <button
                              type="button"
                              onClick={() => setFormulaText('')}
                              style={{
                                marginLeft: 'auto',
                                padding: '0 0.75rem',
                                height: '32px',
                                background: 'rgba(248,113,113,0.1)',
                                color: '#F87171',
                                border: '1px solid rgba(248,113,113,0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                              }}
                            >
                              Effacer
                            </button>
                          )}
                        </div>

                        <p style={{ margin: '0.65rem 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                          Tapez les codes de postes directement (ex. <code style={{ color: '#C9A84C' }}>101</code>) et utilisez <code style={{ color: '#C9A84C' }}>+ − × ÷ ( )</code> pour les opérations. L&apos;autocomplétion apparaît pendant la saisie.
                        </p>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Règle sur le NET (poste GL)</label>
                      <select
                        value={formData.formule}
                        onChange={(e) => setFormData({ ...formData, formule: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', colorScheme: 'dark', outline: 'none' }}
                      >
                        <option value="somme">NET normal</option>
                        <option value="net_clamp_zero">Si NET &lt; 0 alors 0 sinon NET</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab : GL associés */}
                {formTab === 'gl' && (
                  <div>
                    <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        GL associés ({formData.gl_codes.length})
                      </label>
                      <button
                        type="button"
                        onClick={addGLMapping}
                        style={{ padding: '0.5rem 0.9rem', background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 100%)', color: '#fff', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                      >
                        + Ajouter un GL
                      </button>
                    </div>

                    {formData.gl_codes.length === 0 && (
                      <div style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '10px', background: 'rgba(27,58,140,0.12)', border: '1px dashed rgba(201,168,76,0.3)', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        Aucun GL associé. Cliquez sur « + Ajouter un GL » pour commencer.
                      </div>
                    )}

                    {formData.gl_codes.map((glMapping, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={glMapping.code}
                          onChange={(e) => updateGLMapping(index, 'code', e.target.value)}
                          style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', outline: 'none' }}
                          placeholder="Code GL (ex: 101011)"
                        />
                        <select
                          value={glMapping.signe}
                          onChange={(e) => updateGLMapping(index, 'signe', e.target.value)}
                          style={{ width: '72px', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(27,58,140,0.5)', color: '#fff', background: 'rgba(11,16,38,0.7)', colorScheme: 'dark' }}
                        >
                          <option value="+">+</option>
                          <option value="-">−</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeGLMapping(index)}
                          style={{ padding: '0.6rem 0.75rem', background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      Astuce : vous pouvez coller plusieurs codes séparés par des virgules dans un seul champ pour les ajouter d&apos;un coup.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid rgba(27,58,140,0.35)',
                  background: 'rgba(7,14,40,0.85)',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{ padding: '0.75rem 1.4rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.6rem', background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 6px 20px rgba(27,58,140,0.4), 0 0 0 1px rgba(201,168,76,0.3)' }}
                >
                  {editingPoste ? 'Enregistrer' : 'Créer le poste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostesReglementairesTab;
