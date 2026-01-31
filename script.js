// 全局变量
let currentReport = {
    id: generateId(),
    title: '项目管理周报',
    date: new Date().toISOString().split('T')[0],
    data: {}
};
let photos = {};
let activeModule = 'dashboard';
let pieChart = null;
let sharedReports = {};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    // 设置日期
    setupDates();
    
    // 初始化所有可编辑区域
    initEditableAreas();
    
    // 初始化表格
    initTables();
    
    // 初始化图片上传
    initImageUpload();
    
    // 初始化导航
    initNavigation();
    
    // 初始化仪表盘图表
    initDashboardCharts();
    
    // 加载保存的数据
    loadSavedData();
    
    // 设置自动保存
    setupAutoSave();
    
    // 初始化工具栏按钮
    initToolbarButtons();
    
    // 初始化打印模态框
    initPrintModal();
    
    // 初始化文件操作按钮
    initFileOperations();
}

// ===========================
// 文件保存和加载功能
// ===========================

// 初始化文件操作
function initFileOperations() {
    const saveFileBtn = document.getElementById('saveFileBtn');
    const loadFileBtn = document.getElementById('loadFileBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (saveFileBtn) {
        saveFileBtn.addEventListener('click', saveReportToFile);
    }
    
    if (loadFileBtn) {
        loadFileBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', loadReportFromFile);
    }
}

// 保存报告到文件
function saveReportToFile() {
    showLoading(true);
    
    try {
        // 保存当前内容
        saveContent();
        savePhotos();
        
        // 收集所有数据
        const reportData = collectAllDataForSave();
        
        // 创建文件名
        const dateRange = `${document.getElementById('startDate').value}_${document.getElementById('endDate').value}`;
        const clientName = document.querySelector('.info-item:nth-child(3) .editable-field')?.textContent || '项目';
        const fileName = `项目管理周报_${clientName}_${dateRange}.json`;
        
        // 创建JSON字符串
        const jsonString = JSON.stringify(reportData, null, 2);
        
        // 创建Blob并下载
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showLoading(false);
        showTempMessage(`报告已保存为文件: ${fileName}`, 'success');
        
    } catch (error) {
        console.error('保存文件失败:', error);
        showLoading(false);
        showTempMessage('保存文件失败: ' + error.message, 'error');
    }
}

// 收集所有数据用于保存
function collectAllDataForSave() {
    // 获取报告基本信息
    const reportInfo = {
        title: document.querySelector('.report-title').textContent,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        currentDate: document.getElementById('currentDate').textContent,
        reportId: currentReport.id,
        savedAt: new Date().toISOString(),
        version: '2.0'
    };
    
    // 获取标题信息
    const headerInfo = {
        reportNumber: document.querySelector('.info-item:nth-child(1) .editable-field')?.textContent || '',
        designer: document.querySelector('.info-item:nth-child(2) .editable-field')?.textContent || '',
        client: document.querySelector('.info-item:nth-child(3) .editable-field')?.textContent || '',
        address: document.querySelector('.info-item:nth-child(4) .editable-field')?.textContent || '',
        stage: document.querySelector('.info-item:nth-child(5) .editable-field')?.textContent || '',
        reporter: document.getElementById('reporterName')?.textContent || ''
    };
    
    // 获取仪表盘数据
    const dashboardData = getDashboardData();
    
    // 获取模块内容数据
    const modulesData = {
        summary: document.querySelector('#summaryModule .editable-area')?.innerHTML || '',
        progress: getTableData('progressTable'),
        quality: getTableData('qualityTable'),
        risks: getTableData('risksTable'),
        cost: document.querySelector('#costModule .editable-area')?.innerHTML || ''
    };
    
    // 压缩图片数据（移除data URL前缀以减小文件大小）
    const compressedPhotos = {};
    for (const section in photos) {
        if (photos[section] && Array.isArray(photos[section])) {
            compressedPhotos[section] = photos[section].map(photo => ({
                id: photo.id,
                name: photo.name,
                data: photo.data.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: photo.data.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg',
                date: photo.date,
                caption: photo.caption
            }));
        }
    }
    
    // 组装完整数据
    const completeData = {
        metadata: {
            type: '项目管理周报',
            version: '2.0',
            created: new Date().toISOString(),
            application: '室内设计项目管理工具'
        },
        reportInfo: reportInfo,
        headerInfo: headerInfo,
        dashboard: dashboardData,
        modules: modulesData,
        photos: compressedPhotos,
        config: {
            activeModule: activeModule,
            lastSaved: currentReport.lastSaved || new Date().toISOString()
        }
    };
    
    return completeData;
}

// 从文件加载报告
function loadReportFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.name.endsWith('.json')) {
        showTempMessage('请选择JSON格式的文件', 'error');
        return;
    }
    
    showLoading(true);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileData = JSON.parse(e.target.result);
            
            // 验证文件格式
            if (!fileData.metadata || fileData.metadata.type !== '项目管理周报') {
                throw new Error('无效的报告文件格式');
            }
            
            // 恢复报告数据
            restoreReportFromData(fileData);
            
            // 清空文件输入，以便可以再次选择同一个文件
            event.target.value = '';
            
            showLoading(false);
            showTempMessage(`报告加载成功: ${file.name}`, 'success');
            
        } catch (error) {
            console.error('加载文件失败:', error);
            showLoading(false);
            showTempMessage('加载文件失败: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showLoading(false);
        showTempMessage('读取文件失败', 'error');
    };
    
    reader.readAsText(file);
}

// 从数据恢复报告
function restoreReportFromData(fileData) {
    try {
        // 验证必要的数据结构
        if (!fileData.reportInfo || !fileData.headerInfo || !fileData.dashboard) {
            throw new Error('报告文件数据不完整');
        }
        
        // 1. 恢复报告基本信息
        const reportInfo = fileData.reportInfo;
        document.getElementById('startDate').value = reportInfo.startDate || '';
        document.getElementById('endDate').value = reportInfo.endDate || '';
        document.getElementById('currentDate').textContent = reportInfo.currentDate || '';
        
        // 更新当前报告ID
        if (reportInfo.reportId) {
            currentReport.id = reportInfo.reportId;
        }
        
        // 2. 恢复标题信息
        const headerInfo = fileData.headerInfo;
        const fields = [
            { selector: '.info-item:nth-child(1) .editable-field', value: headerInfo.reportNumber },
            { selector: '.info-item:nth-child(2) .editable-field', value: headerInfo.designer },
            { selector: '.info-item:nth-child(3) .editable-field', value: headerInfo.client },
            { selector: '.info-item:nth-child(4) .editable-field', value: headerInfo.address },
            { selector: '.info-item:nth-child(5) .editable-field', value: headerInfo.stage }
        ];
        
        fields.forEach(field => {
            const element = document.querySelector(field.selector);
            if (element && field.value !== undefined) {
                element.textContent = field.value;
            }
        });
        
        if (headerInfo.reporter && document.getElementById('reporterName')) {
            document.getElementById('reporterName').textContent = headerInfo.reporter;
        }
        
        // 3. 恢复仪表盘数据
        restoreDashboardData(fileData.dashboard);
        
        // 4. 恢复模块内容
        const modulesData = fileData.modules || {};
        
        // 恢复核心摘要
        if (modulesData.summary && document.querySelector('#summaryModule .editable-area')) {
            document.querySelector('#summaryModule .editable-area').innerHTML = modulesData.summary;
        }
        
        // 恢复表格数据
        if (modulesData.progress) restoreTableData('progressTable', modulesData.progress);
        if (modulesData.quality) restoreTableData('qualityTable', modulesData.quality);
        if (modulesData.risks) restoreTableData('risksTable', modulesData.risks);
        
        // 恢复成本管理
        if (modulesData.cost && document.querySelector('#costModule .editable-area')) {
            document.querySelector('#costModule .editable-area').innerHTML = modulesData.cost;
        }
        
        // 5. 恢复图片数据
        restorePhotosFromData(fileData.photos || {});
        
        // 6. 恢复配置
        const config = fileData.config || {};
        if (config.activeModule) {
            setTimeout(() => {
                switchModule(config.activeModule);
            }, 100);
        }
        
        // 更新当前报告对象
        currentReport.data = {
            dashboard: fileData.dashboard,
            summary: modulesData.summary,
            progress: modulesData.progress,
            quality: modulesData.quality,
            risks: modulesData.risks,
            cost: modulesData.cost
        };
        
        currentReport.lastSaved = config.lastSaved || new Date().toISOString();
        
        // 保存到本地存储
        saveToLocalStorage();
        
        console.log('报告恢复成功');
        
    } catch (error) {
        console.error('恢复报告失败:', error);
        throw error;
    }
}

// 从数据恢复图片
function restorePhotosFromData(photosData) {
    // 清空现有图片
    photos = {};
    
    // 清空所有图片网格
    document.querySelectorAll('.photos-grid').forEach(grid => {
        grid.innerHTML = '';
    });
    
    // 恢复每个section的图片
    for (const section in photosData) {
        if (photosData[section] && Array.isArray(photosData[section])) {
            photos[section] = [];
            
            photosData[section].forEach(photoData => {
                try {
                    // 重新构建data URL
                    const mimeType = photoData.mimeType || 'image/jpeg';
                    const dataUrl = `data:${mimeType};base64,${photoData.data}`;
                    
                    const restoredPhoto = {
                        id: photoData.id || generateId(),
                        name: photoData.name || '未命名图片',
                        data: dataUrl,
                        date: photoData.date || new Date().toISOString(),
                        caption: photoData.caption || ''
                    };
                    
                    // 添加到网格
                    addPhotoToGrid(restoredPhoto, section);
                    
                    // 保存到photos对象
                    photos[section].push(restoredPhoto);
                    
                } catch (error) {
                    console.error(`恢复图片失败 (${section}):`, error);
                }
            });
        }
    }
    
    // 保存图片到本地存储
    savePhotos();
}

// ===========================
// 原有功能（保持不变）
// ===========================

// 设置日期
function setupDates() {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    
    document.getElementById('startDate').value = formatDate(startDate);
    document.getElementById('endDate').value = formatDate(today);
    document.getElementById('currentDate').textContent = formatDate(today, 'yyyy/mm/dd');
    
    // 监听日期变化
    document.getElementById('startDate').addEventListener('change', updateReportDates);
    document.getElementById('endDate').addEventListener('change', updateReportDates);
}

// 格式化日期
function formatDate(date, format = 'yyyy-mm-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (format === 'yyyy/mm/dd') {
        return `${year}/${month}/${day}`;
    }
    return `${year}-${month}-${day}`;
}

// 更新报告日期显示
function updateReportDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        debounce(saveContent, 500)();
    }
}

// 初始化所有可编辑区域
function initEditableAreas() {
    document.querySelectorAll('[contenteditable="true"]').forEach(element => {
        element.addEventListener('blur', saveContent);
        element.addEventListener('input', debounce(saveContent, 1000));
        
        element.addEventListener('focus', function() {
            this.style.backgroundColor = '#f0f7ff';
        });
        
        element.addEventListener('blur', function() {
            this.style.backgroundColor = '';
        });
    });
}

// 初始化表格
function initTables() {
    document.getElementById('addRowBtn').addEventListener('click', addTableRow);
    document.getElementById('deleteRowBtn').addEventListener('click', deleteTableRow);
    
    initTable('progressTable');
    initTable('qualityTable');
    initTable('risksTable');
}

// 初始化单个表格
function initTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    table.querySelectorAll('td').forEach(cell => {
        cell.contentEditable = true;
        cell.addEventListener('blur', saveContent);
        cell.addEventListener('input', debounce(saveContent, 1000));
    });
}

// 初始化仪表盘图表
function initDashboardCharts() {
    const costInputs = document.querySelectorAll('.cost-input-pie');
    costInputs.forEach(input => {
        input.addEventListener('input', updateCostPieChart);
        input.addEventListener('blur', formatCostInput);
    });
    
    const completionInputs = document.querySelectorAll('.completion-input');
    completionInputs.forEach(input => {
        input.addEventListener('input', updateCompletionChart);
        input.addEventListener('blur', formatCompletionInput);
    });
    
    const completionLabels = document.querySelectorAll('.completion-chart .bar-label');
    completionLabels.forEach(label => {
        label.addEventListener('blur', saveContent);
        label.addEventListener('input', debounce(saveContent, 1000));
        
        label.addEventListener('focus', function() {
            this.style.backgroundColor = '#f0f7ff';
            this.style.border = '1px solid #1890ff';
        });
        
        label.addEventListener('blur', function() {
            this.style.backgroundColor = '';
            this.style.border = 'none';
        });
    });
    
    const totalDaysElement = document.getElementById('totalDays');
    const workedDaysElement = document.getElementById('workedDays');
    
    if (totalDaysElement) {
        totalDaysElement.addEventListener('input', updateProjectSummary);
        totalDaysElement.addEventListener('blur', formatDaysInput);
    }
    
    if (workedDaysElement) {
        workedDaysElement.addEventListener('input', updateProjectSummary);
        workedDaysElement.addEventListener('blur', formatDaysInput);
    }
    
    initPieChart();
    updateCostPieChart();
    updateCompletionChart();
    updateProjectSummary();
}

// 初始化饼状图
function initPieChart() {
    const canvas = document.getElementById('costPieChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    pieChart = {
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: ['原合同', '增项'],
            values: [1900000, 276200],
            colors: ['#1890ff', '#52c41a'],
            borderColors: ['#ffffff', '#ffffff']
        }
    };
    
    drawPieChart();
}

// 绘制饼状图
function drawPieChart() {
    if (!pieChart) return;
    
    const ctx = pieChart.ctx;
    const canvas = pieChart.canvas;
    const data = pieChart.data;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const total = data.values.reduce((sum, value) => sum + value, 0);
    
    if (total === 0) {
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('无数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    let startAngle = 0;
    
    for (let i = 0; i < data.values.length; i++) {
        const value = data.values[i];
        const sliceAngle = (value / total) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 
                startAngle, startAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = data.colors[i];
        ctx.fill();
        
        ctx.strokeStyle = data.borderColors[i];
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const midAngle = startAngle + sliceAngle / 2;
        const textRadius = canvas.width / 2 - 25;
        const textX = canvas.width / 2 + Math.cos(midAngle) * textRadius;
        const textY = canvas.height / 2 + Math.sin(midAngle) * textRadius;
        
        const percentage = ((value / total) * 100).toFixed(1);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(percentage + '%', textX, textY);
        
        startAngle += sliceAngle;
    }
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('总成本', canvas.width / 2, canvas.height / 2);
}

// 格式化成本输入
function formatCostInput(e) {
    const input = e.target;
    let value = input.value.replace(/[^0-9.]/g, '');
    
    if (value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            input.value = `¥${numValue.toLocaleString()}`;
        }
    }
    updateCostPieChart();
}

// 格式化完成率输入
function formatCompletionInput(e) {
    const input = e.target;
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value) {
        let numValue = parseInt(value);
        numValue = Math.min(Math.max(numValue, 0), 100);
        input.value = `${numValue}%`;
    }
    updateCompletionChart();
}

// 格式化天数输入
function formatDaysInput(e) {
    const input = e.target;
    let value = input.textContent.replace(/[^0-9]/g, '');
    
    if (value) {
        let numValue = parseInt(value);
        numValue = Math.max(numValue, 0);
        input.textContent = numValue;
    }
    updateProjectSummary();
}

// 更新成本控制饼状图
function updateCostPieChart() {
    const originalInput = document.querySelector('.cost-input-pie[data-chart="original"]');
    const variationInput = document.querySelector('.cost-input-pie[data-chart="variation"]');
    
    const originalValue = parseFloat(originalInput.value.replace(/[^0-9.]/g, '')) || 0;
    const variationValue = parseFloat(variationInput.value.replace(/[^0-9.]/g, '')) || 0;
    const totalCost = originalValue + variationValue;
    
    const totalCostElement = document.getElementById('totalCostValue');
    if (totalCostElement) {
        totalCostElement.textContent = `¥${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    
    if (pieChart) {
        pieChart.data.values = [originalValue, variationValue];
        drawPieChart();
    }
    
    debounce(saveContent, 500)();
}

// 更新完工率图表
function updateCompletionChart() {
    const inputs = document.querySelectorAll('.completion-input');
    let totalCompletion = 0;
    let validCount = 0;
    
    inputs.forEach(input => {
        let value = input.value.replace(/[^0-9]/g, '');
        const percent = value ? Math.min(Math.max(parseInt(value), 0), 100) : 0;
        
        const stageId = input.dataset.stage;
        const fillElement = document.querySelector(`.fill[data-stage="${stageId}"]`);
        if (fillElement) {
            fillElement.style.width = `${percent}%`;
            fillElement.setAttribute('data-value', `${percent}%`);
        }
        
        if (percent >= 0) {
            totalCompletion += percent;
            validCount++;
        }
    });
    
    const projectCompletionElement = document.getElementById('projectCompletion');
    if (projectCompletionElement) {
        const projectCompletion = validCount > 0 ? Math.round(totalCompletion / validCount) : 0;
        projectCompletionElement.textContent = `${projectCompletion}%`;
    }
    
    debounce(saveContent, 500)();
}

// 更新项目概况
function updateProjectSummary() {
    const totalDaysElement = document.getElementById('totalDays');
    const workedDaysElement = document.getElementById('workedDays');
    const remainingDaysElement = document.getElementById('remainingDays');
    const completionByDaysElement = document.getElementById('completionByDays');
    
    if (!totalDaysElement || !workedDaysElement || !remainingDaysElement || !completionByDaysElement) return;
    
    const totalDays = parseInt(totalDaysElement.textContent) || 0;
    const workedDays = parseInt(workedDaysElement.textContent) || 0;
    const remainingDays = Math.max(totalDays - workedDays, 0);
    
    remainingDaysElement.textContent = remainingDays;
    
    const completionByDays = totalDays > 0 ? Math.round((workedDays / totalDays) * 100) : 0;
    completionByDaysElement.textContent = `${completionByDays}%`;
    
    debounce(saveContent, 500)();
}

// 初始化图片上传
function initImageUpload() {
    loadPhotos();
    
    document.querySelectorAll('.upload-area').forEach(uploadArea => {
        const section = uploadArea.dataset.section;
        const fileInput = uploadArea.querySelector('.file-input');
        const browseLink = uploadArea.querySelector('.browse-link');
        
        if (!photos[section]) {
            photos[section] = [];
        }
        
        uploadArea.addEventListener('click', function(e) {
            if (e.target.classList.contains('browse-link')) return;
            fileInput.click();
        });
        
        if (browseLink) {
            browseLink.addEventListener('click', function(e) {
                e.stopPropagation();
                fileInput.click();
            });
        }
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            handleImageFiles(e.dataTransfer.files, section);
        });
        
        fileInput.addEventListener('change', function(e) {
            handleImageFiles(e.target.files, section);
            this.value = '';
        });
    });
}

// 处理图片文件
function handleImageFiles(files, section) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    Array.from(files).forEach(file => {
        if (!validTypes.includes(file.type)) {
            showTempMessage(`文件 ${file.name} 不是支持的图片格式`, 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showTempMessage(`文件 ${file.name} 超过5MB大小限制`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoData = {
                id: generateId(),
                name: file.name,
                data: e.target.result,
                date: new Date().toISOString(),
                caption: file.name
            };
            
            addPhotoToGrid(photoData, section);
            photos[section].push(photoData);
            savePhotos();
            showTempMessage(`图片 "${file.name}" 上传成功`, 'success');
        };
        reader.onerror = function() {
            showTempMessage(`文件 ${file.name} 读取失败`, 'error');
        };
        reader.readAsDataURL(file);
    });
}

// 添加图片到网格
function addPhotoToGrid(photoData, section) {
    const grid = document.querySelector(`.photos-grid[data-grid="${section}"]`);
    if (!grid) {
        console.error(`找不到网格: ${section}`);
        return;
    }
    
    const photoId = photoData.id;
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.dataset.id = photoId;
    
    photoItem.innerHTML = `
        <img src="${photoData.data}" alt="${photoData.name}">
        <div class="photo-actions">
            <button class="btn btn-sm delete-photo" title="删除">
                <i class="fas fa-trash"></i>
            </button>
            <button class="btn btn-sm view-photo" title="查看">
                <i class="fas fa-expand"></i>
            </button>
        </div>
        <div class="photo-caption" contenteditable="true">${photoData.caption}</div>
    `;
    
    if (grid.firstChild) {
        grid.insertBefore(photoItem, grid.firstChild);
    } else {
        grid.appendChild(photoItem);
    }
    
    const deleteBtn = photoItem.querySelector('.delete-photo');
    const viewBtn = photoItem.querySelector('.view-photo');
    const caption = photoItem.querySelector('.photo-caption');
    
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deletePhoto(photoId, section);
    });
    
    viewBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        viewPhoto(photoData.data);
    });
    
    caption.addEventListener('blur', function() {
        const photoIndex = photos[section].findIndex(photo => photo.id === photoId);
        if (photoIndex !== -1) {
            photos[section][photoIndex].caption = this.textContent.trim();
            savePhotos();
        }
    });
    
    caption.addEventListener('input', debounce(function() {
        const photoIndex = photos[section].findIndex(photo => photo.id === photoId);
        if (photoIndex !== -1) {
            photos[section][photoIndex].caption = this.textContent.trim();
            savePhotos();
        }
    }, 1000));
}

// 删除图片
function deletePhoto(photoId, section) {
    if (confirm('确定要删除这张照片吗？')) {
        const photoElement = document.querySelector(`.photo-item[data-id="${photoId}"]`);
        if (photoElement) {
            photoElement.remove();
        }
        
        if (photos[section]) {
            photos[section] = photos[section].filter(photo => photo.id !== photoId);
            savePhotos();
            showTempMessage('图片已删除', 'success');
        }
    }
}

// 查看大图
function viewPhoto(imageData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90vw; max-height: 90vh; background: transparent; border: none;">
            <div class="modal-header" style="border: none; justify-content: flex-end; padding: 20px;">
                <span class="close-modal" style="color: white; font-size: 30px;">&times;</span>
            </div>
            <div class="modal-body" style="text-align: center; padding: 0;">
                <img src="${imageData}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 初始化导航
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const moduleId = this.dataset.module;
            switchModule(moduleId);
        });
    });
}

// 切换模块
function switchModule(moduleId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[data-module="${moduleId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    const activeModuleElement = document.getElementById(`${moduleId}Module`);
    if (activeModuleElement) {
        activeModuleElement.classList.add('active');
        activeModule = moduleId;
    }
}

// 表格操作函数
function addTableRow() {
    const activeTable = document.querySelector(`#${activeModule}Module .editable-table`);
    if (!activeTable) return;
    
    const row = activeTable.insertRow();
    const colCount = activeTable.rows[0].cells.length;
    
    for (let i = 0; i < colCount; i++) {
        const cell = row.insertCell();
        cell.contentEditable = true;
        cell.addEventListener('blur', saveContent);
        cell.addEventListener('input', debounce(saveContent, 1000));
        
        if (i === 0) {
            cell.textContent = '新内容';
        }
    }
    
    saveContent();
}

function deleteTableRow() {
    const activeTable = document.querySelector(`#${activeModule}Module .editable-table`);
    if (!activeTable || activeTable.rows.length <= 1) return;
    
    if (confirm('确定要删除最后一行吗？')) {
        activeTable.deleteRow(activeTable.rows.length - 1);
        saveContent();
    }
}

// 初始化工具栏按钮
function initToolbarButtons() {
    document.getElementById('saveBtn').addEventListener('click', function() {
        saveContent();
        savePhotos();
        showTempMessage('报告已保存', 'success');
    });
    
    document.getElementById('printBtn').addEventListener('click', openPrintModal);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('shareBtn').addEventListener('click', shareReport);
}

// 初始化打印模态框
function initPrintModal() {
    const printModal = document.getElementById('printModal');
    const closeModal = printModal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelPrintBtn');
    const confirmBtn = document.getElementById('confirmPrintBtn');
    
    closeModal.addEventListener('click', closePrintModal);
    cancelBtn.addEventListener('click', closePrintModal);
    
    printModal.addEventListener('click', function(e) {
        if (e.target === printModal) {
            closePrintModal();
        }
    });
    
    confirmBtn.addEventListener('click', handlePrint);
    
    const printOptions = document.querySelectorAll('input[name="printOption"]');
    const customOptions = document.getElementById('customPrintOptions');
    
    printOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'custom') {
                customOptions.classList.remove('hidden');
            } else {
                customOptions.classList.add('hidden');
            }
        });
    });
}

// 打开打印模态框
function openPrintModal() {
    document.getElementById('printModal').style.display = 'flex';
}

// 关闭打印模态框
function closePrintModal() {
    document.getElementById('printModal').style.display = 'none';
}

// 处理打印
function handlePrint() {
    const selectedOption = document.querySelector('input[name="printOption"]:checked').value;
    
    if (selectedOption === 'all') {
        printAll();
    } else if (selectedOption === 'current') {
        printCurrent();
    } else if (selectedOption === 'custom') {
        printCustom();
    }
    
    closePrintModal();
}

// 打印全部
function printAll() {
    window.print();
}

// 打印当前模块
function printCurrent() {
    const originalDisplay = {};
    const modules = document.querySelectorAll('.module');
    
    modules.forEach(module => {
        originalDisplay[module.id] = module.style.display;
        module.style.display = 'none';
    });
    
    const currentModule = document.getElementById(`${activeModule}Module`);
    if (currentModule) {
        currentModule.style.display = 'block';
    }
    
    setTimeout(() => {
        window.print();
        
        setTimeout(() => {
            modules.forEach(module => {
                module.style.display = originalDisplay[module.id] || '';
            });
        }, 100);
    }, 100);
}

// 打印自定义选择
function printCustom() {
    const checkboxes = document.querySelectorAll('#customPrintOptions input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        alert('请至少选择一个模块');
        return;
    }
    
    const modulesToPrint = Array.from(checkboxes).map(cb => cb.value);
    const originalDisplay = {};
    const modules = document.querySelectorAll('.module');
    
    modules.forEach(module => {
        originalDisplay[module.id] = module.style.display;
        module.style.display = 'none';
    });
    
    modulesToPrint.forEach(moduleId => {
        const module = document.getElementById(`${moduleId}Module`);
        if (module) {
            module.style.display = 'block';
        }
    });
    
    setTimeout(() => {
        window.print();
        
        setTimeout(() => {
            modules.forEach(module => {
                module.style.display = originalDisplay[module.id] || '';
            });
        }, 100);
    }, 100);
}

// 保存内容
function saveContent() {
    const content = {
        dashboard: getDashboardData(),
        summary: document.querySelector('#summaryModule .editable-area')?.innerHTML || '',
        progress: getTableData('progressTable'),
        quality: getTableData('qualityTable'),
        risks: getTableData('risksTable'),
        cost: document.querySelector('#costModule .editable-area')?.innerHTML || ''
    };
    
    currentReport.data = content;
    currentReport.lastSaved = new Date().toISOString();
    
    saveToLocalStorage();
}

// 获取仪表盘数据
function getDashboardData() {
    const dashboardData = {};
    
    const totalDaysElement = document.getElementById('totalDays');
    const workedDaysElement = document.getElementById('workedDays');
    const remainingDaysElement = document.getElementById('remainingDays');
    const completionByDaysElement = document.getElementById('completionByDays');
    
    if (totalDaysElement) dashboardData.totalDays = totalDaysElement.textContent;
    if (workedDaysElement) dashboardData.workedDays = workedDaysElement.textContent;
    if (remainingDaysElement) dashboardData.remainingDays = remainingDaysElement.textContent;
    if (completionByDaysElement) dashboardData.completionByDays = completionByDaysElement.textContent;
    
    const totalCostElement = document.getElementById('totalCostValue');
    if (totalCostElement) {
        dashboardData.totalCost = totalCostElement.textContent;
    }
    
    const costInputs = document.querySelectorAll('.cost-input-pie');
    if (costInputs.length >= 2) {
        dashboardData.originalContract = costInputs[0].value;
        dashboardData.variationOrder = costInputs[1].value;
    }
    
    const completionInputs = document.querySelectorAll('.completion-input');
    const percentages = {};
    const labels = {};
    const stageIds = ['partition', 'ceiling', 'floor', 'electricity', 'painting', 'furniture'];
    
    completionInputs.forEach((input, index) => {
        if (index < stageIds.length) {
            percentages[stageIds[index]] = input.value;
            
            const label = document.querySelector(`.bar-label[data-stage="${stageIds[index]}"]`);
            if (label) {
                labels[stageIds[index]] = label.textContent;
            }
        }
    });
    
    dashboardData.completion = percentages;
    dashboardData.completionLabels = labels;
    
    const projectCompletionElement = document.getElementById('projectCompletion');
    if (projectCompletionElement) {
        dashboardData.projectCompletion = projectCompletionElement.textContent;
    }
    
    return dashboardData;
}

// 获取表格数据
function getTableData(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return [];
    
    const data = [];
    const rows = table.rows;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowData = [];
        
        for (let j = 0; j < row.cells.length; j++) {
            rowData.push(row.cells[j].textContent.trim());
        }
        
        data.push(rowData);
    }
    
    return data;
}

// 保存图片数据
function savePhotos() {
    try {
        localStorage.setItem(`report_photos_${currentReport.id}`, JSON.stringify(photos));
        return true;
    } catch (error) {
        console.error('保存图片失败:', error);
        if (error.name === 'QuotaExceededError') {
            showTempMessage('本地存储空间不足，无法保存图片', 'error');
        }
        return false;
    }
}

// 加载图片数据
function loadPhotos() {
    const saved = localStorage.getItem(`report_photos_${currentReport.id}`);
    if (saved) {
        try {
            const loadedPhotos = JSON.parse(saved);
            
            document.querySelectorAll('.photos-grid').forEach(grid => {
                grid.innerHTML = '';
            });
            
            for (const section in loadedPhotos) {
                if (loadedPhotos[section] && Array.isArray(loadedPhotos[section])) {
                    photos[section] = loadedPhotos[section];
                    
                    loadedPhotos[section].forEach(photo => {
                        addPhotoToGrid(photo, section);
                    });
                }
            }
            
            console.log('图片加载成功:', Object.keys(photos).length, '个section');
        } catch (error) {
            console.error('加载图片数据失败:', error);
            photos = {};
        }
    } else {
        photos = {};
        
        const sections = [
            'material-samples', 'material-lights', 'material-fixtures', 'material-furniture',
            'photos-overall', 'photos-areas', 'photos-details', 'photos-issues', 'photos-fixes',
            'cost-management'
        ];
        
        sections.forEach(section => {
            photos[section] = [];
        });
    }
}

// 保存到本地存储
function saveToLocalStorage() {
    const reportData = {
        ...currentReport,
        dateRange: {
            start: document.getElementById('startDate').value,
            end: document.getElementById('endDate').value
        },
        headerInfo: {
            reportNumber: document.querySelector('.info-item:nth-child(1) .editable-field')?.textContent || '',
            designer: document.querySelector('.info-item:nth-child(2) .editable-field')?.textContent || '',
            client: document.querySelector('.info-item:nth-child(3) .editable-field')?.textContent || '',
            address: document.querySelector('.info-item:nth-child(4) .editable-field')?.textContent || '',
            stage: document.querySelector('.info-item:nth-child(5) .editable-field')?.textContent || '',
            reporter: document.getElementById('reporterName')?.textContent || '',
            date: document.getElementById('currentDate').textContent
        }
    };
    
    try {
        localStorage.setItem('currentReport', JSON.stringify(reportData));
        return true;
    } catch (error) {
        console.error('保存报告失败:', error);
        if (error.name === 'QuotaExceededError') {
            showTempMessage('本地存储空间不足，无法保存报告', 'error');
        }
        return false;
    }
}

// 加载保存的数据
function loadSavedData() {
    const saved = localStorage.getItem('currentReport');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            
            currentReport = loaded;
            currentReport.id = loaded.id || generateId();
            
            if (loaded.dateRange) {
                document.getElementById('startDate').value = loaded.dateRange.start;
                document.getElementById('endDate').value = loaded.dateRange.end;
            }
            
            if (loaded.headerInfo) {
                const fields = [
                    { selector: '.info-item:nth-child(1) .editable-field', value: loaded.headerInfo.reportNumber },
                    { selector: '.info-item:nth-child(2) .editable-field', value: loaded.headerInfo.designer },
                    { selector: '.info-item:nth-child(3) .editable-field', value: loaded.headerInfo.client },
                    { selector: '.info-item:nth-child(4) .editable-field', value: loaded.headerInfo.address },
                    { selector: '.info-item:nth-child(5) .editable-field', value: loaded.headerInfo.stage }
                ];
                
                fields.forEach(field => {
                    const element = document.querySelector(field.selector);
                    if (element && field.value) {
                        element.textContent = field.value;
                    }
                });
                
                if (loaded.headerInfo.reporter && document.getElementById('reporterName')) {
                    document.getElementById('reporterName').textContent = loaded.headerInfo.reporter;
                }
                
                if (loaded.headerInfo.date) {
                    document.getElementById('currentDate').textContent = loaded.headerInfo.date;
                }
            }
            
            if (loaded.data) {
                if (loaded.data.dashboard) {
                    restoreDashboardData(loaded.data.dashboard);
                }
                
                if (loaded.data.summary && document.querySelector('#summaryModule .editable-area')) {
                    document.querySelector('#summaryModule .editable-area').innerHTML = loaded.data.summary;
                }
                
                restoreTableData('progressTable', loaded.data.progress);
                restoreTableData('qualityTable', loaded.data.quality);
                restoreTableData('risksTable', loaded.data.risks);
                
                if (loaded.data.cost && document.querySelector('#costModule .editable-area')) {
                    document.querySelector('#costModule .editable-area').innerHTML = loaded.data.cost;
                }
            }
            
            console.log('报告数据加载成功');
        } catch (error) {
            console.error('加载数据失败:', error);
            showTempMessage('加载保存的数据失败，已创建新报告', 'error');
        }
    } else {
        saveToLocalStorage();
    }
}

// 恢复仪表盘数据
function restoreDashboardData(dashboardData) {
    if (dashboardData.totalDays && document.getElementById('totalDays')) {
        document.getElementById('totalDays').textContent = dashboardData.totalDays;
    }
    
    if (dashboardData.workedDays && document.getElementById('workedDays')) {
        document.getElementById('workedDays').textContent = dashboardData.workedDays;
    }
    
    if (dashboardData.remainingDays && document.getElementById('remainingDays')) {
        document.getElementById('remainingDays').textContent = dashboardData.remainingDays;
    }
    
    if (dashboardData.completionByDays && document.getElementById('completionByDays')) {
        document.getElementById('completionByDays').textContent = dashboardData.completionByDays;
    }
    
    if (dashboardData.totalCost && document.getElementById('totalCostValue')) {
        document.getElementById('totalCostValue').textContent = dashboardData.totalCost;
    }
    
    if (dashboardData.originalContract) {
        const originalInput = document.querySelector('.cost-input-pie[data-chart="original"]');
        if (originalInput) originalInput.value = dashboardData.originalContract;
    }
    
    if (dashboardData.variationOrder) {
        const variationInput = document.querySelector('.cost-input-pie[data-chart="variation"]');
        if (variationInput) variationInput.value = dashboardData.variationOrder;
    }
    
    if (dashboardData.completion) {
        const completionInputs = document.querySelectorAll('.completion-input');
        const stageIds = ['partition', 'ceiling', 'floor', 'electricity', 'painting', 'furniture'];
        
        completionInputs.forEach((input, index) => {
            if (index < stageIds.length && dashboardData.completion[stageIds[index]]) {
                input.value = dashboardData.completion[stageIds[index]];
                
                const fill = document.querySelector(`.fill[data-stage="${stageIds[index]}"]`);
                if (fill) {
                    const percent = parseInt(dashboardData.completion[stageIds[index]]) || 0;
                    fill.style.width = `${percent}%`;
                    fill.dataset.value = `${percent}%`;
                }
            }
        });
    }
    
    if (dashboardData.completionLabels) {
        const stageIds = ['partition', 'ceiling', 'floor', 'electricity', 'painting', 'furniture'];
        
        stageIds.forEach(stageId => {
            if (dashboardData.completionLabels[stageId]) {
                const label = document.querySelector(`.bar-label[data-stage="${stageId}"]`);
                if (label) {
                    label.textContent = dashboardData.completionLabels[stageId];
                }
            }
        });
    }
    
    if (dashboardData.projectCompletion && document.getElementById('projectCompletion')) {
        document.getElementById('projectCompletion').textContent = dashboardData.projectCompletion;
    }
    
    updateCostPieChart();
    updateCompletionChart();
    updateProjectSummary();
}

// 恢复表格数据
function restoreTableData(tableId, tableData) {
    const table = document.getElementById(tableId);
    if (!table || !tableData || tableData.length === 0) return;
    
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    for (let i = 1; i < tableData.length; i++) {
        const rowData = tableData[i];
        const row = table.insertRow();
        
        rowData.forEach(cellText => {
            const cell = row.insertCell();
            cell.contentEditable = true;
            cell.textContent = cellText;
            cell.addEventListener('blur', saveContent);
            cell.addEventListener('input', debounce(saveContent, 1000));
        });
    }
}

// 设置自动保存
function setupAutoSave() {
    setInterval(() => {
        if (document.hasFocus()) {
            saveContent();
        }
    }, 30000);
    
    window.addEventListener('beforeunload', function(e) {
        if (currentReport.lastSaved) {
            const lastSave = new Date(currentReport.lastSaved);
            const now = new Date();
            const diffMinutes = (now - lastSave) / (1000 * 60);
            
            if (diffMinutes > 1) {
                saveContent();
                savePhotos();
            }
        }
    });
}

// 导出为PDF
function exportToPDF() {
    showLoading(true);
    
    const element = document.querySelector('.main-content');
    
    html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const dateRange = `${document.getElementById('startDate').value}_${document.getElementById('endDate').value}`;
        pdf.save(`项目管理周报_${dateRange}.pdf`);
        
        showLoading(false);
        showTempMessage('PDF导出成功', 'success');
    }).catch(error => {
        console.error('PDF导出失败:', error);
        showLoading(false);
        showTempMessage('PDF导出失败，请重试', 'error');
    });
}

// ===========================
// 分享功能
// ===========================

// 分享报告
async function shareReport() {
    showLoading(true);
    
    try {
        saveContent();
        savePhotos();
        
        const reportData = await collectAllReportData();
        const reportId = generateReportId();
        const shareUrl = await createShareLink(reportData, reportId);
        
        showShareModal(shareUrl, reportId);
        
    } catch (error) {
        console.error('分享失败:', error);
        showTempMessage('分享失败: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 收集所有报告数据
async function collectAllReportData() {
    return new Promise((resolve) => {
        const data = {
            id: currentReport.id,
            timestamp: new Date().toISOString(),
            report: currentReport,
            photos: photos,
            html: document.querySelector('.container').outerHTML,
            metadata: {
                title: document.querySelector('.report-title').textContent,
                dateRange: `${document.getElementById('startDate').value} 至 ${document.getElementById('endDate').value}`,
                client: document.querySelector('.info-item:nth-child(3) .editable-field').textContent,
                designer: document.querySelector('.info-item:nth-child(2) .editable-field').textContent,
                address: document.querySelector('.info-item:nth-child(4) .editable-field').textContent
            }
        };
        
        resolve(data);
    });
}

// 创建分享链接
async function createShareLink(data, reportId) {
    try {
        localStorage.setItem(`shared_report_${reportId}`, JSON.stringify(data));
        
        if (!sharedReports[reportId]) {
            sharedReports[reportId] = {
                id: reportId,
                created: new Date().toISOString(),
                title: data.metadata.title
            };
            localStorage.setItem('shared_reports', JSON.stringify(sharedReports));
        }
        
        const shareUrl = `${window.location.origin}/viewer.html?id=${reportId}`;
        
        createViewerPage();
        
        return shareUrl;
    } catch (error) {
        console.error('创建分享链接失败:', error);
        throw new Error('创建分享链接失败: ' + error.message);
    }
}

// 创建查看器页面
function createViewerPage() {
    if (!localStorage.getItem('viewer_created')) {
        const viewerHTML = `...`; // 简化的查看器页面代码
        
        const blob = new Blob([viewerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'viewer.html';
        a.style.display = 'none';
        document.body.appendChild(a);
        
        localStorage.setItem('viewer_created', 'true');
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 生成报告ID
function generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}`.substr(0, 20);
}

// 显示分享模态框
function showShareModal(shareUrl, reportId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'shareModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-share-alt"></i> 分享报告</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <p>报告已生成，可通过以下链接分享：</p>
                <div class="share-url-container">
                    <input type="text" readonly value="${shareUrl}" id="shareUrlInput">
                    <button class="btn btn-sm" onclick="copyShareUrl()">
                        <i class="fas fa-copy"></i> 复制
                    </button>
                </div>
                <div class="share-options">
                    <p>分享到：</p>
                    <div class="share-buttons">
                        <button class="share-btn wechat" onclick="shareToWeChat()">
                            <i class="fab fa-weixin"></i> 微信
                        </button>
                        <button class="share-btn qq" onclick="shareToQQ()">
                            <i class="fab fa-qq"></i> QQ
                        </button>
                        <button class="share-btn email" onclick="shareByEmail()">
                            <i class="fas fa-envelope"></i> 邮件
                        </button>
                    </div>
                </div>
                <div class="qr-code-container">
                    <p>手机扫码查看：</p>
                    <div id="qrCode"></div>
                </div>
                <div class="share-info">
                    <p><small>链接有效期：30天</small></p>
                    <p><small>报告ID：${reportId}</small></p>
                </div>
                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="btn" onclick="downloadViewer()">
                        <i class="fas fa-download"></i> 下载独立查看器
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    generateQRCode(shareUrl);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 生成二维码
function generateQRCode(url) {
    const qrContainer = document.getElementById('qrCode');
    if (qrContainer) {
        qrContainer.innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}&margin=10&color=333333&bgcolor=ffffff" 
                 alt="二维码" style="width: 150px; height: 150px;">
            <p style="font-size: 12px; color: #666; margin-top: 10px;">扫描二维码在手机上查看</p>
        `;
    }
}

// 复制分享链接
function copyShareUrl() {
    const input = document.getElementById('shareUrlInput');
    if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        showTempMessage('链接已复制到剪贴板', 'success');
    }
}

// 下载独立查看器
function downloadViewer() {
    const viewerHTML = `...`; // 简化的查看器HTML
    
    const blob = new Blob([viewerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `项目管理周报_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showTempMessage('独立查看器下载完成', 'success');
}

// 分享到微信
function shareToWeChat() {
    const url = document.getElementById('shareUrlInput').value;
    const text = `项目管理周报分享\n请点击链接查看：${url}`;
    navigator.clipboard.writeText(text).then(() => {
        showTempMessage('分享内容已复制到剪贴板\n请粘贴到微信发送', 'success');
    });
}

// 分享到QQ
function shareToQQ() {
    const url = document.getElementById('shareUrlInput').value;
    window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent('项目管理周报')}&summary=${encodeURIComponent('请查看项目管理周报')}`);
}

// 邮件分享
function shareByEmail() {
    const url = document.getElementById('shareUrlInput').value;
    const subject = '项目管理周报分享';
    const body = `请查看项目管理周报：\n${url}\n\n报告查看链接，点击即可查看详细内容。`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ===========================
// 工具函数
// ===========================

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 显示临时消息
function showTempMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 14px 24px;
        background-color: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: fadeInOut 3s ease;
        font-size: 14px;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 3000);
}

// 显示加载提示
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}