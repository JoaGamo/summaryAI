const allowedExtensions = ['.md', '.pdf', '.png', '.excalidraw.md'];
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
        let yearLi = createTreeItem(year, 'folder');
        let yearUl = document.createElement('ul');
        yearUl.style.display = 'none';
        
        for (let semester in data[year]) {
            let semesterLi = createTreeItem(semester, 'folder');
            let semesterUl = document.createElement('ul');
            semesterUl.style.display = 'none';
            
            for (let subject in data[year][semester]) {
                let subjectLi = createTreeItem(subject, 'folder');
                let subjectUl = document.createElement('ul');
                subjectUl.style.display = 'none';
                
                let files = data[year][semester][subject];
                let fileStructure = createFileStructure(files);
                
                createFileTreeRecursive(fileStructure, subjectUl, [year, semester, subject]);
                
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
        folder.onclick = function(event) {
            event.stopPropagation();
            this.classList.toggle('open');
            let childrenContainer = this.nextElementSibling;
            if (childrenContainer) {
                childrenContainer.style.display = childrenContainer.style.display === 'none' ? 'block' : 'none';
            }
        };
    });
}

function createFileStructure(files) {
    let structure = {};
    files.forEach(file => {
        let parts = file.split('/');
        let current = structure;
        for (let i = 0; i < parts.length; i++) {
            if (i === parts.length - 1) {
                current[parts[i]] = 'file';
            } else {
                current[parts[i]] = current[parts[i]] || {};
                current = current[parts[i]];
            }
        }
    });
    return structure;
}

function createFileTreeRecursive(structure, container, path) {
    let items = Object.keys(structure).sort((a, b) => {
        if (structure[a] === 'file' && structure[b] !== 'file') return 1;
        if (structure[a] !== 'file' && structure[b] === 'file') return -1;
        return a.localeCompare(b);
    });

    items.forEach(item => {
        if (structure[item] === 'file') {
            let fileLi = createTreeItem(item, 'file');
            fileLi.onclick = function() {
                loadNote(path[0], path[1], path[2], path.slice(3).concat(item).join('/'));
            };
            container.appendChild(fileLi);
        } else {
            let folderLi = createTreeItem(item, 'folder');
            let folderUl = document.createElement('ul');
            folderUl.style.display = 'none';
            createFileTreeRecursive(structure[item], folderUl, path.concat(item));
            folderLi.appendChild(folderUl);
            container.appendChild(folderLi);
        }
    });
}

function createTreeItem(name, type) {
    let li = document.createElement('li');
    let span = document.createElement('span');
    span.textContent = name;
    span.className = type;
    li.appendChild(span);
    return li;
}

function loadNote(year, semester, subject, file_path) {
    fetch(`${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file_path)}`)
        .then(response => file_path.endsWith('.excalidraw.md') ? response.json() : response.text())
        .then(noteContent => {
            const noteContainer = document.getElementById('noteContent');
            
            if (file_path.endsWith('.excalidraw.md')) {
                renderExcalidrawFile(noteContent, noteContainer);
            } else if (file_path.endsWith('.md')) {
                noteContainer.innerHTML = marked(noteContent);
                hljs.highlightAll();
            } else if (file_path.endsWith('.pdf')) {
                noteContainer.innerHTML = `<embed src="${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file_path)}" type="application/pdf" width="100%" height="600px" />`;
            } else if (file_path.endsWith('.png')) {
                noteContainer.innerHTML = `<img src="${API_BASE_URL}/api/note?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&file=${encodeURIComponent(file_path)}" alt="Note Image" style="max-width: 100%;" />`;
            }
        })
        .catch(error => {
            console.error('Error loading note:', error);
            noteContainer.innerHTML = `<p>Error loading note: ${error.message}</p>`;
        });
}

function populateSelect(selectElement, options) {
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadFileStructure();
    
    // Add event listeners for search and filters
    document.getElementById('searchInput').addEventListener('input', searchNotes);
    document.getElementById('yearSelect').addEventListener('change', searchNotes);
    document.getElementById('semesterSelect').addEventListener('change', searchNotes);
    document.getElementById('subjectSelect').addEventListener('change', searchNotes);
});


// Resizer functionality
const resizer = document.getElementById('resizer');
const fileExplorer = document.querySelector('.file-explorer');
const mainContent = document.querySelector('.main-content');

let isResizing = false;
let initialWidth;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    initialWidth = fileExplorer.offsetWidth;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    if (isResizing) {
        const newWidth = initialWidth + e.clientX - initialWidth;
        fileExplorer.style.width = `${newWidth}px`;
        mainContent.style.width = `calc(100% - ${newWidth}px)`;
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
}  


function renderExcalidrawFile(excalidrawData, container) {
    container.innerHTML = '<div id="excalidraw-container" style="width: 100%; height: 500px;"></div>';
    const excalidrawContainer = document.getElementById('excalidraw-container');
    
    const App = () => {
        return React.createElement(
            ExcalidrawLib.Excalidraw,
            {
                initialData: excalidrawData,
                viewModeEnabled: true,
            }
        );
    };

    const excalidrawWrapper = document.createElement('div');
    excalidrawContainer.appendChild(excalidrawWrapper);
    ReactDOM.render(React.createElement(App), excalidrawWrapper);
}



// Revisar todo esto
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

//  document.addEventListener('DOMContentLoaded', loadFileStructure);
