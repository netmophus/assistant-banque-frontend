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
  const [selectedExercice, setSelectedExercice] = useState(String(new Date().getFullYear()));
  const [valuesByPosteId, setValuesByPosteId] = useState<Record<string, { n_1: number | null; budget: number | null }>>({});
  const [savingValues, setSavingValues] = useState(false);
  const [showExerciceBlock, setShowExerciceBlock] = useState(mode !== 'valuesOnly');
  const [realisationReferenceDate, setRealisationReferenceDate] = useState('');
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
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '600', color: '#CBD5E1', fontSize: '0.8rem' }}>N-1</label>
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
  }, [selectedExercice]);

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
            <div style={{ fontWeight: '700', color: '#fff' }}>N-1 / Réalisation</div>
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
                {savingValues ? 'Enregistrement...' : 'Enregistrer N-1 / Réalisation'}
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
            <div style={{ background: '#0B1026', borderRadius: '12px', padding: '1rem', border: '1px solid #3B82F6', maxHeight: '600px', overflowY: 'auto' }}>
              {tree.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
                  Aucun poste réglementaire. Créez-en un pour commencer.
                </div>
              ) : (
                tree.map((node) => renderTreeNode(node))
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de formulaire */}
      {mode !== 'valuesOnly' && showForm && (
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
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: '#0B1026',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '1px solid #3B82F6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>
              {editingPoste ? '✏️ Modifier le poste' : '➕ Créer un poste'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Code du poste *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Position / Ordre d'affichage *</label>
                <input
                  type="number"
                  required
                  value={formData.ordre}
                  onChange={(e) => setFormData({ ...formData, ordre: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Libellé *</label>
                <input
                  type="text"
                  required
                  value={formData.libelle}
                  onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Poste parent (optionnel)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => handleParentChange(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>Aucun (poste principal)</option>
                  {selectablePostes.map(({ poste, level }) => {
                    const isSelf = editingPoste?.id === poste.id;
                    const isDescendant = disabledParentIds.has(poste.id);
                    return (
                      <option
                        key={poste.id}
                        value={poste.id}
                        disabled={!!isSelf || !!isDescendant}
                        style={{ background: '#1E3A8A', color: '#ffffff' }}
                      >
                        {`${'— '.repeat(level)}${poste.code} - ${poste.libelle}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {!!formData.parent_id && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Contribution au parent</label>
                  <select
                    value={formData.contribution_signe}
                    onChange={(e) => setFormData({ ...formData, contribution_signe: (e.target.value as '+' | '-') || '+' })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                  >
                    <option value="+" style={{ background: '#1E3A8A', color: '#ffffff' }}>+ (ajouter)</option>
                    <option value="-" style={{ background: '#1E3A8A', color: '#ffffff' }}>- (soustraire)</option>
                  </select>
                </div>
              )}

              {canHaveParentsFormula && isRootPoste && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Mode de calcul</label>
                  <select
                    value={formData.calculation_mode}
                    onChange={(e) => setFormData({ ...formData, calculation_mode: (e.target.value as 'gl' | 'parents_formula') || 'gl' })}
                    disabled={!canUseParentsFormula}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark', opacity: canUseParentsFormula ? 1 : 0.8 }}
                  >
                    <option value="gl" style={{ background: '#1E3A8A', color: '#ffffff' }}>Par GL</option>
                    <option value="parents_formula" style={{ background: '#1E3A8A', color: '#ffffff' }}>Par formule (+ - * /)</option>
                  </select>
                </div>
              )}

              {canHaveParentsFormula && isRootPoste && formData.calculation_mode === 'parents_formula' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Formule (+ - * /) sur postes parents</label>

                  <div
                    style={{
                      marginBottom: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #3B82F6',
                      background: '#0B1026',
                      color: '#E2E8F0',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '0.85rem',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getParentsFormulaPreview()}
                  </div>

                  {(formData.parents_formula || []).map((term, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <select
                        value={term.op}
                        onChange={(e) => updateParentsFormulaTerm(index, 'op', e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                      >
                        <option value="+" style={{ background: '#1E3A8A', color: '#ffffff' }}>+</option>
                        <option value="-" style={{ background: '#1E3A8A', color: '#ffffff' }}>-</option>
                        <option value="*" style={{ background: '#1E3A8A', color: '#ffffff' }}>*</option>
                        <option value="/" style={{ background: '#1E3A8A', color: '#ffffff' }}>/</option>
                        <option value="(" style={{ background: '#1E3A8A', color: '#ffffff' }}>(</option>
                        <option value=")" style={{ background: '#1E3A8A', color: '#ffffff' }}>)</option>
                      </select>

                      {term.op !== '(' && term.op !== ')' && (
                        <select
                          value={term.poste_id || ''}
                          onChange={(e) => updateParentsFormulaTerm(index, 'poste_id', e.target.value)}
                          style={{ flex: 1, minWidth: 260, padding: '0.5rem', borderRadius: '6px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                        >
                          <option value="" style={{ background: '#1E3A8A', color: '#ffffff' }}>
                            (Opérateur seul)
                          </option>
                          {selectablePostesForFormula.map(({ poste, level }) => (
                            <option
                              key={poste.id}
                              value={poste.id}
                              disabled={!!disabledFormulaIds.has(poste.id)}
                              style={{ background: '#1E3A8A', color: '#ffffff' }}
                            >
                              {`${'— '.repeat(level)}${poste.code} - ${poste.libelle}`}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => removeParentsFormulaTerm(index)}
                        style={{ padding: '0.5rem 0.75rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addParentsFormulaTerm}
                    style={{ padding: '0.5rem 1rem', background: '#1B3A8C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    ➕ Ajouter un terme
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => addParentsFormulaToken('(')}
                      style={{ padding: '0.5rem 1rem', background: '#1D4ED8', color: '#E2E8F0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Ajouter (
                    </button>
                    <button
                      type="button"
                      onClick={() => addParentsFormulaToken(')')}
                      style={{ padding: '0.5rem 1rem', background: '#1D4ED8', color: '#E2E8F0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Ajouter )
                    </button>
                    <button
                      type="button"
                      onClick={() => addParentsFormulaToken('/')}
                      style={{ padding: '0.5rem 1rem', background: '#1D4ED8', color: '#E2E8F0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Ajouter /
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>Règle sur le NET (poste GL)</label>
                <select
                  value={formData.formule}
                  onChange={(e) => setFormData({ ...formData, formule: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                >
                  <option value="somme" style={{ background: '#1E3A8A', color: '#ffffff' }}>NET normal</option>
                  <option value="net_clamp_zero" style={{ background: '#1E3A8A', color: '#ffffff' }}>Si NET &lt; 0 alors 0 sinon NET</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#CBD5E1' }}>GL associés</label>
                {formData.gl_codes.map((glMapping, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={glMapping.code}
                      onChange={(e) => updateGLMapping(index, 'code', e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A' }}
                      placeholder="Code GL"
                    />
                    <select
                      value={glMapping.signe}
                      onChange={(e) => updateGLMapping(index, 'signe', e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #3B82F6', color: '#ffffff', background: '#1E3A8A', colorScheme: 'dark' }}
                    >
                      <option value="+" style={{ background: '#1E3A8A', color: '#ffffff' }}>+</option>
                      <option value="-" style={{ background: '#1E3A8A', color: '#ffffff' }}>-</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeGLMapping(index)}
                      style={{ padding: '0.5rem 0.75rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGLMapping}
                  style={{ padding: '0.5rem 1rem', background: '#1B3A8C', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  ➕ Ajouter un GL
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{ padding: '0.75rem 1.5rem', background: '#1D4ED8', color: '#E2E8F0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #1B3A8C 0%, #2e5bb8 50%, #C9A84C 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {editingPoste ? 'Modifier' : 'Créer'}
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
