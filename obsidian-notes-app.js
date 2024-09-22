const allowedExtensions = ['.md', '.pdf', '.png'];
const API_BASE_URL = 'http://127.0.0.1:5000';

async function loadFileStructure() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/file-structure`);
        const data = await response.json();
        const fileTree = document.getElementById('fileTree');
        createFileTree(data, fileTree);

        // Populate year, semester, and subject selects
        const years = Object.keys(data);
        const semesters = new Set();
        const subjects = new Set();

        years.forEach(year => {
            Object.keys(data[year]).forEach(semester => {
                semesters.add(semester);
                Object.keys(data[year][semester]).forEach(subject => {
                    subjects.add(subject);
                });
            });
        });

        const yearSelect = document.getElementById('yearSelect');
        const semesterSelect = document.getElementById('semesterSelect');
        const subjectSelect = document.getElementById('subjectSelect');

        populateSelect(yearSelect, years);
        populateSelect(semesterSelect, semesters);
        populateSelect(subjectSelect, subjects);

    } catch (error) {
        console.error('Error loading file structure:', error);
    }
}

function createFileTree(data, container) {
    for (let year in data) {
        let yearLi = document.createElement('li');
        let yearSpan = document.createElement('span');
        yearSpan.textContent = year;
        yearSpan.className = 'folder';
        yearLi.appendChild(yearSpan);
        let yearUl = document.createElement('ul');
        yearUl.style.display = 'none';
        
        for (let semester in data[year]) {
            let semesterLi = document.createElement('li');
            let semesterSpan = document.createElement('span');
            semesterSpan.textContent = semester;
            semesterSpan.className = 'folder';
            semesterLi.appendChild(semesterSpan);
            let semesterUl = document.createElement('ul');
            semesterUl.style.display = 'none';
            
            for (let subject in data[year][semester]) {
                let subjectLi = document.createElement('li');
                let subjectSpan = document.createElement('span');
                subjectSpan.textContent = subject;
                subjectSpan.className = 'folder';
                subjectLi.appendChild(subjectSpan);
                let subjectUl = document.createElement('ul');
                subjectUl.style.display = 'none';
                
                data[year][semester][subject].forEach(file => {
                    if (allowedExtensions.some(ext => file.endsWith(ext))) {
                        let fileLi = document.createElement('li');
                        fileLi.textContent = file;
                        fileLi.className = 'file';
                        fileLi.onclick = function() {
                            loadNote(year, semester, subject, file);
                        };
                        subjectUl.appendChild(fileLi);
                    }
                });
                
                subjectLi.appendChild(subjectUl);
                semesterUl.appendChild(subjectLi);
            }
            
            semesterLi.appendChild(semesterUl);
            yearUl.appendChild(semesterLi);
        }
        
        yearLi.appendChild(yearUl);
        container.appendChild(yearLi);
    }

    // Add click event to all folder spans
    container.querySelectorAll('.folder').forEach(folder => {
        folder.onclick = function() {
            this.classList.toggle('open');
            this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';
        };
    });
}

async function loadNote(year, semester, subject, file) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file)}`);
        const noteContainer = document.getElementById('noteContent');
        
        if (file.endsWith('.md')) {
            const noteContent = await response.text();
            noteContainer.innerHTML = marked(noteContent);
            hljs.highlightAll();
        } else if (file.endsWith('.pdf')) {
            noteContainer.innerHTML = `<embed src="${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file)}" type="application/pdf" width="100%" height="600px" />`;
        } else if (file.endsWith('.png')) {
            noteContainer.innerHTML = `<img src="${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file)}" alt="Note Image" style="max-width: 100%;" />`;
        }
    } catch (error) {
        console.error('Error loading note:', error);
        noteContainer.innerHTML = `<p>Error loading note: ${error.message}</p>`;
    }
}

function populateSelect(selectElement, options) {
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

function searchNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedYear = document.getElementById('yearSelect').value;
    const selectedSemester = document.getElementById('semesterSelect').value;
    const selectedSubject = document.getElementById('subjectSelect').value;

    const fileItems = document.querySelectorAll('.file-tree li');
    fileItems.forEach(item => {
        const isFile = item.classList.contains('file');
        if (isFile) {
            const filePath = getFilePath(item);
            const [year, semester, subject, fileName] = filePath;
            
            const matchesSearch = fileName.toLowerCase().includes(searchTerm);
            const matchesYear = selectedYear === '' || year === selectedYear;
            const matchesSemester = selectedSemester === '' || semester === selectedSemester;
            const matchesSubject = selectedSubject === '' || subject === selectedSubject;

            if (matchesSearch && matchesYear && matchesSemester && matchesSubject) {
                item.style.display = 'block';
                showParents(item);
            } else {
                item.style.display = 'none';
            }
        }
    });
}

function getFilePath(fileItem) {
    const path = [];
    let current = fileItem;
    while (current && !current.classList.contains('file-tree')) {
        if (current.previousElementSibling && current.previousElementSibling.textContent) {
            path.unshift(current.previousElementSibling.textContent);
        } else if (current.classList.contains('file')) {
            path.push(current.textContent);
        }
        current = current.parentElement;
    }
    return path;
}

function showParents(item) {
    let parent = item.parentElement;
    while (parent && !parent.classList.contains('file-tree')) {
        if (parent.style.display === 'none') {
            parent.style.display = 'block';
            if (parent.previousElementSibling) {
                parent.previousElementSibling.classList.add('open');
            }
        }
        parent = parent.parentElement;
    }
}

document.addEventListener('DOMContentLoaded', loadFileStructure);

// Resizer functionality
const resizer = document.getElementById('resizer');
const fileExplorer = document.querySelector('.file-explorer');

let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    if (isResizing) {
        fileExplorer.style.width = `${e.clientX}px`;
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
}           