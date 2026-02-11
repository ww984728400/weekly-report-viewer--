/**
 * DesignPM Pro - 全量驱动引擎 (优化版对比与 PDF 渲染)
 */

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDashboardEngine();
    initSummaryEngine();
    initDetailedProgress();
    initQualityManageModule();
    initRiskManageModule();
    initMaterialModule();
    initSiteDocModule();
    initSiteIssueModule();
    initCostModule();
    initFileHandling();
    initPrintSystem();
    initImageViewer();
    initSidebarToggle();
    setTimeout(loadLocalStore, 200);
});

// --- 侧边栏切换 ---
function initSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const shell = document.getElementById('appShell');
    const overlay = document.getElementById('sidebarOverlay');
    const icon = toggle.querySelector('i');

    const toggleAction = () => {
        shell.classList.toggle('sidebar-collapsed');
        if (shell.classList.contains('sidebar-collapsed')) {
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
    };

    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleAction();
    };

    overlay.onclick = () => {
        shell.classList.add('sidebar-collapsed');
        icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
    };
}

// --- 导航 ---
function initNavigation() {
    const btns = document.querySelectorAll('.nav-link');
    const modules = document.querySelectorAll('.module');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            modules.forEach(m => m.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.target);
            if(target) target.classList.add('active');
            
            if (window.innerWidth <= 768) {
                document.getElementById('appShell').classList.add('sidebar-collapsed');
                const toggleIcon = document.getElementById('sidebarToggle').querySelector('i');
                if(toggleIcon) toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
            }
        };
    });
}

// --- 控制面板 ---
function syncDashboard() {
    const tDays = document.getElementById('totalDays'), wDays = document.getElementById('workedDays'), rDays = document.getElementById('remainingDays');
    const base = document.getElementById('baseContract'), add = document.getElementById('addContract'), tCostDisplay = document.getElementById('totalCostDisplay');
    const pie = document.getElementById('costPie'), overall = document.getElementById('overallPercent');

    if(!tDays || !wDays || !rDays) return;

    const tVal = parseInt(tDays.innerText) || 0, wVal = parseInt(wDays.innerText) || 0;
    rDays.innerText = Math.max(0, tVal - wVal);

    const bVal = parseFloat(base.value) || 0, aVal = parseFloat(add.value) || 0, sum = bVal + aVal;
    tCostDisplay.innerText = `¥${sum.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if(sum > 0) pie.style.background = `conic-gradient(var(--apple-blue) 0% ${(bVal/sum)*100}%, var(--apple-green) ${(bVal/sum)*100}% 100%)`;

    const rows = document.querySelectorAll('.bar-row');
    let totalP = 0;
    rows.forEach(r => {
        const inp = r.querySelector('.bar-input');
        let v = parseInt(inp.value.replace('%','')) || 0;
        v = Math.min(100, Math.max(0, v));
        r.querySelector('.bar-fill').style.width = v + '%';
        totalP += v;
    });
    overall.innerText = (rows.length > 0 ? Math.round(totalP/rows.length) : 0) + '%';
}

function addDashboardRow(name = "新工序 New Task", p = "0%") {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-header"><div class="bar-name" contenteditable="true">${name}</div><div style="display:flex; align-items:center; gap:8px;"><input type="text" class="bar-input" value="${p}"><button class="delete-btn-inline">&minus;</button></div></div><div class="bar-track"><div class="bar-fill"></div></div>`;
    row.querySelector('.bar-input').oninput = syncDashboard;
    row.querySelector('.delete-btn-inline').onclick = () => { row.remove(); syncDashboard(); };
    document.getElementById('workList').appendChild(row);
    syncDashboard();
}

function initDashboardEngine() {
    const addBtn = document.getElementById('addWorkRow');
    if(addBtn) addBtn.onclick = () => addDashboardRow();
    ['totalDays', 'workedDays', 'baseContract', 'addContract'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.oninput = syncDashboard;
    });
}

// --- 动态行 ---
function addSummaryItem(t = "标题 Label", c = "内容详情 Content...") {
    const div = document.createElement('div');
    div.className = 'summary-item';
    div.innerHTML = `<div contenteditable="true" style="color:var(--apple-blue); font-weight:600;">${t}</div><div contenteditable="true">${c}</div><button class="delete-btn-inline">&minus;</button>`;
    div.querySelector('button').onclick = () => div.remove();
    document.getElementById('summaryItemsContainer').appendChild(div);
}
function initSummaryEngine() { 
    const btn = document.getElementById('addSummaryRow');
    if(btn) btn.onclick = () => addSummaryItem(); 
}

function addTableRow(tbodyId, data = ["-", "-", "-", "0%"]) {
    const tbody = document.getElementById(tbodyId);
    if(!tbody) return;
    const tr = document.createElement('tr');
    data.forEach(val => { const td = document.createElement('td'); td.contentEditable = "true"; td.innerText = val; tr.appendChild(td); });
    const delTd = document.createElement('td'); delTd.className = "no-print";
    delTd.innerHTML = `<button class="delete-btn-inline" style="opacity:1">&minus;</button>`;
    delTd.onclick = () => tr.remove();
    tr.appendChild(delTd);
    tbody.appendChild(tr);
}
function initDetailedProgress() { 
    const btn = document.querySelector('[data-table="progressTableBody"]');
    if(btn) btn.onclick = () => addTableRow('progressTableBody'); 
}
function initQualityManageModule() { 
    const btn = document.querySelector('[data-table="qualityTableBody"]');
    if(btn) btn.onclick = () => addTableRow('qualityTableBody', ["主题", "问题", "解决"]); 
}
function initRiskManageModule() { 
    const btn = document.querySelector('[data-table="riskTableBody"]');
    if(btn) btn.onclick = () => addTableRow('riskTableBody', ["描述", "解决", "执行方", "最后期限", "状态"]); 
}

// --- 媒体渲染 ---
async function addImageToGrid(grid, src, note = "备注 Note...") {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.innerHTML = `<img src="${src}"><div class="thumb-note" contenteditable="true">${note}</div><button class="delete-btn-inline" style="position:absolute; top:4px; right:4px; opacity:1; color:#fff;">&times;</button>`;
    item.querySelector('img').onclick = () => { document.getElementById('fullImage').src = src; document.getElementById('imageViewer').classList.remove('hidden'); };
    item.querySelector('button').onclick = () => item.remove();
    grid.appendChild(item);
}

function createMediaSection(containerId, title = "新分类 Category") {
    const div = document.createElement('div');
    div.className = 'glass-card';
    div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><h3 class="card-title" contenteditable="true" style="margin-bottom:0">${title}</h3><button class="delete-btn-inline" style="opacity:1">&times;</button></div><div class="drop-zone no-print"><p>上传图片 Upload</p><input type="file" hidden multiple accept="image/*"></div><div class="thumbnail-grid"></div>`;
    const zone = div.querySelector('.drop-zone'), inp = zone.querySelector('input'), grid = div.querySelector('.thumbnail-grid');
    zone.onclick = () => inp.click();
    inp.onchange = async (e) => { for(let f of e.target.files) addImageToGrid(grid, await toBase64(f)); inp.value=''; };
    div.querySelector('.delete-btn-inline').onclick = () => div.remove();
    document.getElementById(containerId).appendChild(div);
}

function addComparisonRow() {
    const row = document.createElement('div'); row.className = 'comp-row';
    row.innerHTML = `<button class="delete-btn-inline" style="position:absolute; top:5px; right:5px; opacity:1; z-index:10;">&times;</button><div class="comp-col"><div class="comp-label">问题 ISSUE</div><div class="drop-zone no-print"><p>上传问题照</p><input type="file" hidden accept="image/*"></div><div class="thumbnail-grid"></div></div><div class="comp-col"><div class="comp-label">整改 FIX</div><div class="drop-zone no-print"><p>上传整改照</p><input type="file" hidden accept="image/*"></div><div class="thumbnail-grid"></div></div>`;
    row.querySelectorAll('.drop-zone').forEach(z => {
        const inp = z.querySelector('input'), g = z.nextElementSibling;
        z.onclick = () => inp.click();
        inp.onchange = async (e) => { g.innerHTML = ''; addImageToGrid(g, await toBase64(e.target.files[0])); inp.value=''; };
    });
    row.querySelector('button').onclick = () => row.remove();
    document.getElementById('comparisonContainer').appendChild(row);
}

function initMaterialModule() { 
    const btn = document.getElementById('addMaterialSection');
    if(btn) btn.onclick = () => createMediaSection('materialSectionsContainer'); 
}
function initSiteDocModule() {
    document.querySelectorAll('#siteDocSectionsContainer .drop-zone').forEach(zone => {
        const inp = zone.querySelector('input'), grid = zone.nextElementSibling;
        zone.onclick = () => inp.click();
        inp.onchange = async (e) => { for(let f of e.target.files) addImageToGrid(grid, await toBase64(f)); inp.value=''; };
    });
}
function initSiteIssueModule() { 
    const btn = document.getElementById('addComparisonRow');
    if(btn) btn.onclick = () => addComparisonRow(); 
}

// --- PDF 逻辑 ---
function initCostModule() {
    const input = document.getElementById('pdfInput'), grid = document.getElementById('pdfGrid');
    const trigger = document.getElementById('pdfTrigger');
    if(trigger) trigger.onclick = () => input.click();
    if(input) input.onchange = async (e) => { 
        for(let f of e.target.files) { 
            if(f.type === "application/pdf") {
                const b64 = await toBase64(f);
                addPdfItem(grid, f.name, b64);
                renderPdfPages(f.name, b64);
            } 
        } 
        input.value = '';
    };
    const noteBtn = document.getElementById('addCostNoteRow');
    if(noteBtn) noteBtn.onclick = () => {
        const div = document.createElement('div'); div.className = 'summary-item';
        div.innerHTML = `<div contenteditable="true" style="color:var(--apple-blue); font-weight:600;">项目标题 Item</div><div contenteditable="true">详细描述...</div><button class="delete-btn-inline">&minus;</button>`;
        div.querySelector('button').onclick = () => div.remove();
        document.getElementById('costNotesContainer').appendChild(div);
    };
}

function addPdfItem(grid, name, base64) {
    const item = document.createElement('div'); 
    item.className = 'thumb-item pdf-doc-entry';
    item.setAttribute('data-pdf', base64);
    item.setAttribute('data-name', name);
    item.innerHTML = `<div class="pdf-preview"><i class="fa-solid fa-file-pdf"></i></div><div class="thumb-note" contenteditable="true">${name}</div><button class="delete-btn-inline" style="position:absolute; top:4px; right:4px; opacity:1;">&times;</button>`;
    item.querySelector('.pdf-preview').onclick = () => openPdf(base64);
    item.querySelector('button').onclick = () => {
        item.remove();
        const fullPrev = document.querySelector(`.pdf-pages-group[data-pdf-name="${name}"]`);
        if(fullPrev) fullPrev.remove();
    };
    grid.appendChild(item);
}

async function renderPdfPages(name, base64) {
    const area = document.getElementById('pdfFullPreviewArea');
    const group = document.createElement('div');
    group.className = 'pdf-pages-group glass-card';
    group.setAttribute('data-pdf-name', name);
    group.innerHTML = `<h4 class="card-title" style="font-size:12px; opacity:0.6;">文件全页预览: ${name}</h4><div class="pdf-pages-container"></div>`;
    area.appendChild(group);

    const container = group.querySelector('.pdf-pages-container');
    const pdfData = atob(base64.split(',')[1]);
    const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({scale: 1.5});
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({canvasContext: context, viewport: viewport}).promise;
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.8);
        img.className = 'pdf-page-img';
        container.appendChild(img);
    }
}

function openPdf(base64) {
    const blob = base64ToBlob(base64, 'application/pdf');
    window.open(URL.createObjectURL(blob), '_blank');
}

// --- 文件持久化 ---
function collectAllReportData() {
    const getList = (selector) => Array.from(document.querySelectorAll(selector));
    return {
        header: { 
            project: document.getElementById('projectName').innerText, 
            reportNo: document.getElementById('reportNo').innerText, 
            reportDate: document.getElementById('reportDate').innerText, 
            pm: document.getElementById('pmName').innerText, 
            client: document.getElementById('clientName').innerText, 
            addr: document.getElementById('projAddress').innerText, 
            reporter: document.getElementById('reporterName').innerText, 
            start: document.getElementById('startDate').value, 
            end: document.getElementById('endDate').value 
        },
        dashboard: { 
            total: document.getElementById('totalDays').innerText, 
            worked: document.getElementById('workedDays').innerText, 
            workers: document.getElementById('workerNum').innerText, 
            base: document.getElementById('baseContract').value, 
            add: document.getElementById('addContract').value, 
            workItems: getList('#workList .bar-row').map(r => ({ n: r.querySelector('.bar-name').innerText, p: r.querySelector('.bar-input').value })) 
        },
        summaries: getList('#summaryItemsContainer .summary-item').map(s => ({ t: s.children[0].innerText, c: s.children[1].innerText })),
        progressTable: getList('#progressTableBody tr').map(tr => Array.from(tr.cells).slice(0,4).map(c => c.innerText)),
        qualityTable: getList('#qualityTableBody tr').map(tr => Array.from(tr.cells).slice(0,3).map(c => c.innerText)),
        riskTable: getList('#riskTableBody tr').map(tr => Array.from(tr.cells).slice(0,5).map(c => c.innerText)),
        materialHTML: document.getElementById('materialSectionsContainer').innerHTML,
        siteDocNormalHTML: document.getElementById('siteDocSectionsContainer').innerHTML,
        siteDocCompHTML: document.getElementById('comparisonContainer').innerHTML,
        costDocHTML: document.getElementById('pdfGrid').innerHTML,
        costNotesHTML: document.getElementById('costNotesContainer').innerHTML
    };
}

function restoreReportFromData(data) {
    if(!data) return;
    try {
        const h = data.header;
        document.getElementById('projectName').innerText = h.project; 
        document.getElementById('reportNo').innerText = h.reportNo; 
        document.getElementById('reportDate').innerText = h.reportDate; 
        document.getElementById('pmName').innerText = h.pm; 
        document.getElementById('clientName').innerText = h.client; 
        document.getElementById('projAddress').innerText = h.addr; 
        document.getElementById('reporterName').innerText = h.reporter; 
        document.getElementById('startDate').value = h.start; 
        document.getElementById('endDate').value = h.end;
        
        const d = data.dashboard;
        document.getElementById('totalDays').innerText = d.total; 
        document.getElementById('workedDays').innerText = d.worked; 
        document.getElementById('workerNum').innerText = d.workers; 
        document.getElementById('baseContract').value = d.base; 
        document.getElementById('addContract').value = d.add;
        
        document.getElementById('workList').innerHTML = ''; 
        d.workItems.forEach(it => addDashboardRow(it.n, it.p));
        document.getElementById('summaryItemsContainer').innerHTML = ''; 
        data.summaries.forEach(it => addSummaryItem(it.t, it.c));
        document.getElementById('progressTableBody').innerHTML = ''; 
        data.progressTable.forEach(row => addTableRow('progressTableBody', row));
        document.getElementById('qualityTableBody').innerHTML = ''; 
        data.qualityTable.forEach(row => addTableRow('qualityTableBody', row));
        document.getElementById('riskTableBody').innerHTML = ''; 
        data.riskTable.forEach(row => addTableRow('riskTableBody', row));
        
        if(data.materialHTML) document.getElementById('materialSectionsContainer').innerHTML = data.materialHTML;
        if(data.siteDocNormalHTML) document.getElementById('siteDocSectionsContainer').innerHTML = data.siteDocNormalHTML;
        if(data.siteDocCompHTML) document.getElementById('comparisonContainer').innerHTML = data.siteDocCompHTML;
        if(data.costDocHTML) document.getElementById('pdfGrid').innerHTML = data.costDocHTML;
        if(data.costNotesHTML) document.getElementById('costNotesContainer').innerHTML = data.costNotesHTML;

        // 恢复 PDF 预览
        document.getElementById('pdfFullPreviewArea').innerHTML = '';
        document.querySelectorAll('.pdf-doc-entry').forEach(entry => {
            renderPdfPages(entry.getAttribute('data-name'), entry.getAttribute('data-pdf'));
        });

        rebindEvents();
        syncDashboard();
    } catch(err) { console.error("Restore Error:", err); }
}

function rebindEvents() {
    document.querySelectorAll('.delete-btn-inline').forEach(btn => btn.onclick = function() { 
        const parent = this.parentElement;
        if(parent.classList.contains('pdf-doc-entry')) {
            const name = parent.getAttribute('data-name');
            const fullPrev = document.querySelector(`.pdf-pages-group[data-pdf-name="${name}"]`);
            if(fullPrev) fullPrev.remove();
        }
        parent.remove(); 
        syncDashboard(); 
    });
    document.querySelectorAll('.thumb-item img').forEach(img => img.onclick = function() { document.getElementById('fullImage').src = this.src; document.getElementById('imageViewer').classList.remove('hidden'); });
    document.querySelectorAll('.pdf-preview').forEach(p => {
        p.onclick = () => openPdf(p.parentElement.getAttribute('data-pdf'));
    });
    document.querySelectorAll('.drop-zone').forEach(z => {
        const inp = z.querySelector('input'), grid = z.nextElementSibling;
        if(inp && grid) {
            z.onclick = () => inp.click();
            inp.onchange = async (e) => { 
                for(let f of e.target.files) addImageToGrid(grid, await toBase64(f)); 
                inp.value = ''; 
            };
        }
    });
}

function initFileHandling() {
    const fileInp = document.getElementById('fileLoaderInput');
    document.getElementById('quickSaveBtn').onclick = () => { localStorage.setItem('DesignPM_AutoSave', JSON.stringify(collectAllReportData())); showStatus('修改已暂存 Saved Successfully'); };
    document.getElementById('saveToFileBtn').onclick = () => { 
        const blob = new Blob([JSON.stringify(collectAllReportData(), null, 2)], { type: 'application/json' }); 
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); 
        a.download = `${document.getElementById('projectName').innerText}_${new Date().toLocaleDateString()}.json`; a.click(); 
    };
    document.getElementById('loadFileBtn').onclick = () => fileInp.click();
    fileInp.onchange = (e) => { const reader = new FileReader(); reader.onload = (ev) => { restoreReportFromData(JSON.parse(ev.target.result)); showStatus('文件加载成功 Loaded'); }; reader.readAsText(e.target.files[0]); e.target.value = ''; };
}

function initPrintSystem() {
    const modal = document.getElementById('printModal'), list = document.getElementById('printModuleList');
    document.getElementById('printReportBtn').onclick = () => {
        list.innerHTML = '';
        document.querySelectorAll('.nav-link').forEach(link => {
            const div = document.createElement('div'); div.className = 'print-item';
            div.innerHTML = `<input type="checkbox" checked value="${link.dataset.target}"> <span>${link.innerText}</span>`;
            list.appendChild(div);
        });
        modal.classList.remove('hidden');
    };
    document.getElementById('cancelPrint').onclick = () => modal.classList.add('hidden');
    document.getElementById('startPrint').onclick = () => {
        const selected = Array.from(list.querySelectorAll('input:checked')).map(i => i.value);
        if(!selected.length) return;
        modal.classList.add('hidden');
        document.querySelectorAll('.module').forEach(m => { m.classList.remove('print-active'); if(selected.includes(m.id)) m.classList.add('print-active'); });
        setTimeout(() => window.print(), 500);
    };
}

// --- 工具 ---
async function toBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }
function base64ToBlob(base64, type) { const byteCharacters = atob(base64.split(',')[1]); const byteNumbers = new Array(byteCharacters.length); for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i); return new Blob([new Uint8Array(byteNumbers)], {type: type}); }
function showStatus(txt) { const s = document.getElementById('appStatus'); document.getElementById('statusText').innerText = txt; s.classList.remove('hidden'); setTimeout(() => s.classList.add('hidden'), 3000); }
function initImageViewer() { const v = document.getElementById('imageViewer'); document.querySelector('.close-v').onclick = () => v.classList.add('hidden'); v.onclick = (e) => { if(e.target === v) v.classList.add('hidden'); }; }
function loadLocalStore() { const last = localStorage.getItem('DesignPM_AutoSave'); if (last) restoreReportFromData(JSON.parse(last)); }