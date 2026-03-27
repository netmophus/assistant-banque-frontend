'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import ScrollReveal from '@/components/home/ScrollReveal';

interface GlobalDocument {
  id: string;
  _id?: string;
  titre: string;
  original_filename: string;
  filename: string;
  file_type: string;
  file_size: number;
  category: string;
  subcategory?: string;
  description?: string;
  status: 'draft' | 'processing' | 'published' | 'archived' | 'error';
  total_chunks: number;
  upload_date: string;
  published_date?: string;
}

interface GlobalKnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  draft:      { label: 'Brouillon',   className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',   icon: '📝' },
  processing: { label: 'Traitement',  className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⏳' },
  published:  { label: 'Publié',      className: 'bg-green-500/20 text-green-400 border-green-500/30',  icon: '✅' },
  archived:   { label: 'Archivé',     className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',  icon: '🗂️' },
  error:      { label: 'Erreur',      className: 'bg-red-500/20 text-red-400 border-red-500/30',       icon: '❌' },
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '❓' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function GlobalKnowledgeSection() {
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [categories, setCategories] = useState<GlobalKnowledgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ titre: '', category: '', subcategory: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });
  const [savingCategory, setSavingCategory] = useState(false);

  // Per-document loading states
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ documents: GlobalDocument[]; total: number }>('/admin/global-knowledge?limit=100');
      setDocuments(res.documents || []);
    } catch (err: any) {
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get<GlobalKnowledgeCategory[]>('/admin/global-knowledge/categories?include_inactive=true');
      setCategories(Array.isArray(res) ? res : []);
    } catch {
      setCategories([]);
    }
  };

  const docId = (doc: GlobalDocument) => doc.id || doc._id || '';

  const setDocAction = (id: string, action: string) =>
    setActionLoading(prev => ({ ...prev, [id]: action }));
  const clearDocAction = (id: string) =>
    setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handlePublish = async (doc: GlobalDocument) => {
    const id = docId(doc);
    setDocAction(id, 'publish');
    setError(null);
    try {
      await apiClient.post(`/admin/global-knowledge/${id}/publish`, {});
      setSuccess(`"${doc.titre}" publié avec succès`);
      fetchDocuments();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la publication');
    } finally {
      clearDocAction(id);
    }
  };

  const handleArchive = async (doc: GlobalDocument) => {
    if (!confirm(`Archiver "${doc.titre}" ?`)) return;
    const id = docId(doc);
    setDocAction(id, 'archive');
    setError(null);
    try {
      await apiClient.post(`/admin/global-knowledge/${id}/archive`, {});
      setSuccess(`"${doc.titre}" archivé`);
      fetchDocuments();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'archivage');
    } finally {
      clearDocAction(id);
    }
  };

  const handleReindex = async (doc: GlobalDocument) => {
    const id = docId(doc);
    setDocAction(id, 'reindex');
    setError(null);
    try {
      await apiClient.post(`/admin/global-knowledge/${id}/reindex`, {});
      setSuccess(`"${doc.titre}" re-indexé avec succès`);
      fetchDocuments();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la re-indexation');
    } finally {
      clearDocAction(id);
    }
  };

  const handleDownload = async (doc: GlobalDocument) => {
    const id = docId(doc);
    setDocAction(id, 'download');
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/admin/global-knowledge/${id}/download`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Téléchargement échoué');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.original_filename || doc.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du téléchargement');
    } finally {
      clearDocAction(id);
    }
  };

  const handleDelete = async (doc: GlobalDocument) => {
    if (!confirm(`Supprimer définitivement "${doc.titre}" ?`)) return;
    const id = docId(doc);
    setDocAction(id, 'delete');
    setError(null);
    try {
      await apiClient.delete(`/admin/global-knowledge/${id}`);
      setSuccess(`"${doc.titre}" supprimé`);
      fetchDocuments();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression');
    } finally {
      clearDocAction(id);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) { setSelectedFile(null); return; }
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setError('Format non supporté. Acceptés: PDF, Word (.docx, .doc), TXT');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50MB)');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Veuillez sélectionner un fichier'); return; }
    if (!uploadForm.titre.trim()) { setError('Le titre est obligatoire'); return; }
    if (!uploadForm.category.trim()) { setError('La catégorie est obligatoire'); return; }

    setUploading(true);
    setError(null);
    try {
      const data: Record<string, string> = {
        titre: uploadForm.titre.trim(),
        category: uploadForm.category.trim(),
      };
      if (uploadForm.subcategory.trim()) data.subcategory = uploadForm.subcategory.trim();
      if (uploadForm.description.trim()) data.description = uploadForm.description.trim();

      await apiClient.uploadFile('/admin/global-knowledge/upload', selectedFile, data);
      setSuccess('Document uploadé — indexation en cours...');
      setShowUploadModal(false);
      setUploadForm({ titre: '', category: '', subcategory: '', description: '' });
      setSelectedFile(null);
      setTimeout(fetchDocuments, 2000);
    } catch (err: any) {
      const detail = err?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || JSON.stringify(e)).join(', '));
      } else {
        setError(typeof detail === 'string' ? detail : err?.message || 'Erreur upload');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) { setError('Le nom est obligatoire'); return; }
    setSavingCategory(true);
    setError(null);
    try {
      const slug = categoryForm.slug.trim() || categoryForm.name.trim().toLowerCase().replace(/\s+/g, '_');
      await apiClient.post('/admin/global-knowledge/categories', {
        name: categoryForm.name.trim(),
        slug,
        description: categoryForm.description.trim() || null,
      });
      setSuccess('Catégorie créée');
      setCategoryForm({ name: '', slug: '', description: '' });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleToggleCategory = async (catId: string) => {
    try {
      await apiClient.post(`/admin/global-knowledge/categories/${catId}/toggle`, {});
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    }
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await apiClient.delete(`/admin/global-knowledge/categories/${catId}`);
      fetchCategories();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression');
    }
  };

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <ScrollReveal direction="up" delay={0}>
      <div className="bg-gradient-to-br from-[#1a1f3a]/80 via-[#2563EB]/10 to-[#1a1f3a]/80 backdrop-blur-lg rounded-[28px] border border-[#2563EB]/30 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white">Base de Connaissances Globale</h2>
            <p className="text-[#CBD5E1] mt-1">
              Documents partagés avec toutes les organisations — utilisés par l'IA comme références officielles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
            >
              Gérer catégories
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="group relative px-6 py-3 text-white rounded-xl overflow-hidden transition-all hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B] opacity-90 group-hover:opacity-100" />
              <span className="relative z-10 font-semibold">+ Uploader</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Liste documents */}
        {loading ? (
          <div className="text-center py-16 text-[#CBD5E1]">Chargement...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-[#CBD5E1] text-lg mb-2">Aucun document global</p>
            <p className="text-[#94a3b8] text-sm">Uploadez votre premier document de référence.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#CBD5E1] text-sm">{documents.length} document(s)</p>
              <button onClick={fetchDocuments} className="text-xs text-[#CBD5E1] hover:text-white px-3 py-1 bg-white/5 rounded-lg transition-colors">
                🔄 Rafraîchir
              </button>
            </div>

            {documents.map((doc) => {
              const id = docId(doc);
              const busy = actionLoading[id];
              return (
                <div key={id} className="bg-[#1a1f3a]/50 rounded-xl border border-[#2563EB]/20 p-6 hover:border-[#2563EB]/40 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    {/* Infos document */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-white text-lg">
                            {doc.file_type === 'pdf' ? '📄' : doc.file_type === 'word' ? '📝' : '📊'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold text-lg truncate">{doc.titre || doc.original_filename}</h3>
                          <p className="text-[#94a3b8] text-sm truncate">{doc.original_filename}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-[#94a3b8] text-xs uppercase tracking-wider block mb-1">Statut</span>
                          <StatusBadge status={doc.status} />
                        </div>
                        <div>
                          <span className="text-[#94a3b8] text-xs uppercase tracking-wider block mb-1">Catégorie</span>
                          <span className="text-white font-medium">{doc.category}</span>
                        </div>
                        <div>
                          <span className="text-[#94a3b8] text-xs uppercase tracking-wider block mb-1">Taille</span>
                          <span className="text-white font-medium">{formatFileSize(doc.file_size)}</span>
                        </div>
                        <div>
                          <span className="text-[#94a3b8] text-xs uppercase tracking-wider block mb-1">Chunks</span>
                          <span className={`font-medium ${doc.total_chunks > 0 ? 'text-green-400' : 'text-[#94a3b8]'}`}>
                            {doc.total_chunks}
                          </span>
                        </div>
                      </div>

                      {doc.description && (
                        <p className="text-[#CBD5E1] text-sm line-clamp-2">{doc.description}</p>
                      )}
                      <p className="text-[#94a3b8] text-xs mt-2">
                        Uploadé le {new Date(doc.upload_date).toLocaleDateString('fr-FR')}
                        {doc.published_date && ` · Publié le ${new Date(doc.published_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {/* Publier — si brouillon ou erreur */}
                      {(doc.status === 'draft' || doc.status === 'error') && (
                        <button
                          onClick={() => handlePublish(doc)}
                          disabled={!!busy}
                          className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {busy === 'publish' ? '...' : '▶ Publier'}
                        </button>
                      )}

                      {/* Archiver — si publié */}
                      {doc.status === 'published' && (
                        <button
                          onClick={() => handleArchive(doc)}
                          disabled={!!busy}
                          className="px-3 py-1.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {busy === 'archive' ? '...' : '🗂 Archiver'}
                        </button>
                      )}

                      {/* Republier — si archivé */}
                      {doc.status === 'archived' && (
                        <button
                          onClick={() => handlePublish(doc)}
                          disabled={!!busy}
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {busy === 'publish' ? '...' : '▶ Republier'}
                        </button>
                      )}

                      {/* Réindexer — si publié ou erreur */}
                      {(doc.status === 'published' || doc.status === 'error') && (
                        <button
                          onClick={() => handleReindex(doc)}
                          disabled={!!busy}
                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {busy === 'reindex' ? '...' : '🔄 Réindexer'}
                        </button>
                      )}

                      {/* Télécharger */}
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={!!busy}
                        className="px-3 py-1.5 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#CBD5E1] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy === 'download' ? '...' : '📥 Télécharger'}
                      </button>

                      {/* Supprimer */}
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={!!busy}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy === 'delete' ? '...' : '🗑 Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Upload ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0a1628] rounded-[28px] border border-[#1e40af]/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white">Uploader un document global</h3>
                <button onClick={() => { setShowUploadModal(false); setError(null); setSelectedFile(null); }}
                  className="text-[#94a3b8] hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

              <div className="space-y-4">
                {/* Titre */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Titre *</label>
                  <input
                    type="text"
                    placeholder="Ex: Plan Comptable UEMOA 2024"
                    value={uploadForm.titre}
                    onChange={e => setUploadForm({ ...uploadForm, titre: e.target.value })}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Catégorie *</label>
                  <select
                    value={uploadForm.category}
                    onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {activeCategories.map(c => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                  {activeCategories.length === 0 && (
                    <p className="text-xs text-[#94a3b8] mt-1">Aucune catégorie active. Créez-en une via "Gérer catégories".</p>
                  )}
                </div>

                {/* Sous-catégorie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Sous-catégorie</label>
                  <input
                    type="text"
                    placeholder="Ex: Bâle III"
                    value={uploadForm.subcategory}
                    onChange={e => setUploadForm({ ...uploadForm, subcategory: e.target.value })}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Description du document..."
                    value={uploadForm.description}
                    onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
                  />
                </div>

                {/* Zone fichier */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Fichier *</label>
                  <div
                    className="border-2 border-dashed border-[#3730a3] rounded-lg p-8 text-center hover:border-[#3b82f6]/60 transition-colors bg-[#1e293b]/20 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                  >
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={e => handleFileSelect(e.target.files)} />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="text-4xl">✅</div>
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-[#94a3b8]">{formatFileSize(selectedFile.size)}</p>
                        <button onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="text-sm text-red-400 hover:text-red-300">
                          Retirer le fichier
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl mb-3">📤</div>
                        <p className="text-[#94a3b8] mb-1">Glisser-déposer ou cliquer pour sélectionner</p>
                        <p className="text-xs text-[#64748b]">PDF, DOC, DOCX, TXT · max 50MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowUploadModal(false); setError(null); setSelectedFile(null); }}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-[#1e293b]/50 hover:bg-[#1e293b]/70 text-white font-semibold rounded-lg border border-[#3730a3] transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !uploadForm.titre.trim() || !uploadForm.category.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#1e40af] via-[#3b82f6] to-[#2563eb] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Upload en cours...</>
                  ) : 'Uploader'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Catégories ── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#0a1628] via-[#1e293b] to-[#0a1628] rounded-[28px] border border-[#1e40af]/50 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white">Gérer les catégories</h3>
                <button onClick={() => { setShowCategoryModal(false); setError(null); }}
                  className="text-[#94a3b8] hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

              {/* Créer catégorie */}
              <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
                <p className="text-white font-semibold text-sm">Nouvelle catégorie</p>
                <input
                  type="text"
                  placeholder="Nom *"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
                <input
                  type="text"
                  placeholder="Slug (auto-généré si vide)"
                  value={categoryForm.slug}
                  onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
                <input
                  type="text"
                  placeholder="Description (optionnel)"
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1e293b] border border-[#3730a3] rounded-lg text-white placeholder-[#94a3b8] text-sm focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={savingCategory || !categoryForm.name.trim()}
                  className="w-full px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {savingCategory ? 'Création...' : '+ Créer'}
                </button>
              </div>

              {/* Liste catégories */}
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-[#94a3b8] text-sm text-center py-4">Aucune catégorie</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div>
                        <span className="text-white font-medium text-sm">{cat.name}</span>
                        <span className="text-[#94a3b8] text-xs ml-2">({cat.slug})</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleCategory(cat.id)}
                          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/15 text-[#CBD5E1] rounded-lg transition-colors"
                        >
                          {cat.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ScrollReveal>
  );
}
