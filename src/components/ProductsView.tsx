'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';
import { Package, Plus, Pencil, X, Save, Trash2, Eye, EyeOff, Beer, Wine, Coffee, UtensilsCrossed, CircleDot } from 'lucide-react';
import type { Product, ProductCategory } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import ConfirmModal from './ConfirmModal';

const CATEGORY_ICONS: Record<ProductCategory, React.ReactNode> = {
  beer: <Beer size={14} />,
  cocktail: <Wine size={14} />,
  spirit: <Wine size={14} />,
  soft_drink: <Coffee size={14} />,
  food: <UtensilsCrossed size={14} />,
  other: <CircleDot size={14} />,
};

interface Props {
  showToast: (msg: string, type: 'ok' | 'error' | 'warn') => void;
}

export default function ProductsView({ showToast }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');

  // Form
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCat, setFCat] = useState<ProductCategory>('beer');
  const [fPrice, setFPrice] = useState('');
  const [fAvailable, setFAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const supabase = createClient();

  const apiCall = async (method: string, body?: any, qs?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const url = '/api/products' + (qs || '');
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const load = async () => {
    setLoading(true);
    const res = await apiCall('GET');
    if (res?.success) setProducts(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFName(''); setFDesc(''); setFCat('beer'); setFPrice(''); setFAvailable(true);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setFName(p.name); setFDesc(p.description || ''); setFCat(p.category); setFPrice(String(p.price)); setFAvailable(p.is_available);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fName || !fPrice) return;
    setSaving(true);
    if (editing) {
      const res = await apiCall('PUT', { id: editing.id, name: fName, description: fDesc, category: fCat, price: fPrice, is_available: fAvailable });
      if (res?.success) { showToast('✓ Producto actualizado', 'ok'); setShowForm(false); load(); }
      else showToast(res?.error || 'Error', 'error');
    } else {
      const res = await apiCall('POST', { name: fName, description: fDesc, category: fCat, price: fPrice, is_available: fAvailable });
      if (res?.success) { showToast('✓ Producto creado', 'ok'); setShowForm(false); load(); }
      else showToast(res?.error || 'Error', 'error');
    }
    setSaving(false);
  };

  const toggleAvailable = async (p: Product) => {
    const res = await apiCall('PUT', { id: p.id, is_available: !p.is_available });
    if (res?.success) { load(); showToast(res.data.is_available ? '✓ Producto disponible' : '✓ Producto oculto', 'ok'); }
  };

  const handleDeleteProduct = async (p: Product) => {
    const res = await apiCall('DELETE', undefined, `?id=${p.id}`);
    if (res?.success) { showToast('✓ Producto eliminado', 'ok'); load(); }
    else showToast(res?.error || 'Error', 'error');
    setDeleteProduct(null);
  };

  const filtered = filterCat === 'all' ? products : products.filter(p => p.category === filterCat);
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="icon-box" style={{ background: 'rgba(245,166,35,0.08)' }}><Package size={16} className="text-amber" /></div>
            <div>
              <h3 className="text-sm font-bold text-white/90">Productos</h3>
              <p className="text-[11px] text-slate-500">{products.length} productos · {products.filter(p => p.is_available).length} disponibles</p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary py-2.5 px-4 flex items-center gap-1.5">
            <Plus size={13} /> Nuevo Producto
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all
                ${filterCat === cat ? 'bg-amber/10 text-amber border-amber/20' : 'border-transparent text-slate-500 hover:text-slate-400'}`}>
              {cat === 'all' ? `Todos (${products.length})` : `${CATEGORY_LABELS[cat as ProductCategory] || cat} (${products.filter(p => p.category === cat).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10"><div className="w-5 h-5 border-2 border-amber/20 border-t-amber rounded-full animate-spin mx-auto" /></div>
        ) : !filtered.length ? (
          <div className="text-center py-10 text-slate-500 text-sm">No hay productos. Crea el primero.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map(p => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all
                ${p.is_available ? 'border-white/[0.03] hover:bg-white/[0.02]' : 'border-red-500/5 opacity-40'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: p.is_available ? 'rgba(245,166,35,0.06)' : 'rgba(239,68,68,0.06)' }}>
                  <span className={p.is_available ? 'text-amber' : 'text-red-400'}>{CATEGORY_ICONS[p.category]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white/90 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500">{CATEGORY_LABELS[p.category]} · ${Number(p.price).toFixed(2)}</div>
                  {p.description && <div className="text-[10px] text-slate-600 truncate">{p.description}</div>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleAvailable(p)} className="w-9 h-9 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center" title={p.is_available ? 'Ocultar' : 'Mostrar'}>
                    {p.is_available ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} className="text-red-400" />}
                  </button>
                  <button onClick={() => openEdit(p)} className="w-9 h-9 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center">
                    <Pencil size={14} className="text-slate-400" />
                  </button>
                  <button onClick={() => setDeleteProduct(p)} className="w-9 h-9 rounded-lg bg-white/[0.02] hover:bg-red-500/10 flex items-center justify-center">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xl flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-[#101828] border border-amber/10 rounded-3xl p-7 max-w-[420px] w-[92%] shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-[popScale_0.3s_ease]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white/90">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl bg-white/[0.03] text-slate-500 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400"><X size={15} /></button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={fName} onChange={e => setFName(e.target.value)} placeholder="IPA Artesanal" />
              </div>
              <div>
                <label className="label">Descripción (opcional)</label>
                <input className="input" value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Cerveza artesanal 330ml" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={fCat} onChange={e => setFCat(e.target.value as ProductCategory)}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Precio ($)</label>
                  <input type="number" min="0" step="0.01" className="input" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="5.00" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFAvailable(!fAvailable)}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all
                    ${fAvailable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                  {fAvailable ? '✓' : ''}
                </button>
                <span className="text-xs text-slate-400">Disponible para la venta</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {saving ? <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" /> : <><Save size={13} /> {editing ? 'Guardar' : 'Crear'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteProduct && (
        <ConfirmModal
          title="Eliminar Producto"
          message={`¿Estás seguro de eliminar "${deleteProduct.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={() => handleDeleteProduct(deleteProduct)}
          onCancel={() => setDeleteProduct(null)}
        />
      )}
    </div>
  );
}
