document.addEventListener('DOMContentLoaded', function () {
    const toggleTool = document.getElementById('toggleTool');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // 从 storage 获取当前状态
    chrome.storage.local.get(['toolEnabled'], function (result) {
        toggleTool.checked = result.toolEnabled || false;
    });

    // 监听开关变化
    toggleTool.addEventListener('change', function () {
        const enabled = this.checked;

        // 保存状态到 storage
        chrome.storage.local.set({ toolEnabled: enabled });

        // 向当前标签页发送消息，添加错误处理
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: enabled ? 'showTool' : 'hideTool'
                }).catch(error => {
                    // 忽略连接错误，因为这可能是在不允许内容脚本运行的页面（如 chrome:// 页面）
                    console.log('无法建立连接，可能是在特殊页面或页面未完全加载');
                });
            }
        });
    });

    // 导出表单数据
    exportBtn.addEventListener('click', function () {
        chrome.storage.local.get(['formData', 'formCount'], function (result) {
            const dataStr = JSON.stringify({
                formData: result.formData || {},
                formCount: result.formCount || 0
            }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'formbuddy_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // 导入表单数据
    importBtn.addEventListener('click', function () {
        importFile.click();
    });

    importFile.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.formData && typeof data.formData === 'object') {
                    chrome.storage.local.set({
                        formData: data.formData,
                        formCount: data.formCount || Object.keys(data.formData).length
                    }, function () {
                        alert('导入成功！请刷新页面。');
                    });
                } else {
                    alert('导入文件格式错误！');
                }
            } catch (err) {
                alert('导入失败，文件解析错误！');
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });
});