import os
import requests
from dotenv import load_dotenv

load_dotenv()
AI_SERVER_IP = os.getenv('AI_SERVER_IP', '127.0.0.1:5000')
REPO_PATH = os.getenv('REPO_PATH')
API_URL = f'http://{AI_SERVER_IP}/generate_summary'
NOTES_PATH = os.path.join(REPO_PATH, 'notes')


def generate_summaries():
    for root, dirs, files in os.walk(NOTES_PATH):
        for file in files:
            if file.endswith('.md') and not file.endswith('-resumen.md') and not file.endswith('.excalidraw.md'):
                file_path = os.path.join(root, file)
                summary_path = os.path.join(root, f"{os.path.splitext(file)[0]}-resumen.md")
                
                if not os.path.exists(summary_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    response = requests.post(API_URL, json={'content': content})
                    
                    if response.status_code == 200:
                        summary = response.json()['summary']
                        with open(summary_path, 'w', encoding='utf-8') as f:
                            f.write(summary)
                        print(f"Resumen generado para {file}")
                    else:
                        print(f"No se pudo generar el resumen para {file}: {response.json().get('error', 'Unknown error')}")

if __name__ == '__main__':
    generate_summaries()
