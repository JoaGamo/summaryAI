// URL base de la API
const API_BASE_URL = 'http://127.0.0.1:5000';

// Estructura de datos para almacenar la información de los archivos
let fileStructure = {};

// Lista blanca de extensiones permitidas
const allowedExtensions = ['.md', '.pdf', '.png'];

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

    function createTreeNode(name, isFolder, children = []) {
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
                if (child.isFolder || allowedExtensions.some(ext => child.name.endsWith(ext))) {
                    const childNode = createTreeNode(child.name, child.isFolder, child.children);
                    content.appendChild(childNode);
                }
            });

            const wrapper = document.createElement('div');
            wrapper.appendChild(element);
            wrapper.appendChild(content);
            return wrapper;
        } else {
            element.addEventListener('click', () => loadNote(name));
            return element;
        }
    }

    for (const year in fileStructure) {
        const yearNode = createTreeNode(year, true, 
            Object.entries(fileStructure[year]).map(([semester, subjects]) => ({
                name: semester,
                isFolder: true,
                children: Object.entries(subjects).map(([subject, files]) => ({
                    name: subject,
                    isFolder: true,
                    children: files.map(file => ({ name: file, isFolder: false }))
                }))
            }))
        );
        explorer.appendChild(yearNode);
    }
}

// Función para cargar una nota
async function loadNote(file) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/note?file=${file}`);
        const noteContent = await response.text();
        displayNote(noteContent);
    } catch (error) {
        console.error('Error al cargar la nota:', error);
    }
}

// Función para mostrar el contenido de una nota
function displayNote(content) {
    const noteContent = document.getElementById('note-content');
    noteContent.innerHTML = marked(content);
    hljs.highlightAll();
}

// Función para manejar la búsqueda
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase();

    function searchInFolder(folder) {
        let hasMatch = false;
        const matchingChildren = [];

        for (const child of folder.children) {
            if (child.isFolder) {
                const childResult = searchInFolder(child);
                if (childResult.hasMatch) {
                    hasMatch = true;
                    matchingChildren.push({...child, children: childResult.matchingChildren});
                }
            } else if (allowedExtensions.some(ext => child.name.endsWith(ext)) && child.name.toLowerCase().includes(query)) {
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
            isFolder: true,
            children: Object.entries(fileStructure[year]).map(([semester, subjects]) => ({
                name: semester,
                isFolder: true,
                children: Object.entries(subjects).map(([subject, files]) => ({
                    name: subject,
                    isFolder: true,
                    children: files.map(file => ({ name: file, isFolder: false }))
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