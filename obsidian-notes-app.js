// URL base de la API
const API_BASE_URL = 'http://127.0.0.1:5000';

// Estructura de datos para almacenar la información de los archivos
let fileStructure = {};

// Lista blanca de extensiones permitidas
const allowedExtensions = ['.md', '.pdf', '.png', '.jpg', '.jpeg', '.gif'];

// Lista de carpetas a filtrar
const filteredFolders = ['.git', '.obsidian'];

// Función para cargar la estructura de archivos
async function loadFileStructure() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/file-structure`);
        fileStructure = await response.json();
        renderFileExplorer();
    } catch (error) {
        console.error('Error al cargar la estructura de archivos:', error);
    }
}

// Función para renderizar el explorador de archivos
function renderFileExplorer() {
    const explorer = document.getElementById('file-explorer');
    explorer.innerHTML = '';

    function createTreeNode(name, isFolder, children = [], path = []) {
        if (filteredFolders.includes(name)) {
            return null;
        }

        const element = document.createElement('div');
        element.className = isFolder ? 'folder-item' : 'file-item';
        element.textContent = name;

        if (isFolder) {
            const content = document.createElement('div');
            content.className = 'folder-content';
            content.style.display = 'none';

            element.addEventListener('click', (e) => {
                e.stopPropagation();
                element.classList.toggle('open');
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });

            children.forEach(child => {
                const childIsFolder = Array.isArray(child) || typeof child === 'object';
                const childName = childIsFolder ? child.name || Object.keys(child)[0] : child;
                const childNode = createTreeNode(childName, childIsFolder, childIsFolder ? (child.children || Object.values(child)[0]) : [], [...path, name]);
                if (childNode) {
                    content.appendChild(childNode);
                }
            });

            const wrapper = document.createElement('div');
            wrapper.appendChild(element);
            wrapper.appendChild(content);
            return wrapper;
        } else {
            if (allowedExtensions.some(ext => name.toLowerCase().endsWith(ext))) {
                element.addEventListener('click', () => loadNote([...path, name].join('/')));
                return element;
            }
            return null;
        }
    }

    for (const year in fileStructure) {
        const yearNode = createTreeNode(year, true, 
            Object.entries(fileStructure[year]).map(([semester, subjects]) => ({
                name: semester,
                children: Object.entries(subjects).map(([subject, files]) => ({
                    name: subject,
                    children: files
                }))
            })),
            []
        );
        if (yearNode) {
            explorer.appendChild(yearNode);
        }
    }
}

// Función para cargar una nota
async function loadNote(filePath) {
    const [year, semester, subject, file] = filePath.split('/');
    try {
        const response = await fetch(`${API_BASE_URL}/api/note?year=${year}&semester=${semester}&subject=${subject}&file=${file}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/markdown')) {
            const content = await response.text();
            displayNote(content, file, 'markdown');
        } else if (contentType && contentType.includes('application/pdf')) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            displayNote(url, file, 'pdf');
        } else if (contentType && contentType.includes('image/')) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            displayNote(url, file, 'image');
        } else {
            throw new Error('Tipo de archivo no soportado');
        }
    } catch (error) {
        console.error('Error al cargar la nota:', error);
    }
}

// Función para mostrar el contenido de una nota
function displayNote(content, fileName, type) {
    const noteContent = document.getElementById('note-content');
    
    switch (type) {
        case 'markdown':
            noteContent.innerHTML = marked(content);
            hljs.highlightAll();
            break;
        case 'pdf':
            noteContent.innerHTML = `<embed src="${content}" type="application/pdf" width="100%" height="100%" />`;
            break;
        case 'image':
            noteContent.innerHTML = `<img src="${content}" alt="${fileName}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
            break;
        default:
            noteContent.textContent = 'Tipo de archivo no soportado';
    }
}

// Función para manejar la búsqueda
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase();

    function searchInFolder(folder) {
        let hasMatch = false;
        const matchingChildren = [];

        for (const child of folder.children) {
            const childName = typeof child === 'string' ? child : child.name;
            if (Array.isArray(child.children)) {
                const childResult = searchInFolder(child);
                if (childResult.hasMatch) {
                    hasMatch = true;
                    matchingChildren.push({...child, children: childResult.matchingChildren});
                }
            } else if (childName.toLowerCase().includes(query)) {
                hasMatch = true;
                matchingChildren.push(child);
            }
        }

        return { hasMatch, matchingChildren };
    }

    const filteredStructure = {};
    for (const year in fileStructure) {
        const yearResult = searchInFolder({
            name: year,
            children: Object.entries(fileStructure[year]).map(([semester, subjects]) => ({
                name: semester,
                children: Object.entries(subjects).map(([subject, files]) => ({
                    name: subject,
                    children: files
                }))
            }))
        });

        if (yearResult.hasMatch) {
            filteredStructure[year] = yearResult.matchingChildren;
        }
    }

    const tempStructure = fileStructure;
    fileStructure = filteredStructure;
    renderFileExplorer();
    fileStructure = tempStructure;
}
// Event listeners
document.getElementById('search-input').addEventListener('input', handleSearch);

// Inicialización
loadFileStructure();