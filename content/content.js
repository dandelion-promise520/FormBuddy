let dragBox = null;
let formContainer;

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showTool') {
        if (!dragBox) {
            initTool();
        } else {
            dragBox.style.display = 'block';
            chrome.storage.local.set({ toolVisible: true });
        }
    } else if (request.action === 'hideTool') {
        if (dragBox) {
            dragBox.style.display = 'none';
            chrome.storage.local.set({ toolVisible: false });
        }
    }
});

// 初始化工具
function initTool() {
    'use strict';

    // HTML 模板
    const toolTemplate = `
        <div id="dragBox" class="tool-container">
            <div class="tool-header">
                <button class="add-button">添加表单</button>
                <span class="shortcut-tip">Alt + T 显示/隐藏</span>
            </div>
            <div class="form-container"></div>
        </div>
    `;

    const formTemplate = (formId, value, shortcutKey) => `
        <form id="${formId}" class="form-item">
            <div class="form-content">
                <input type="text" placeholder="请输入内容" value="${value || ''}" />
                <button type="button" class="submit-btn">填充</button>
                <button type="button" class="delete-btn">删除</button>
                <span class="shortcut-label">Alt + ${shortcutKey}</span>
            </div>
        </form>
    `;

    // 样式定义
    const styles = `
        .tool-container {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 200px;
            user-select: none;
        }

        .tool-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            cursor: grab;
            padding: 5px;
            background: #f5f5f5;
            border-radius: 4px;
        }

        .add-button {
            padding: 4px 8px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .add-button:hover {
            background: #45a049;
        }

        .shortcut-tip {
            font-size: 11px;
            color: #666;
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .form-item {
            margin-bottom: 10px;
        }

        .form-content {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .form-content input {
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 150px;
            font-size: 12px;
            transition: border-color 0.2s;
        }

        .form-content input:focus {
            border-color: #2196F3;
            outline: none;
        }

        .submit-btn {
            padding: 4px 8px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .submit-btn:hover {
            background: #1976D2;
        }

        .delete-btn {
            padding: 4px 8px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .delete-btn:hover {
            background: #d32f2f;
        }

        .shortcut-label {
            font-size: 11px;
            color: #666;
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .tool-container.dragging {
            opacity: 0.9;
        }
    `;

    // 工具状态管理
    const toolState = {
        formCount: 0,
        formData: {},
        isToolVisible: true,
        lastFocusedElement: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 }
    };

    // 快捷键处理
    function getShortcutKey(index) {
        return index <= 9 ? index.toString() : String.fromCharCode(97 + (index - 10));
    }

    // 表单处理函数
    function addForm(savedValue = '') {
        toolState.formCount++;
        const formId = `form_${toolState.formCount}`;
        toolState.formData[formId] = savedValue;
        addFormWithId(formId, savedValue);
        saveToolState();
    }

    function addFormWithId(formId, savedValue = '') {
        const formNumber = parseInt(formId.split('_')[1]);
        const shortcutKey = getShortcutKey(formNumber);

        const formElement = document.createElement('div');
        formElement.innerHTML = formTemplate(formId, savedValue, shortcutKey);
        const form = formElement.firstElementChild;

        setupFormEvents(form, formId);
        formContainer.appendChild(form);
    }

    function setupFormEvents(form, formId) {
        const input = form.querySelector('input');
        const submitBtn = form.querySelector('.submit-btn');
        const deleteBtn = form.querySelector('.delete-btn');

        submitBtn.addEventListener('click', () => fillFormContent(input.value));
        deleteBtn.addEventListener('click', () => deleteForm(form, formId));
        input.addEventListener('input', () => updateFormData(formId, input.value));

        // 添加快捷键
        const shortcutKey = getShortcutKey(parseInt(formId.split('_')[1]));
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === shortcutKey) {
                e.preventDefault();
                fillFormContent(input.value);
            }
        });
    }

    // 工具操作函数
    function fillFormContent(value) {
        if (toolState.lastFocusedElement) {
            toolState.lastFocusedElement.value = value;
            ['input', 'change'].forEach(eventType => {
                toolState.lastFocusedElement.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
        }
    }

    function deleteForm(form, formId) {
        form.remove();
        delete toolState.formData[formId];
        saveToolState();
    }

    function updateFormData(formId, value) {
        toolState.formData[formId] = value;
        saveToolState();
    }

    function saveToolState() {
        chrome.storage.local.set({
            formData: toolState.formData,
            formCount: toolState.formCount
        });
    }

    // 拖拽处理
    function setupDragEvents() {
        const header = dragBox.querySelector('.tool-header');

        header.addEventListener('mousedown', initDrag);
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);

        function initDrag(e) {
            toolState.isDragging = true;
            dragBox.classList.add('dragging');
            const rect = dragBox.getBoundingClientRect();
            toolState.dragOffset.x = e.clientX - rect.left;
            toolState.dragOffset.y = e.clientY - rect.top;
        }

        function handleDrag(e) {
            if (!toolState.isDragging) return;
            e.preventDefault();

            const x = e.clientX - toolState.dragOffset.x;
            const y = e.clientY - toolState.dragOffset.y;
            dragBox.style.left = `${x}px`;
            dragBox.style.top = `${y}px`;
            dragBox.style.right = 'auto';
        }

        function stopDrag() {
            toolState.isDragging = false;
            dragBox.classList.remove('dragging');
        }
    }

    // 初始化
    function initialize() {
        // 添加样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);

        // 创建工具容器
        const container = document.createElement('div');
        container.innerHTML = toolTemplate;
        document.body.appendChild(container);

        // 获取元素引用
        dragBox = document.getElementById('dragBox');
        formContainer = dragBox.querySelector('.form-container');
        const addButton = dragBox.querySelector('.add-button');

        // 设置事件监听
        addButton.addEventListener('click', () => addForm());
        document.addEventListener('mousedown', (e) => {
            if (!dragBox.contains(e.target)) {
                toolState.lastFocusedElement = e.target;
            }
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                toolState.isToolVisible = !toolState.isToolVisible;
                dragBox.style.display = toolState.isToolVisible ? 'block' : 'none';
                chrome.storage.local.set({ toolVisible: toolState.isToolVisible });
            }
        });

        setupDragEvents();

        // 加载保存的数据
        loadSavedData();
    }

    function loadSavedData() {
        chrome.storage.local.get(['isInitialized', 'formData', 'formCount', 'toolVisible'], result => {
            if (!result.isInitialized) {
                initializeDefaultData();
            } else {
                toolState.formData = result.formData || {};
                toolState.formCount = result.formCount || 0;
            }

            // 渲染表单
            Object.entries(toolState.formData).forEach(([formId, value]) => {
                addFormWithId(formId, value);
            });

            // 设置显示状态
            toolState.isToolVisible = result.toolVisible !== undefined ? result.toolVisible : true;
            dragBox.style.display = toolState.isToolVisible ? 'block' : 'none';
        });
    }

    function initializeDefaultData() {
        const defaultForms = [
            '可以填你的手机号',
            '可以填你的QQ号',
        ];

        defaultForms.forEach((value, index) => {
            const formId = `form_${index + 1}`;
            toolState.formData[formId] = value;
            toolState.formCount = index + 1;
        });

        chrome.storage.local.set({
            isInitialized: true,
            formData: toolState.formData,
            formCount: toolState.formCount
        });
    }

    // 启动初始化
    initialize();
}

// 检查工具是否应该显示
chrome.storage.local.get(['toolEnabled'], function (result) {
    if (result.toolEnabled) {
        initTool();
    }
});
