import git
import os
import requests
from dotenv import load_dotenv

load_dotenv()
REPO_PATH = os.getenv('REPO_PATH')
NOTES_PATH = os.path.join(REPO_PATH, 'notes')
LOCAL_AI_URL = os.getenv('LOCAL_AI_URL', 'http://localhost:8080/v1/chat/completions')
LOCAL_AI_MODEL = os.getenv('LOCAL_AI_MODEL', 'gpt-3.5-turbo')  # Modelo de LocalAI como variable de entorno

def update_repo():
    repo = git.Repo(REPO_PATH)
    origin = repo.remotes.origin
    origin.pull()

def generate_summary(content):
    headers = {
        'Content-Type': 'application/json'
    }
    data = {
        'model': LOCAL_AI_MODEL,
        'messages': [
            {'role': 'system', 'content': 'Eres un asistente que resume notas académicas de manera concisa y efectiva. Si hay una sección del contenido que no es muy clara, busca información adicional, agrégala y, si es posible, adjunta la fuente de donde la obtuviste. Si no tienes una fuente específica, indica claramente que esa sección fue mejorada con IA.'},
            {'role': 'user', 'content': f'Resume el siguiente texto en español, manteniendo los puntos clave y siguiendo las instrucciones dadas:\n\n{content}'}
        ]
    }
    
    try:
        response = requests.post(LOCAL_AI_URL, headers=headers, json=data)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except requests.RequestException as e:
        print(f"Error al generar el resumen: {e}")
        return None

def generate_summaries():
    for root, dirs, files in os.walk(NOTES_PATH):
        for file in files:
            if file.endswith('.md') and not file.endswith('-resumen.md') and not file.endswith('.excalidraw.md'):
                file_path = os.path.join(root, file)
                summary_path = os.path.join(root, f"{os.path.splitext(file)[0]}-resumen.md")
                
                # Verifica si el archivo de resumen necesita ser actualizado
                if not os.path.exists(summary_path) or os.path.getmtime(file_path) > os.path.getmtime(summary_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    summary = generate_summary(content)
                    
                    if summary:
                        with open(summary_path, 'w', encoding='utf-8') as f:
                            f.write(summary)
                        print(f"Resumen generado/actualizado para {file}")
                    else:
                        print(f"No se pudo generar el resumen para {file}")

if __name__ == '__main__':
    update_repo()
    generate_summaries()