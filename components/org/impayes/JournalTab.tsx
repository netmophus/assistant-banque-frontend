'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import Pagination from '@/components/common/Pagination';

interface ActionJournal {
  id: string;
  action_id: string;
  ref_credit: string;
  nom_client: string | null;
  type_action: string;
  description: string;
  montant: number | null;
  resultat: string | null;
  created_by: string;
  created_by_nom: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  appel: { label: 'Appel', icon: '📞', color: '#3b82f6' },
  sms_envoye: { label: 'SMS', icon: '📨', color: '#8b5cf6' },
  visite: { label: 'Visite', icon: '🏠', color: '#14b8a6' },
  courrier: { label: 'Courrier', icon: '✉️', color: '#6366f1' },
  promesse: { label: 'Promesse', icon: '🤝', color: '#f59e0b' },
  paiement: { label: 'Paiement', icon: '💰', color: '#22c55e' },
  escalade: { label: 'Escalade', icon: '⬆️', color: '#ef4444' },
  note: { label: 'Note', icon: '📝', color: '#9ca3af' },
  attribution: { label: 'Attribution', icon: '👤', color: '#ec4899' },
  restructuration: { label: 'Restructuration', icon: '🔄', color: '#f97316' },
};

const JournalTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actions, setActions] = useState<ActionJournal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 30;

  const [filtreType, setFiltreType] = useState('');
  const [filtreRef, setFiltreRef] = useState('');

  // Formulaire ajout
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ref_credit: '',
    type_action: '',
    description: '',
    montant: '',
    resultat: '',
  });

  useEffect(() => {
    loadJournal();
  }, [page, filtreType, filtreRef]);

  const loadJournal = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filtreType) params.set('type_action', filtreType);
      if (filtreRef) params.set('ref_credit', filtreRef);
      params.set('limit', String(limit));
      params.set('skip', String((page - 1) * limit));

      const data = await apiClient.get<any>(`/impayes/journal?${params}`);
      setActions(data.actions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ref_credit || !form.type_action || !form.description) {
      setError('Remplir les champs obligatoires');
      return;
    }
    try {
      setLoading(true);
      await apiClient.post('/impayes/journal', {
        ref_credit: form.ref_credit,
        type_action: form.type_action,
        description: form.description,
        montant: form.montant ? parseFloat(form.montant) : undefined,
        resultat: form.resultat || undefined,
      });
      setForm({ ref_credit: '', type_action: '', description: '', montant: '', resultat: '' });
      setShowForm(false);
      loadJournal();
    } catch (err: any) {
      setError(err.message || 'Erreur creation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 18px',
            background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          {showForm ? 'Fermer' : '+ Ajouter une action'}
        </button>
        <select value={filtreType} onChange={(e) => { setFiltreType(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="" style={selectOptionStyle}>Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k} style={selectOptionStyle}>{v.icon} {v.label}</option>
          ))}
        </select>
        <input
          value={filtreRef}
          onChange={(e) => setFiltreRef(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadJournal()}
          placeholder="Ref credit..."
          style={{ ...selectStyle, minWidth: '160px' }}
        />
        <button onClick={loadJournal} style={{ ...selectStyle, cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}>
          Filtrer
        </button>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{total} action{total > 1 ? 's' : ''}</span>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px', padding: '20px', marginBottom: '20px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
          }}
        >
          <div>
            <label style={labelStyle}>Ref credit *</label>
            <input value={form.ref_credit} onChange={(e) => setForm({ ...form, ref_credit: e.target.value })} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Type action *</label>
            <select value={form.type_action} onChange={(e) => setForm({ ...form, type_action: e.target.value })} style={inputStyle} required>
              <option value="" style={selectOptionStyle}>Choisir...</option>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k} style={selectOptionStyle}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Montant (FCFA)</label>
            <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Resultat</label>
            <input value={form.resultat} onChange={(e) => setForm({ ...form, resultat: e.target.value })} style={inputStyle} placeholder="Ex: promesse obtenue" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              placeholder="Details de l'action..."
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit" disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', marginBottom: '12px' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#CBD5E1' }}>Chargement...</div>
      ) : actions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucune action enregistree</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '6px' }}>
            {actions.map((a) => {
              const tc = TYPE_CONFIG[a.type_action] || { label: a.type_action, icon: '📋', color: '#9ca3af' };
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', gap: '12px', padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `3px solid ${tc.color}`,
                    borderRadius: '8px', alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', minWidth: '28px', textAlign: 'center' }}>{tc.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <div>
                        <span style={{ color: tc.color, fontWeight: '600', fontSize: '0.8rem', marginRight: '8px' }}>{tc.label}</span>
                        <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>{a.nom_client || a.ref_credit}</span>
                        {a.nom_client && (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '8px' }}>{a.ref_credit}</span>
                        )}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('fr-FR') : ''}
                        {a.created_by_nom && <span style={{ marginLeft: '8px' }}>par {a.created_by_nom}</span>}
                      </div>
                    </div>
                    <div style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>{a.description}</div>
                    {(a.montant || a.resultat) && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        {a.montant && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>{a.montant.toLocaleString()} FCFA</span>}
                        {a.resultat && <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>{a.resultat}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {total > limit && (
            <Pagination currentPage={page} totalItems={total} itemsPerPage={limit} currentItemsCount={actions.length} onPageChange={(p) => setPage(p)} />
          )}
        </>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = { color: '#CBD5E1', fontSize: '0.8rem', display: 'block', marginBottom: '4px' };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', width: '100%',
};
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem', cursor: 'pointer',
};
const selectOptionStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#fff',
};

export default JournalTab;
