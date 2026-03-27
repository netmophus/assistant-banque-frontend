'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

type Poste = {
  id: string;
  code: string;
  libelle: string;
  type: string;
};

type RatioGestionLine = {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  formule: string;
  unite: string;
  is_active: boolean;
  ordre_affichage: number;
};

type RatioGestionLineForm = {
  code: string;
  libelle: string;
  description: string;
  formule: string;
  unite: string;
  is_active: boolean;
  ordre_affichage: number;
};

const RatioGestionTab = () => {
  const { isMobile } = useResponsive();
  const [items, setItems] = useState<RatioGestionLine[]>([]);
  const [postesBilan, setPostesBilan] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<RatioGestionLine | null>(null);

  const [form, setForm] = useState<RatioGestionLineForm>({
    code: '',
    libelle: '',
    description: '',
    formule: '',
    unite: '%',
    is_active: true,
    ordre_affichage: 1,
  });

  const formuleRef = useRef<HTMLInputElement | null>(null);

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

  const fetchLines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pcb/ratio-gestion-lines', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPostesBilan = useCallback(async () => {
    try {
      const res = await fetch('/api/pcb/postes', { headers: getAuthHeaders() });
      if (!res.ok) {
        setPostesBilan([]);
        return;
      }

      const all = (await res.json()) as Poste[];
      const leafs = (all || [])
        .filter((p) => p && p.code && (p.type === 'bilan_actif' || p.type === 'bilan_passif'))
        .sort((a, b) => String(a.code).localeCompare(String(b.code)));

      setPostesBilan(leafs);
    } catch {
      setPostesBilan([]);
    }
  }, []);

  useEffect(() => {
    fetchLines();
    fetchPostesBilan();
  }, [fetchLines, fetchPostesBilan]);

  const resetForm = () => {
    setForm({
      code: '',
      libelle: '',
      description: '',
      formule: '',
      unite: '%',
      is_active: true,
      ordre_affichage: 1,
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowFormModal(true);
    setTimeout(() => {
      formuleRef.current?.focus();
    }, 0);
  };

  const openEdit = (item: RatioGestionLine) => {
    setEditing(item);
    setForm({
      code: item.code,
      libelle: item.libelle,
      description: item.description || '',
      formule: item.formule,
      unite: item.unite,
      is_active: item.is_active,
      ordre_affichage: item.ordre_affichage,
    });
    setShowFormModal(true);
    setTimeout(() => {
      formuleRef.current?.focus();
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/pcb/ratio-gestion-lines/${editing.id}` : '/api/pcb/ratio-gestion-lines';

      const payload = {
        ...form,
        organization_id: 'current',
      };

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erreur');

      alert(editing ? 'Ratio de gestion modifié avec succès !' : 'Ratio de gestion créé avec succès !');
      setShowFormModal(false);
      resetForm();
      fetchLines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ratio de gestion ?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/pcb/ratio-gestion-lines/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      fetchLines();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/pcb/ratio-gestion-lines/${id}/toggle?is_active=${String(!currentActive)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erreur');
      fetchLines();
    } catch (err) {
      alert('Erreur: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const insertInFormule = (token: string) => {
    const input = formuleRef.current;
    const current = form.formule || '';

    if (!input) {
      setForm((p) => ({ ...p, formule: (p.formule || '') + token }));
      return;
    }

    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);

    setForm((p) => ({ ...p, formule: next }));

    requestAnimationFrame(() => {
      input.focus();
      const pos = start + token.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const operatorButtons = useMemo(
    () => [
      { token: ' + ', label: '+' },
      { token: ' - ', label: '-' },
      { token: ' * ', label: '*' },
      { token: ' / ', label: '/' },
      { token: ' (', label: '(' },
      { token: ') ', label: ')' },
    ],
    []
  );

  return (
    <div style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#fff' }}>📈 Ratios de gestion</h4>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={openCreate}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          }}
        >
          ➕ Créer un ratio de gestion
        </button>
      </div>

      {error && <div style={{ color: '#e53e3e', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem' }}>
          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#0B1026', borderRadius: '12px', border: '1px solid #3B82F6', color: '#CBD5E1' }}>
              Aucun ratio de gestion.
            </div>
          ) : (
            items.map((it) => (
              <div key={it.id} style={{ padding: '1.5rem', background: '#0B1026', borderRadius: '12px', border: '1px solid #3B82F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{it.code}</div>
                    <div style={{ color: '#CBD5E1', fontWeight: '600', marginTop: '0.25rem' }}>{it.libelle}</div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(it.id, it.is_active)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      borderRadius: '6px',
                      border: `1px solid ${it.is_active ? '#c62828' : '#2e7d32'}`,
                      background: it.is_active ? 'rgba(198, 40, 40, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                      color: it.is_active ? '#c62828' : '#2e7d32',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      height: 'fit-content',
                    }}
                  >
                    {it.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>

                <div style={{ padding: '0.75rem', background: '#1E3A8A', borderRadius: '8px', border: '1px solid #3B82F6', color: '#CBD5E1', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Formule:</strong> {it.formule}
                  </div>
                  <div>
                    <strong>Unité:</strong> {it.unite}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => openEdit(it)}
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
                    onClick={() => handleDelete(it.id)}
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
            alignItems: 'flex-start',
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
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              margin: '1rem 0',
              border: '1px solid #3B82F6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{editing ? 'Modifier le ratio de gestion' : 'Créer un ratio de gestion'}</h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    disabled={!!editing}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                    placeholder="ex: TX_DEGRADATION_BRUT"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>Unité</label>
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>Libellé *</label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                  placeholder="ex: Taux brut de dégradation du portefeuille"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: '#CBD5E1' }}>Formule *</label>
                <input
                  ref={(el) => {
                    formuleRef.current = el;
                  }}
                  type="text"
                  value={form.formule}
                  onChange={(e) => setForm({ ...form, formule: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #3B82F6', background: '#1E3A8A', color: '#ffffff' }}
                  placeholder="ex: CREANCES_SOUFFRANCE_BRUTES / TOTAL_CREDITS_BRUTS"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {operatorButtons.map((op) => (
                    <button
                      type="button"
                      key={op.label}
                      onClick={() => insertInFormule(op.token)}
                      style={{
                        padding: '0.4rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #3B82F6',
                        background: '#0B1026',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>Postes du bilan (insérer dans la formule)</div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #3B82F6', borderRadius: '8px', background: '#0B1026' }}>
                  {postesBilan.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => insertInFormule(p.code)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 0.75rem',
                        border: 'none',
                        borderBottom: '1px solid #1E3A8A',
                        background: 'transparent',
                        color: '#E2E8F0',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#fff' }}>{p.code}</div>
                      <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>{p.libelle}</div>
                    </button>
                  ))}
                </div>
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
                  {editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatioGestionTab;
