document.addEventListener('DOMContentLoaded', function () {
    const toggleTool = document.getElementById('toggleTool');

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
});