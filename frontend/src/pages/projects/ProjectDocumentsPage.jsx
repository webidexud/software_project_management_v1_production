// frontend/src/pages/projects/ProjectDocumentsPage.jsx — v3.0
// CAMBIOS:
//  - Topbar muestra project_id (no external_project_number)
//  - Cola de carga: fecha y observación por cada archivo
//  - Botón "Descargar expediente" → ZIP con todos los documentos
//  - Tipos dinámicos desde BD
//  - Descarga individual abre file_url directamente
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, FileText, Upload, X, Eye, Trash2,
  CheckCircle2, AlertCircle, Loader, FolderOpen, Archive
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService, documentsService } from '../../services/projects'

/* ── Colores por type_code ───────────────────────────────────────── */
const TYPE_COLORS = {
  ACTA_INI:'#10B981',ACTA_LIQ:'#8B5CF6',ACTA_REI:'#06B6D4',ACTA_SUS:'#EF4444',
  ACTA_COM:'#64748B',ADICION:'#0EA5E9',ANEXO:'#F59E0B',ANEXO_TEC:'#F59E0B',
  CDP:'#10B981',CERT_CUM:'#0EA5E9',CESION:'#8B5CF6',CIERRE_F:'#64748B',
  CORR_ENV:'#64748B',CORR_REC:'#64748B',CREAC_FIN:'#10B981',DOC_PRIV:'#94A3B8',
  DOC_PUB:'#94A3B8',ESTADO_CT:'#0EA5E9',EST_TEC:'#F59E0B',EST_PREV:'#F59E0B',
  FACTURAS:'#10B981',INCORPORAC:'#0EA5E9',INF_SEG:'#8B5CF6',INF_EJEC:'#8B5CF6',
  INTERVENT:'#EF4444',INVITACION:'#F59E0B',MINUTA:'#0F2952',MODIF:'#0EA5E9',
  ORD_PAGO:'#10B981',ORD_GASTO:'#10B981',OTRAS_ACT:'#64748B',POLIZAS:'#F59E0B',
  PRESUP:'#10B981',PROPUESTA:'#F59E0B',PRORROGA:'#0EA5E9',RESOLUCION:'#EF4444',
  RP:'#10B981',OTRO:'#94A3B8',
}
const getColor = (code) => TYPE_COLORS[code] || '#94A3B8'

/* ── Detectar tipo por nombre de archivo ─────────────────────────── */
function detectType(filename, docTypes) {
  if (!docTypes?.length) return null
  const base  = filename.toUpperCase().replace(/\.PDF$/i,'').replace(/[-\s.]/g,'_')
  const parts = new Set(base.split('_').filter(Boolean))
  const sorted = [...docTypes].sort((a,b) => b.type_code.length - a.type_code.length)
  for (const dt of sorted) {
    const code = dt.type_code.toUpperCase()
    if (parts.has(code) || base.startsWith(code+'_') || base === code) return dt
  }
  return docTypes.find(d => d.type_code === 'OTRO') || docTypes[docTypes.length-1]
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1048576).toFixed(2)} MB`
}

function TypeBadge({ code }) {
  const c = getColor(code)
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, background:`${c}18`, color:c, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c }}/>
      {code}
    </span>
  )
}

const IS = { width:'100%', padding:'6px 10px', borderRadius:7, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:11, fontFamily:'inherit', boxSizing:'border-box' }

/* ── Fila en cola de subida ──────────────────────────────────────── */
function QueueItem({ item, onRemove, onChangeType, onChangeDate, onChangeObs, docTypes }) {
  const color = getColor(item.detectedType?.type_code)
  return (
    <div style={{ borderRadius:10, border:`1px solid ${item.status==='error'?'#EF444440':item.status==='done'?'#10B98140':'var(--border-color)'}`, background:item.status==='error'?'#EF444408':item.status==='done'?'#10B98108':'var(--bg-hover)', overflow:'hidden' }}>
      {/* Fila principal */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
        <div style={{ flexShrink:0 }}>
          {item.status==='pending'   && <FileText size={18} color="var(--text-muted)"/>}
          {item.status==='uploading' && <Loader size={18} color="#0EA5E9" style={{animation:'spin 1s linear infinite'}}/>}
          {item.status==='done'      && <CheckCircle2 size={18} color="#10B981"/>}
          {item.status==='error'     && <AlertCircle size={18} color="#EF4444"/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.file.name}</p>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
            {fmtSize(item.file.size)}
            {item.status==='error' && <span style={{ color:'#EF4444', marginLeft:8 }}>{item.error}</span>}
          </p>
        </div>
        {item.status==='pending' && (
          <select value={item.detectedType?.type_code||'OTRO'}
            onChange={e => onChangeType(item.id, docTypes.find(d=>d.type_code===e.target.value))}
            style={{ padding:'5px 8px', borderRadius:7, border:'1px solid var(--border-color)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:11, fontFamily:'inherit', cursor:'pointer', flexShrink:0, appearance:'auto' }}>
            {docTypes.map(d=><option key={d.type_code} value={d.type_code}>{d.type_name}</option>)}
          </select>
        )}
        {item.status==='done' && item.detectedType && <TypeBadge code={item.detectedType.type_code}/>}
        {item.status!=='uploading' && item.status!=='done' && (
          <button onClick={()=>onRemove(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, flexShrink:0 }}>
            <X size={15}/>
          </button>
        )}
      </div>

      {/* Campos adicionales: fecha y observación */}
      {item.status==='pending' && (
        <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:8, padding:'0 14px 12px' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Fecha del documento</p>
            <input type="date" value={item.docDate||''} onChange={e=>onChangeDate(item.id, e.target.value)} style={IS}/>
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Observación</p>
            <input type="text" value={item.observation||''} onChange={e=>onChangeObs(item.id, e.target.value)} placeholder="Observación opcional..." style={IS}/>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ProjectDocumentsPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const dropRef  = useRef(null)
  const fileRef  = useRef(null)

  const [project,       setProject]       = useState(null)
  const [documents,     setDocuments]     = useState([])
  const [docTypes,      setDocTypes]      = useState([])
  const [queue,         setQueue]         = useState([])
  const [dragging,      setDragging]      = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [uploading,     setUploading]     = useState(false)
  const [filter,        setFilter]        = useState('')
  const [zipping,       setZipping]       = useState(false)

  const loadDocTypes = useCallback(async () => {
    try { const r = await documentsService.types(); setDocTypes(Array.isArray(r.data)?r.data:[]) }
    catch { toast.error('Error cargando tipos de documentos') }
  }, [])

  const loadProject = useCallback(async () => {
    try { const r = await projectsService.get(id); setProject(r.data) }
    catch { toast.error('Error cargando proyecto'); navigate('/projects') }
  }, [id])

  const loadDocuments = useCallback(async () => {
    try { const r = await documentsService.list(id); setDocuments(Array.isArray(r.data)?r.data:[]) }
    catch { toast.error('Error cargando documentos') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadDocTypes(); loadProject(); loadDocuments() }, [])

  /* ── Drag & Drop ─────────────────────────────────────────────── */
  const handleDrop      = (e) => { e.preventDefault(); setDragging(false); addToQueue(Array.from(e.dataTransfer.files)) }
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = (e) => { if (!dropRef.current?.contains(e.relatedTarget)) setDragging(false) }

  const addToQueue = (files) => {
    const pdfs    = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    const nonPdfs = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'))
    if (nonPdfs.length) toast.error(`${nonPdfs.length} archivo(s) ignorado(s): solo PDF`)
    const today = new Date().toISOString().split('T')[0]
    setQueue(prev => [...prev, ...pdfs.map(f => ({
      id:           `${Date.now()}_${Math.random()}`,
      file:         f,
      detectedType: detectType(f.name, docTypes),
      docDate:      today,
      observation:  '',
      status:       'pending',
      error:        null,
    }))])
  }

  const changeType    = (iid, t)  => setQueue(p => p.map(i => i.id===iid ? {...i, detectedType:t} : i))
  const changeDate    = (iid, v)  => setQueue(p => p.map(i => i.id===iid ? {...i, docDate:v}      : i))
  const changeObs     = (iid, v)  => setQueue(p => p.map(i => i.id===iid ? {...i, observation:v}  : i))
  const removeItem    = (iid)     => setQueue(p => p.filter(i => i.id!==iid))

  /* ── Subir archivos ──────────────────────────────────────────── */
  const uploadAll = async () => {
    const pending = queue.filter(i => i.status==='pending')
    if (!pending.length) return
    setUploading(true)
    for (const item of pending) {
      setQueue(p => p.map(i => i.id===item.id ? {...i, status:'uploading'} : i))
      try {
        const fd = new FormData()
        fd.append('file', item.file)
        fd.append('override_type', item.detectedType?.type_code || 'OTRO')
        if (item.docDate)    fd.append('document_date', item.docDate)
        if (item.observation) fd.append('observations', item.observation)
        await documentsService.upload(id, fd)
        setQueue(p => p.map(i => i.id===item.id ? {...i, status:'done'} : i))
      } catch (err) {
        const msg = err.response?.data?.detail || 'Error al subir'
        setQueue(p => p.map(i => i.id===item.id ? {...i, status:'error', error:msg} : i))
        toast.error(`Error: ${item.file.name}`)
      }
    }
    setUploading(false)
    await loadDocuments()
    toast.success('Archivos subidos ✓')
  }

  /* ── Descargar archivo individual ────────────────────────────── */
  const downloadDoc = (doc) => {
    // Abrir la URL directa del archivo (nueva pestaña)
    if (doc.file_url) {
      window.open(doc.file_url, '_blank')
    } else {
      // Fallback al endpoint del backend
      documentsService.download(doc.document_id).then(r => {
        const url = URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a')
        a.href = url; a.download = doc.original_filename || `doc_${doc.document_id}.pdf`
        a.click(); URL.revokeObjectURL(url)
      }).catch(() => toast.error('Error descargando archivo'))
    }
  }

  /* ── Descargar expediente completo ───────────────────────────── */
  const downloadExpediente = async () => {
    setZipping(true)
    try {
      const r = await documentsService.zip(id)
      const url = URL.createObjectURL(new Blob([r.data], { type:'application/zip' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `Expediente_${id}_${project?.project_year || ''}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Expediente descargado ✓')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al generar expediente')
    } finally { setZipping(false) }
  }

  /* ── Eliminar ────────────────────────────────────────────────── */
  const deleteDoc = async (doc) => {
    if (!confirm(`¿Eliminar "${doc.document_name}"?`)) return
    try {
      await documentsService.delete(doc.document_id)
      setDocuments(p => p.filter(d => d.document_id!==doc.document_id))
      toast.success('Documento eliminado')
    } catch { toast.error('Error eliminando') }
  }

  const usedTypes    = [...new Set(documents.map(d=>d.type_code).filter(Boolean))]
  const filtered     = filter ? documents.filter(d=>d.type_code===filter) : documents
  const pendingCount = queue.filter(i=>i.status==='pending').length
  const previewTypes = docTypes.slice(0,6)

  if (!project) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <Loader size={24} color="var(--text-muted)" style={{ animation:'spin 1s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg-primary)' }}>

      {/* ── Topbar ── */}
      <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border-color)', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>navigate(`/projects/${id}/view`)}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border-color)', cursor:'pointer', color:'var(--text-secondary)', fontSize:13, fontFamily:'inherit', padding:'7px 12px', borderRadius:8 }}>
            <ArrowLeft size={15}/> Volver
          </button>
          <div style={{ width:1, height:20, background:'var(--border-color)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(14,165,233,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FolderOpen size={17} color="#0EA5E9"/>
            </div>
            <div>
              <h1 style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
                Documentos · {project.project_year}{project.external_project_number ? ` #${project.external_project_number}` : ''} · #{project.project_id}
              </h1>
              <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
                {project.project_name?.substring(0,60)}{project.project_name?.length>60?'…':''}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          {/* Descargar expediente */}
          {documents.length > 0 && (
            <button onClick={downloadExpediente} disabled={zipping}
              style={{ display:'flex', alignItems:'center', gap:7, background:'var(--bg-hover)', color:'var(--text-primary)', border:'1px solid var(--border-color)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', padding:'9px 16px', borderRadius:9 }}>
              {zipping ? <Loader size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Archive size={15}/>}
              {zipping ? 'Generando...' : 'Descargar expediente'}
            </button>
          )}
          {/* Seleccionar PDFs */}
          <button onClick={()=>fileRef.current?.click()}
            style={{ display:'flex', alignItems:'center', gap:7, background:'#B91C3C', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', padding:'9px 18px', borderRadius:9 }}>
            <Upload size={15}/> Seleccionar PDFs
          </button>
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:'none' }}
            onChange={e=>{ addToQueue(Array.from(e.target.files)); e.target.value='' }}/>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

        {/* Zona drop */}
        <div ref={dropRef}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={()=>fileRef.current?.click()}
          style={{ border:`2px dashed ${dragging?'#0EA5E9':'var(--border-color)'}`, borderRadius:14, padding:'32px 24px', textAlign:'center', cursor:'pointer', background:dragging?'rgba(14,165,233,0.04)':'var(--bg-card)', transition:'all .2s', marginBottom:20 }}>
          <Upload size={28} color={dragging?'#0EA5E9':'var(--text-muted)'} style={{ margin:'0 auto 10px' }}/>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>Arrastra PDFs aquí o haz clic para seleccionar</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Solo archivos PDF · Se detecta el tipo automáticamente según el nombre</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
            {previewTypes.map(d=>(
              <span key={d.type_code} style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:`${getColor(d.type_code)}15`, color:getColor(d.type_code), border:`1px solid ${getColor(d.type_code)}30` }}>
                {d.type_code} → {d.type_name}
              </span>
            ))}
          </div>
        </div>

        {/* Cola de subida */}
        {queue.length > 0 && (
          <div style={{ marginBottom:20, background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-color)', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Cola de carga ({queue.length})</span>
                {pendingCount>0 && <span style={{ padding:'2px 9px', borderRadius:20, background:'rgba(14,165,233,0.1)', color:'#0EA5E9', fontSize:11, fontWeight:700 }}>{pendingCount} pendiente{pendingCount>1?'s':''}</span>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {pendingCount>0 && (
                  <button onClick={uploadAll} disabled={uploading}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'#B91C3C', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'inherit', padding:'7px 16px', borderRadius:8 }}>
                    {uploading?<Loader size={13} style={{animation:'spin 1s linear infinite'}}/>:<Upload size={13}/>}
                    Subir {pendingCount} archivo{pendingCount>1?'s':''}
                  </button>
                )}
                <button onClick={()=>setQueue([])} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'1px solid var(--border-color)', cursor:'pointer', color:'var(--text-muted)', fontSize:12, fontFamily:'inherit', padding:'7px 12px', borderRadius:8 }}>
                  <X size={13}/> Limpiar
                </button>
              </div>
            </div>
            <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
              {queue.map(item=>(
                <QueueItem key={item.id} item={item}
                  onRemove={removeItem} onChangeType={changeType}
                  onChangeDate={changeDate} onChangeObs={changeObs}
                  docTypes={docTypes}/>
              ))}
            </div>
          </div>
        )}

        {/* Documentos cargados */}
        <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-color)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Documentos del proyecto</span>
            {usedTypes.length>0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <button onClick={()=>setFilter('')}
                  style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', background:!filter?'#0EA5E9':'var(--bg-hover)', color:!filter?'#fff':'var(--text-muted)' }}>
                  Todos
                </button>
                {usedTypes.map(code=>(
                  <button key={code} onClick={()=>setFilter(code)}
                    style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', background:filter===code?getColor(code):`${getColor(code)}15`, color:filter===code?'#fff':getColor(code) }}>
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <Loader size={24} color="var(--text-muted)" style={{ animation:'spin 1s linear infinite' }}/>
            </div>
          ) : filtered.length===0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <FolderOpen size={40} color="var(--text-muted)" style={{ margin:'0 auto 12px', opacity:0.4 }}/>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>Sin documentos cargados</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Arrastra PDFs o usa el botón "Seleccionar PDFs"</p>
            </div>
          ) : (
            <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              {filtered.map(doc=>{
                const color = getColor(doc.type_code)
                return (
                  <div key={doc.document_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'1px solid var(--border-color)', background:'var(--bg-hover)' }}>
                    <FileText size={17} color={color} style={{ flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {doc.original_filename || doc.document_name}
                      </p>
                      <div style={{ display:'flex', gap:8, marginTop:2, alignItems:'center', flexWrap:'wrap' }}>
                        <TypeBadge code={doc.type_code}/>
                        {doc.document_date && <span style={{ fontSize:10, color:'var(--text-muted)' }}>{doc.document_date}</span>}
                        {doc.file_size && <span style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtSize(doc.file_size)}</span>}
                        {doc.observations && <span style={{ fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>"{doc.observations}"</span>}
                        {doc.is_legacy && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:'rgba(148,163,184,0.15)', color:'var(--text-muted)' }}>legado</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>downloadDoc(doc)} title="Ver documento"
                        style={{ width:30, height:30, borderRadius:7, border:'1px solid var(--border-color)', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
                        <Eye size={14}/>
                      </button>
                      <button onClick={()=>deleteDoc(doc)} title="Eliminar"
                        style={{ width:30, height:30, borderRadius:7, border:'1px solid #EF444433', background:'#EF444408', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#EF4444' }}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Nomenclatura dinámica */}
        {docTypes.length>0 && (
          <div style={{ marginTop:20, padding:'14px 16px', background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-color)' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Nomenclatura de documentos</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'6px 16px' }}>
              {docTypes.map(d=>(
                <div key={d.type_code} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:getColor(d.type_code), fontFamily:'monospace', minWidth:80 }}>{d.type_code}</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{d.type_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
