// Projects view — manage multiple campus financial projects
// Loaded via index.html script tag after result.jsx, before app.jsx

function ProjectsView({ activeProject, onOpenProject, onBackToLanding, onNewProject, onStartCompare, view }) {
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQ, setSearchQ] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updated');
  const [filterType, setFilterType] = React.useState('all');
  const [compareMode, setCompareMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [newOpen, setNewOpen] = React.useState(false);
  const [renameProj, setRenameProj] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const refresh = React.useCallback(() => {
    if (typeof window.apiGetProjects !== 'function') {
      setLoading(false);
      return;
    }
    setLoading(true);
    window.apiGetProjects()
      .then(list => { setProjects(list); setLoading(false); })
      .catch(() => { setProjects([]); setLoading(false); });
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const handleOpen = async (proj) => {
    try {
      const full = await window.apiGetProject(proj.id);
      onOpenProject(full);
    } catch (e) {}
  };
  const handleDelete = async (id) => {
    try {
      const proj = projects.find(p => p.id === id);
      await window.apiDeleteProject(id);
      refresh();
      setConfirmDelete(null);
      window.showToast?.('Project "' + (proj?.name || '') + '" dihapus', { variant: 'info' });
    } catch (e) {
      window.showToast?.('Gagal menghapus project', { variant: 'error' });
    }
  };
  const handleDuplicate = async (id) => {
    try {
      const copy = await window.apiDuplicateProject(id);
      refresh();
      window.showToast?.('Salinan dibuat: "' + (copy?.name || 'Project') + '"', { variant: 'success' });
    } catch (e) {
      window.showToast?.('Gagal menduplikasi project', { variant: 'error' });
    }
  };
  const handleRenameSave = async (proj, newName, newDesc, newType) => {
    try {
      const full = await window.apiGetProject(proj.id);
      await window.apiSaveProject(proj.id, newName, full.data, {
        description: newDesc,
        campus_type: newType,
        tags: full.tags || [],
        result_summary: full.result_summary || null,
      });
      refresh();
      setRenameProj(null);
      window.showToast?.('Project diperbarui', { variant: 'success' });
    } catch (e) {
      window.showToast?.('Gagal menyimpan perubahan', { variant: 'error' });
    }
  };

  const handleExport = async (proj) => {
    try {
      const full = await window.apiGetProject(proj.id);
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (proj.name || 'project').replace(/[^a-z0-9-_]/gi, '_') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.showToast?.('File JSON diunduh', { variant: 'success' });
    } catch (e) {
      window.showToast?.('Gagal export JSON', { variant: 'error' });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id)
      ? prev.filter(i => i !== id)
      : prev.length >= 4 ? prev : [...prev, id]);
  };

  // Filter + search + sort
  const filtered = projects
    .filter(p => filterType === 'all' || (p.campus_type === filterType))
    .filter(p => !searchQ || (p.name || '').toLowerCase().includes(searchQ.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'verdict') {
        const order = { SANGAT_BAIK: 4, BAIK: 3, PERHATIAN: 2, BERISIKO: 1 };
        return (order[b.result_summary?.verdict] || 0) - (order[a.result_summary?.verdict] || 0);
      }
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });

  return (
    <div className="projects-view">
      <ProjectsHeader
        count={projects.length}
        onBack={onBackToLanding}
        onNew={() => setNewOpen(true)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        compareMode={compareMode}
        onToggleCompare={() => { setCompareMode(c => !c); setSelectedIds([]); }}
      />

      {projects.length > 0 && (
        <ProjectsFilterBar
          searchQ={searchQ}
          onSearchChange={setSearchQ}
          filterType={filterType}
          onFilterChange={setFilterType}
        />
      )}

      <div className="projects-grid">
        {loading && <div className="projects-loading">Memuat project…</div>}
        {!loading && projects.length === 0 && (
          <ProjectsEmpty onNew={() => setNewOpen(true)} />
        )}
        {!loading && filtered.length === 0 && projects.length > 0 && (
          <div className="projects-empty-filter">
            Tidak ada project yang cocok dengan filter. <button className="btn-link" onClick={() => { setSearchQ(''); setFilterType('all'); }}>Reset filter</button>
          </div>
        )}
        {!loading && filtered.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            isActive={activeProject?.id === p.id}
            compareMode={compareMode}
            isSelected={selectedIds.includes(p.id)}
            canSelect={selectedIds.length < 4 || selectedIds.includes(p.id)}
            onSelect={() => toggleSelect(p.id)}
            onOpen={() => handleOpen(p)}
            onDuplicate={() => handleDuplicate(p.id)}
            onRename={() => setRenameProj(p)}
            onExport={() => handleExport(p)}
            onDelete={() => setConfirmDelete(p)}
          />
        ))}
      </div>

      {compareMode && selectedIds.length >= 2 && (
        <div className="compare-mode-bar">
          <div className="cmb-info">
            <window.Icon name="bar-chart-3" size={14} />
            <b>{selectedIds.length}</b> project dipilih untuk dibandingkan
          </div>
          <div className="cmb-actions">
            <button className="btn-ghost btn-sm" onClick={() => { setSelectedIds([]); }}>Batal</button>
            <button className="btn-primary btn-sm" onClick={() => onStartCompare(selectedIds)}>
              Bandingkan <window.Icon name="arrow-right" size={12} />
            </button>
          </div>
        </div>
      )}

      {newOpen && <NewProjectModal onCreate={onNewProject} onClose={() => setNewOpen(false)} />}
      {renameProj && <RenameModal project={renameProj} onSave={handleRenameSave} onClose={() => setRenameProj(null)} />}
      {confirmDelete && <DeleteConfirm project={confirmDelete} onConfirm={() => handleDelete(confirmDelete.id)} onClose={() => setConfirmDelete(null)} />}
    </div>
  );
}

function ProjectsHeader({ count, onBack, onNew, sortBy, onSortChange, compareMode, onToggleCompare }) {
  return (
    <header className="projects-header">
      <div className="projects-header-inner">
        <button className="btn-back" onClick={onBack} title="Kembali ke beranda">
          <window.Logo size={32} variant="light" />
        </button>
        <div className="projects-title-block">
          <div className="projects-eyebrow">Workspace</div>
          <h1 className="projects-title">Project Kampus</h1>
          <div className="projects-sub">{count} project tersimpan</div>
        </div>
        <div className="projects-header-actions">
          <select className="projects-sort" value={sortBy} onChange={e => onSortChange(e.target.value)} aria-label="Urutkan">
            <option value="updated">Terakhir diubah</option>
            <option value="name">Nama A-Z</option>
            <option value="verdict">Predikat tertinggi</option>
          </select>
          <button
            className={'btn-ghost ' + (compareMode ? 'is-active' : '')}
            onClick={onToggleCompare}
          >
            <window.Icon name="bar-chart-3" size={14} /> {compareMode ? 'Mode: Bandingkan' : 'Mode Bandingkan'}
          </button>
          <button className="btn-primary" onClick={onNew}>
            <window.Icon name="plus" size={14} /> Project Baru
          </button>
        </div>
      </div>
    </header>
  );
}

function ProjectsFilterBar({ searchQ, onSearchChange, filterType, onFilterChange }) {
  return (
    <div className="projects-filter-bar">
      <div className="projects-search">
        <window.Icon name="compass" size={14} />
        <input
          type="text"
          placeholder="Cari nama project atau deskripsi…"
          value={searchQ}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQ && (
          <button className="search-clear" onClick={() => onSearchChange('')}>
            <window.Icon name="x" size={12} />
          </button>
        )}
      </div>
      <div className="projects-type-chips">
        {['all', 'PTN', 'PTS', 'POLITEKNIK'].map(type => (
          <button
            key={type}
            className={'type-chip' + (filterType === type ? ' active' : '')}
            onClick={() => onFilterChange(type)}
          >
            {type === 'all' ? 'Semua' : type}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, isActive, compareMode, isSelected, canSelect, onSelect, onOpen, onDuplicate, onRename, onExport, onDelete }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const rs = project.result_summary;
  const verdict = rs?.verdict;
  const verdictInfo = verdict ? window.VERDICT_INFO?.[verdict] : null;

  const handleCardClick = (e) => {
    if (compareMode) {
      if (canSelect || isSelected) onSelect();
      return;
    }
    onOpen();
  };

  return (
    <div className={'project-card' + (isActive ? ' is-active' : '') + (isSelected ? ' is-selected' : '') + (compareMode && !canSelect && !isSelected ? ' is-disabled' : '')}>
      {compareMode && (
        <div className="pc-checkbox" onClick={(e) => { e.stopPropagation(); if (canSelect || isSelected) onSelect(); }}>
          <div className="pc-checkbox-box">
            {isSelected && <window.Icon name="check" size={12} />}
          </div>
        </div>
      )}
      <button className="pc-main" onClick={handleCardClick} disabled={compareMode && !canSelect && !isSelected}>
        <div className="pc-card-head">
          <div className="pc-name-block">
            <div className="pc-name">{project.name || '(Tanpa nama)'}</div>
            {project.campus_type && <div className="pc-type-pill">{project.campus_type}</div>}
          </div>
          {verdict && (
            <span className={'pc-verdict v-' + verdict}>
              {verdictInfo?.label || verdict}
            </span>
          )}
        </div>
        {project.description && <p className="pc-description">{project.description}</p>}
        <div className="pc-metrics">
          {rs && (
            <>
              <div className="pc-metric">
                <span className="pc-m-label">CFI</span>
                <span className="pc-m-val mono">{rs.CFI_total != null ? rs.CFI_total.toFixed(1) : '—'}</span>
              </div>
              <div className="pc-metric">
                <span className="pc-m-label">LAMEMBA</span>
                <span className="pc-m-val mono">{rs.lameba_fulfilled != null ? rs.lameba_fulfilled + '/10' : '—'}</span>
              </div>
              <div className="pc-metric">
                <span className="pc-m-label">Mahasiswa</span>
                <span className="pc-m-val mono">{rs.mhs_count != null ? rs.mhs_count.toLocaleString('id-ID') : '—'}</span>
              </div>
            </>
          )}
          {!rs && <div className="pc-no-summary">Buka project untuk hitung predikat</div>}
        </div>
        <div className="pc-footer">
          <span className="pc-updated">
            <window.Icon name="refresh-cw" size={11} />
            {formatRelative(project.updated_at)}
          </span>
        </div>
      </button>
      {!compareMode && (
        <div className="pc-menu-wrap" onClick={e => e.stopPropagation()}>
          <button className="pc-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Menu" title="Menu">
            <window.Icon name="menu" size={14} />
          </button>
          {menuOpen && (
            <div className="pc-menu" onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { setMenuOpen(false); onOpen(); }}>
                <window.Icon name="arrow-up-right" size={13} /> Buka
              </button>
              <button onClick={() => { setMenuOpen(false); onRename(); }}>
                <window.Icon name="edit-2" size={13} /> Rename
              </button>
              <button onClick={() => { setMenuOpen(false); onDuplicate(); }}>
                <window.Icon name="folder-open" size={13} /> Duplikasi
              </button>
              <button onClick={() => { setMenuOpen(false); onExport(); }}>
                <window.Icon name="save" size={13} /> Export JSON
              </button>
              <button className="pc-menu-danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
                <window.Icon name="trash-2" size={13} /> Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectsEmpty({ onNew }) {
  return (
    <div className="projects-empty">
      <div className="projects-empty-icon">
        <window.Icon name="folder-open" size={32} />
      </div>
      <h2>Belum ada project</h2>
      <p>Mulai dengan membuat project pertama Anda. Setiap project menyimpan data laporan keuangan kampus untuk 3 tahun + hasil analisis.</p>
      <button className="btn-primary btn-lg" onClick={onNew}>
        <window.Icon name="plus" size={16} /> Buat Project Pertama
      </button>
    </div>
  );
}

function NewProjectModal({ onCreate, onClose }) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [campusType, setCampusType] = React.useState('PTS');
  const [seedFrom, setSeedFrom] = React.useState('BAIK');
  const presetKeys = Object.keys(window.PRESETS || {});
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), campus_type: campusType, seedFrom });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><window.Icon name="plus" size={16} /> Project Baru</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <window.Icon name="x" size={16} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="modal-label">Nama project</label>
          <input
            className="modal-input"
            type="text"
            placeholder="cth. Universitas A — TS 2024"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
          <label className="modal-label">Deskripsi <span className="modal-optional">(opsional)</span></label>
          <textarea
            className="modal-input"
            placeholder="Catatan, tujuan, atau konteks project…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <label className="modal-label">Tipe institusi</label>
          <div className="modal-segments">
            {['PTN', 'PTS', 'POLITEKNIK'].map(t => (
              <button
                key={t}
                type="button"
                className={'modal-segment' + (campusType === t ? ' active' : '')}
                onClick={() => setCampusType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="modal-label">Mulai dari</label>
          <select className="modal-input" value={seedFrom} onChange={e => setSeedFrom(e.target.value)}>
            <option value="">(Kosong) Input dari nol</option>
            {presetKeys.map(k => (
              <option key={k} value={k}>{window.PRESETS[k].label}</option>
            ))}
          </select>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary">
              Buat & Buka <window.Icon name="arrow-right" size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameModal({ project, onSave, onClose }) {
  const [name, setName] = React.useState(project.name || '');
  const [description, setDescription] = React.useState(project.description || '');
  const [campusType, setCampusType] = React.useState(project.campus_type || 'PTS');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(project, name.trim(), description.trim(), campusType);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><window.Icon name="edit-2" size={16} /> Ubah Project</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <window.Icon name="x" size={16} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="modal-label">Nama project</label>
          <input className="modal-input" type="text" value={name} onChange={e => setName(e.target.value)} autoFocus required />
          <label className="modal-label">Deskripsi</label>
          <textarea className="modal-input" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          <label className="modal-label">Tipe institusi</label>
          <div className="modal-segments">
            {['PTN', 'PTS', 'POLITEKNIK'].map(t => (
              <button key={t} type="button" className={'modal-segment' + (campusType === t ? ' active' : '')} onClick={() => setCampusType(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ project, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{color:'var(--bad)'}}><window.Icon name="alert-triangle" size={16} /> Hapus Project?</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <window.Icon name="x" size={16} />
          </button>
        </div>
        <p style={{color:'var(--ink-2)', margin:'0 0 16px', lineHeight:1.55}}>
          Project <b>"{project.name}"</b> akan dihapus permanen. Aksi ini tidak bisa dibatalkan.
        </p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-danger" onClick={onConfirm}>
            <window.Icon name="trash-2" size={14} /> Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return 'Belum disimpan';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Beberapa detik lalu';
    if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    if (diff < 604800) return Math.floor(diff / 86400) + ' hari lalu';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

window.ProjectsView = ProjectsView;
