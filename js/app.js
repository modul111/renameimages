/**
 * Image Renamer Pro - Main Application Logic
 * Handles file upload, renaming, metadata cleaning, and download
 */

(function() {
    'use strict';

    // State
    let uploadedFiles = [];
    let usedNames = new Set();
    const MAX_FILES = 500;

    /**
     * Generate a smart name using predefined lists or algorithmic generation
     */
    function generateSmartName(gender, style) {
        const components = nameComponents[gender] || nameComponents.female;

        // Try predefined lists first
        if (style === 'classic' && components.classics && components.classics.length > 0) {
            const name = components.classics[Math.floor(Math.random() * components.classics.length)];
            if (!usedNames.has(name)) return name;
        }
        if (style === 'modern' && components.modern && components.modern.length > 0) {
            const name = components.modern[Math.floor(Math.random() * components.modern.length)];
            if (!usedNames.has(name)) return name;
        }
        if (style === 'popular' && components.popular && components.popular.length > 0) {
            const name = components.popular[Math.floor(Math.random() * components.popular.length)];
            if (!usedNames.has(name)) return name;
        }
        if (style === 'unique' && components.unique && components.unique.length > 0) {
            const name = components.unique[Math.floor(Math.random() * components.unique.length)];
            if (!usedNames.has(name)) return name;
        }

        // Algorithmic generation (infinite unique names)
        const prefix = components.prefixes[Math.floor(Math.random() * components.prefixes.length)];
        const root = components.roots[Math.floor(Math.random() * components.roots.length)];
        const suffix = components.suffixes[Math.floor(Math.random() * components.suffixes.length)];

        const rawName = prefix + root + suffix;
        const fullName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        if (fullName.length >= 3 && !usedNames.has(fullName)) {
            return fullName;
        } else {
            return generateSmartName(gender, style);
        }
    }

    /**
     * Get unique name ensuring no duplicates
     */
    function getUniqueName(style, gender) {
        let name;
        let attempts = 0;

        do {
            name = generateSmartName(gender, style);
            attempts++;
        } while (usedNames.has(name) && attempts < 1000);

        usedNames.add(name);
        return name;
    }

    /**
     * Handle file selection
     */
    function handleFiles(files) {
        if (!files || files.length === 0) return;

        if (files.length > MAX_FILES) {
            showNotification(`Maximum ${MAX_FILES} files allowed.`, 'error');
            return;
        }

        uploadedFiles = Array.from(files).map(file => ({
            file: file,
            newName: null,
            preview: URL.createObjectURL(file),
            processed: false
        }));

        displayFileList();
        showNotification(`✅ Loaded ${uploadedFiles.length} image(s)`, 'success');
    }

    /**
     * Display file list in the UI
     */
    function displayFileList() {
        const container = document.getElementById('fileList');
        container.innerHTML = '';

        if (uploadedFiles.length === 0) {
            container.innerHTML = '<p style="color: var(--muted); padding: 20px; text-align: center;">No files uploaded yet</p>';
            return;
        }

        uploadedFiles.forEach((fileObj, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <img class="file-preview" src="${fileObj.preview}" alt="${fileObj.file.name}">
                <div class="file-info">
                    <div class="file-original">${fileObj.file.name}</div>
                    <div class="file-new" style="color: ${fileObj.newName ? '#4caf50' : 'var(--muted)'}">${fileObj.newName ? `→ ${fileObj.newName}` : 'Not renamed yet'}</div>
                </div>
                <div class="file-actions">
                    <button class="action-btn delete-btn" onclick="window.AppState.removeFile(${index})">Remove</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    /**
     * Remove file from list
     */
    function removeFile(index) {
        if (uploadedFiles[index].newName) {
            usedNames.delete(uploadedFiles[index].newName.split('.')[0]);
        }
        URL.revokeObjectURL(uploadedFiles[index].preview);
        uploadedFiles.splice(index, 1);
        displayFileList();
    }

    /**
     * Rename all files in random order
     */
    function renameAllFiles() {
        if (uploadedFiles.length === 0) {
            showNotification('Please upload files first.', 'error');
            return;
        }

        const style = document.getElementById('imageNameStyle').value;
        const gender = document.getElementById('nameGender').value;
        const addNumber = document.getElementById('addNumber').value === 'yes';

        usedNames.clear();

        // Shuffle indices
        const indices = uploadedFiles.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        // Assign names in random order
        indices.forEach((originalIndex, sequenceNumber) => {
            const fileObj = uploadedFiles[originalIndex];
            const baseName = getUniqueName(style, gender);

            if (addNumber) {
                fileObj.newName = `${baseName}_${String(sequenceNumber + 1).padStart(3, '0')}.png`;
            } else {
                let finalName = `${baseName}.png`;
                let counter = 1;
                while (uploadedFiles.some((f, idx) => idx !== originalIndex && f.newName === finalName)) {
                    finalName = `${baseName}_${counter}.png`;
                    counter++;
                }
                fileObj.newName = finalName;
            }
        });

        displayFileList();
        showNotification(`✅ Successfully renamed ${uploadedFiles.length} images in RANDOM order!`, 'success');
    }

    /**
     * Clean metadata from images
     */
    async function cleanMetadataOnly() {
        if (uploadedFiles.length === 0) {
            showNotification('Please upload files first.', 'error');
            return;
        }

        const loading = document.getElementById('loading');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        loading.classList.add('active');
        progressContainer.classList.add('active');

        try {
            for (let i = 0; i < uploadedFiles.length; i++) {
                const fileObj = uploadedFiles[i];
                if (fileObj.processed) continue;

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = fileObj.preview;
                });

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                fileObj.cleanedData = canvas.toDataURL('image/png').split(',')[1];
                fileObj.processed = true;

                const progress = Math.round(((i + 1) / uploadedFiles.length) * 100);
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            }

            displayFileList();
            showNotification(`✅ Metadata cleaned for ${uploadedFiles.length} images!`, 'success');
        } catch (error) {
            console.error('Error cleaning metadata:', error);
            showNotification('Error cleaning metadata. Please try again.', 'error');
        } finally {
            loading.classList.remove('active');
            progressContainer.classList.remove('active');
        }
    }

    /**
     * Download all images as PNG in a ZIP file
     */
    async function downloadAllAsPNG() {
        if (uploadedFiles.length === 0) {
            showNotification('Please upload files first.', 'error');
            return;
        }

        const renamedFiles = uploadedFiles.filter(f => f.newName);
        if (renamedFiles.length === 0) {
            showNotification('Please rename files first.', 'error');
            return;
        }

        const loading = document.getElementById('loading');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        loading.classList.add('active');
        progressContainer.classList.add('active');
        document.getElementById('loadingText').textContent = 'Converting images to lossless PNG...';

        try {
            const zip = new JSZip();

            for (let i = 0; i < renamedFiles.length; i++) {
                const fileObj = renamedFiles[i];
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = fileObj.preview;
                });

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const pngData = canvas.toDataURL('image/png').split(',')[1];
                zip.file(fileObj.newName, pngData, { base64: true });

                const progress = Math.round(((i + 1) / renamedFiles.length) * 100);
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'renamed_images_unique.zip';
            a.click();
            window.URL.revokeObjectURL(url);

            showNotification(`✅ Downloaded ${renamedFiles.length} lossless PNG images!`, 'success');
        } catch (error) {
            console.error('Error downloading files:', error);
            showNotification('Error downloading files. Please try again.', 'error');
        } finally {
            loading.classList.remove('active');
            progressContainer.classList.remove('active');
            document.getElementById('loadingText').textContent = 'Processing images... Please wait...';
        }
    }

    /**
     * Show notification message
     */
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.site-notice');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'site-notice';
        notification.style.padding = '12px 16px';
        notification.style.margin = '12px';
        notification.style.borderRadius = '8px';
        notification.style.background = (type === 'error' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(46, 204, 113, 0.1)');
        notification.style.color = (type === 'error' ? '#e74c3c' : '#4caf50');
        notification.style.fontWeight = '600';
        notification.textContent = message;

        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.insertBefore(notification, fileList.firstChild);
            setTimeout(() => notification.remove(), 4000);
        }
    }

    /**
     * Submit contact form
     */
    function submitContact(event) {
        event.preventDefault();
        const name = document.getElementById('cfName').value.trim();
        const email = document.getElementById('cfEmail').value.trim();
        const message = document.getElementById('cfMessage').value.trim();

        const subject = encodeURIComponent('Feedback: Image Renamer Pro');
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);

        window.location.href = `mailto:hello@example.com?subject=${subject}&body=${body}`;

        // Reset form
        document.getElementById('contactForm').reset();
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        const fileUpload = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        const contactForm = document.getElementById('contactForm');

        if (fileUpload) {
            fileUpload.addEventListener('click', (e) => {
                if (e.target === fileUpload || e.target.closest('.file-upload-icon') || e.target.closest('p')) {
                    fileInput.click();
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (this.files && this.files.length > 0) {
                    handleFiles(this.files);
                    this.value = '';
                }
            });
        }

        if (fileUpload) {
            fileUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUpload.classList.add('dragover');
            });

            fileUpload.addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (e.relatedTarget && !fileUpload.contains(e.relatedTarget)) {
                    fileUpload.classList.remove('dragover');
                }
            });

            fileUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUpload.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFiles(e.dataTransfer.files);
                    fileInput.value = '';
                }
            });
        }

        if (contactForm) {
            contactForm.addEventListener('submit', submitContact);
        }

        // Prevent default drag behavior
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    /**
     * Initialize app
     */
    function init() {
        initializeEventListeners();
        console.log('✨ Image Renamer Pro v3.4 initialized • Unique Names • No Duplicates • Random Order');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        uploadedFiles.forEach(f => {
            if (f.preview) URL.revokeObjectURL(f.preview);
        });
    });

    // Expose public API
    window.AppState = {
        renameAllFiles,
        cleanMetadataOnly,
        downloadAllAsPNG,
        removeFile,
        submitContact,
        uploadedFiles: () => uploadedFiles,
        getFileCount: () => uploadedFiles.length
    };

    // Make functions available globally for onclick handlers
    window.renameAllFiles = renameAllFiles;
    window.cleanMetadataOnly = cleanMetadataOnly;
    window.downloadAllAsPNG = downloadAllAsPNG;
})();
