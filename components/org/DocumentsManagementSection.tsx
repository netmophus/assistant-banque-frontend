'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface OrgDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  category: string;
  subcategory?: string;
  tags: string[];
  description?: string;
  upload_date: string;
  uploaded_by: string;
  status: string;
  total_chunks: number;
  organization_id: string;
  departments?: Array<{ id: string; name: string; code: string }>;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Category {
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = { backgroundColor: '#1e293b', color: '#fff' };
const OPTION_STYLE: React.CSSProperties = { backgroundColor: '#1e293b', color: '#fff' };

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'En attente',  cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    processing: { label: 'Traitement', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    processed:  { label: 'Indexé',     cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    indexed:    { label: 'Indexé',     cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    error:      { label: 'Erreur',     cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };
  const c = cfg[status] ?? { label: status, cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function FileIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { pdf: '📄', word: '📝', excel: '📊', image: '🖼️' };
  return <span className="text-2xl">{icons[type] ?? '📁'}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentsManagementSection() {
  const [documents, setDocuments] = useState<OrgDocument[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Category state
  const [newCatName, setNewCatName] = useState('');
  const [catCreating, setCatCreating] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  // ── Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: '', subcategory: '', tags: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit doc modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<OrgDocument | null>(null);
  const [editForm, setEditForm] = useState({ category: '', subcategory: '', tags: [] as string[], description: '' });

  // ── Assign departments modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDepts, setAssignDepts] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [docsRes, deptsRes, catsRes] = await Promise.all([
        apiClient.get<{ documents: OrgDocument[] }>('/documents?limit=100&skip=0'),
        apiClient.get<Department[]>('/departments').catch(() => []),
        apiClient.get<Category[]>('/documents/categories').catch(() => []),
      ]);
      setDocuments(docsRes.documents ?? []);
      setDepartments(deptsRes ?? []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
    } catch (e: any) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  }

  // ── Category CRUD

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setCatCreating(true);
    try {
      await apiClient.post('/documents/categories', { name });
      setNewCatName('');
      const res = await apiClient.get<Category[]>('/documents/categories').catch(() => []);
      setCategories(Array.isArray(res) ? res : []);
      notify(`Catégorie "${name}" créée`);
    } catch (e: any) {
      notify(e?.message || 'Erreur création catégorie', true);
    } finally {
      setCatCreating(false);
    }
  }

  async function handleRenameCategory(oldName: string) {
    const newName = editCatName.trim();
    if (!newName || newName === oldName) { setEditingCat(null); return; }
    try {
      await apiClient.put(`/documents/categories/${encodeURIComponent(oldName)}`, { name: newName });
      const res = await apiClient.get<Category[]>('/documents/categories').catch(() => []);
      setCategories(Array.isArray(res) ? res : []);
      await fetchDocuments();
      setEditingCat(null);
      notify(`Catégorie renommée en "${newName}"`);
    } catch (e: any) {
      notify(e?.message || 'Erreur renommage catégorie', true);
    }
  }

  async function handleDeleteCategory(name: string) {
    setDeletingCat(name);
    try {
      await apiClient.delete(`/documents/categories/${encodeURIComponent(name)}`);
      const res = await apiClient.get<Category[]>('/documents/categories').catch(() => []);
      setCategories(Array.isArray(res) ? res : []);
      notify(`Catégorie "${name}" supprimée`);
    } catch (e: any) {
      notify(e?.message || 'Erreur suppression catégorie', true);
    } finally {
      setDeletingCat(null);
    }
  }

  // ── Documents

  async function fetchDocuments() {
    const res = await apiClient.get<{ documents: OrgDocument[] }>('/documents?limit=100&skip=0').catch(() => ({ documents: [] }));
    setDocuments(res.documents ?? []);
  }

  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif'];
    if (!allowed.includes(ext)) { notify('Type de fichier non supporté', true); return; }
    if (file.size > 50 * 1024 * 1024) { notify('Fichier trop volumineux (max 50 MB)', true); return; }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) { notify('Veuillez sélectionner un fichier', true); return; }
    if (!uploadForm.category) { notify('La catégorie est obligatoire', true); return; }
    setUploading(true);
    try {
      const extra: Record<string, string> = { category: uploadForm.category };
      if (uploadForm.subcategory) extra.subcategory = uploadForm.subcategory;
      if (uploadForm.tags) extra.tags = uploadForm.tags;
      if (uploadForm.description) extra.description = uploadForm.description;
      await apiClient.uploadFile('/documents/upload', selectedFile, extra);
      notify('Document uploadé avec succès. Indexation en cours…');
      setShowUploadModal(false);
      setUploadForm({ category: '', subcategory: '', tags: '', description: '' });
      setSelectedFile(null);
      fetchDocuments();
    } catch (e: any) {
      let msg = 'Erreur upload';
      if (e?.detail) msg = Array.isArray(e.detail) ? e.detail.map((d: any) => d.msg).join(', ') : e.detail;
      else if (e?.message) msg = e.message;
      notify(msg, true);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(id: string) {
    if (!confirm('Supprimer ce document définitivement ?')) return;
    try {
      await apiClient.delete(`/documents/${id}`);
      notify('Document supprimé');
      fetchDocuments();
    } catch (e: any) {
      notify(e?.message || 'Erreur suppression', true);
    }
  }

  function openEditDoc(doc: OrgDocument) {
    setSelectedDoc(doc);
    setEditForm({ category: doc.category, subcategory: doc.subcategory ?? '', tags: doc.tags ?? [], description: doc.description ?? '' });
    setShowEditModal(true);
  }

  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await apiClient.put(`/documents/${selectedDoc.id}`, editForm);
      notify('Document modifié');
      setShowEditModal(false);
      fetchDocuments();
    } catch (e: any) {
      notify(e?.message || 'Erreur modification', true);
    }
  }

  function openAssignDoc(doc: OrgDocument) {
    setSelectedDoc(doc);
    setAssignDepts(doc.departments?.map(d => d.id) ?? []);
    setShowAssignModal(true);
  }

  async function handleSubmitAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      await apiClient.post(`/documents/${selectedDoc.id}/assign-departments`, { department_ids: assignDepts });
      notify('Départements assignés');
      setShowAssignModal(false);
      fetchDocuments();
    } catch (e: any) {
      notify(e?.message || 'Erreur assignation', true);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#CBD5E1]">
        <svg className="animate-spin w-6 h-6 mr-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-start gap-3">
          <span className="text-lg">✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 1 — Gestion des catégories
      ══════════════════════════════════════════════════════════════════════ */}
      <ScrollReveal direction="up" delay={0}>
        <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#7C3AED]/5 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#7C3AED]/30 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-sm font-bold text-[#7C3AED]">1</div>
            <div>
              <h2 className="text-xl font-bold text-white">Catégories de documents</h2>
              <p className="text-sm text-[#CBD5E1]">Créez vos catégories avant d'uploader des documents</p>
            </div>
          </div>

          {/* Créer une catégorie */}
          <div className="flex gap-3 mb-5">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              placeholder="Nom de la nouvelle catégorie…"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/60 focus:border-transparent transition-all"
            />
            <button
              onClick={handleCreateCategory}
              disabled={catCreating || !newCatName.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {catCreating ? '…' : '+ Créer'}
            </button>
          </div>

          {/* Liste des catégories */}
          {categories.length === 0 ? (
            <div className="text-center py-8 text-[#CBD5E1]/60 text-sm">
              Aucune catégorie — créez-en une pour commencer
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const docCount = documents.filter(d => d.category === cat.name).length;
                return (
                  <div key={cat.name} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-[#7C3AED]/30 transition-all group">
                    {editingCat === cat.name ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCategory(cat.name);
                            if (e.key === 'Escape') setEditingCat(null);
                          }}
                          className="flex-1 px-2 py-1 bg-white/10 border border-[#7C3AED]/40 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                        />
                        <button onClick={() => handleRenameCategory(cat.name)} className="text-green-400 hover:text-green-300 text-xs font-semibold px-2 py-1">✓</button>
                        <button onClick={() => setEditingCat(null)} className="text-[#CBD5E1] hover:text-white text-xs px-1">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-[#7C3AED] text-lg">🏷️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{cat.name}</p>
                          <p className="text-[#CBD5E1]/60 text-xs">{docCount} document{docCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingCat(cat.name); setEditCatName(cat.name); }}
                            className="p-1.5 text-[#CBD5E1] hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Renommer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.name)}
                            disabled={deletingCat === cat.name || docCount > 0}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={docCount > 0 ? `${docCount} document(s) dans cette catégorie` : 'Supprimer'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* ══════════════════════════════════════════════════════════════════════
          ÉTAPE 2 — Documents
      ══════════════════════════════════════════════════════════════════════ */}
      <ScrollReveal direction="up" delay={100}>
        <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-sm font-bold text-[#2563EB]">2</div>
              <div>
                <h2 className="text-xl font-bold text-white">Documents organisationnels</h2>
                <p className="text-sm text-[#CBD5E1]">{documents.length} document{documents.length !== 1 ? 's' : ''} indexé{documents.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadForm({ category: categories[0]?.name ?? '', subcategory: '', tags: '', description: '' });
                setSelectedFile(null);
                setShowUploadModal(true);
              }}
              disabled={categories.length === 0}
              className="group relative px-5 py-2.5 text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={categories.length === 0 ? 'Créez une catégorie d\'abord' : ''}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] opacity-90 group-hover:opacity-100 pointer-events-none" />
              <span className="relative z-10 font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Uploader
              </span>
            </button>
          </div>

          {categories.length === 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              ⚠️ Créez au moins une catégorie (étape 1) avant d'uploader des documents.
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📁</div>
              <p className="text-[#CBD5E1] mb-2">Aucun document pour le moment</p>
              <p className="text-[#CBD5E1]/50 text-sm">Uploadez votre premier document ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-[20px] border border-white/10 hover:border-[#2563EB]/30 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <FileIcon type={doc.file_type} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-semibold text-sm truncate max-w-xs">{doc.original_filename}</h3>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#CBD5E1]/70">
                      <span>🏷️ {doc.category}</span>
                      {doc.subcategory && <span>└ {doc.subcategory}</span>}
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{doc.total_chunks} chunks</span>
                      {doc.departments && doc.departments.length > 0 && (
                        <span>🏢 {doc.departments.map(d => d.name).join(', ')}</span>
                      )}
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {doc.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#2563EB]/15 text-[#60A5FA] rounded-full text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditDoc(doc)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#2563EB] rounded-lg border border-[#2563EB]/30 text-xs font-semibold transition-all"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => openAssignDoc(doc)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#7C3AED] rounded-lg border border-[#7C3AED]/30 text-xs font-semibold transition-all"
                    >
                      Assigner
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-xs font-semibold transition-all"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Upload
      ══════════════════════════════════════════════════════════════════════ */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0a1628] rounded-[28px] border border-[#1e40af]/50 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Uploader un document</h3>
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); setError(null); }}
                  className="text-[#CBD5E1] hover:text-white transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className="space-y-4">

                {/* Zone drop */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                    dragActive ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  }`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <div className="text-3xl">✅</div>
                      <p className="text-white font-semibold text-sm">{selectedFile.name}</p>
                      <p className="text-[#CBD5E1]/70 text-xs">{formatFileSize(selectedFile.size)}</p>
                      <p className="text-[#2563EB] text-xs mt-1">Cliquer pour changer de fichier</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-3xl">📁</div>
                      <p className="text-white font-medium text-sm">Glissez un fichier ou cliquez pour sélectionner</p>
                      <p className="text-[#CBD5E1]/60 text-xs">PDF, Word, Excel, Images — max 50 MB</p>
                    </div>
                  )}
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Catégorie <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                    style={SELECT_STYLE}
                  >
                    <option value="" style={OPTION_STYLE}>Sélectionner une catégorie…</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name} style={OPTION_STYLE}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sous-catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Sous-catégorie</label>
                  <input
                    type="text"
                    value={uploadForm.subcategory}
                    onChange={(e) => setUploadForm({ ...uploadForm, subcategory: e.target.value })}
                    placeholder="Ex : Crédit, Recouvrement"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1]/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tags <span className="text-[#CBD5E1]/50 font-normal">(séparés par des virgules)</span></label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="Ex : réglementation, procédure, risque"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1]/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    rows={2}
                    placeholder="Brève description du document"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#CBD5E1]/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !uploadForm.category}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Enregistrement…
                      </span>
                    ) : 'Enregistrer le document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Modifier document
      ══════════════════════════════════════════════════════════════════════ */}
      {showEditModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0a1628] rounded-[28px] border border-[#1e40af]/50 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Modifier le document</h3>
                <button onClick={() => setShowEditModal(false)} className="text-[#CBD5E1] hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Catégorie <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                    style={SELECT_STYLE}
                  >
                    <option value="" style={OPTION_STYLE}>Sélectionner…</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name} style={OPTION_STYLE}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Sous-catégorie</label>
                  <input
                    type="text"
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tags <span className="text-[#CBD5E1]/50 font-normal">(séparés par des virgules)</span></label>
                  <input
                    type="text"
                    value={editForm.tags.join(', ')}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-xl hover:opacity-90 transition-all">
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Assigner départements
      ══════════════════════════════════════════════════════════════════════ */}
      {showAssignModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0a1628] rounded-[28px] border border-[#1e40af]/50 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Assigner aux départements</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-[#CBD5E1] hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-[#CBD5E1] text-sm mb-4">
                Document : <span className="text-white font-medium">{selectedDoc.original_filename}</span>
              </p>

              <form onSubmit={handleSubmitAssign} className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {departments.length === 0 ? (
                    <p className="text-[#CBD5E1]/60 text-sm text-center py-4">Aucun département disponible</p>
                  ) : departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-[#2563EB]/30 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={assignDepts.includes(dept.id)}
                        onChange={(e) => {
                          setAssignDepts(e.target.checked
                            ? [...assignDepts, dept.id]
                            : assignDepts.filter(id => id !== dept.id)
                          );
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0"
                      />
                      <span className="text-white text-sm">{dept.name}</span>
                      <span className="text-[#CBD5E1]/50 text-xs ml-auto">{dept.code}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] text-white font-semibold rounded-xl hover:opacity-90 transition-all">
                    Assigner
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
