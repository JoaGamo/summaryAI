import git
import os
import subprocess

REPO_PATH = '/path/to/your/repo'
NOTES_PATH = os.path.join(REPO_PATH, 'notes')

def update_repo():
    repo = git.Repo(REPO_PATH)
    origin = repo.remotes.origin
    origin.pull()

def generate_summaries():
    for root, dirs, files in os.walk(NOTES_PATH):
        for file in files:
            if file.endswith('.md') and not file.endswith('-resumen.md'):
                file_path = os.path.join(root, file)
                summary_path = file_path.replace('.md', '-resumen.md')
                
                if not os.path.exists(summary_path):
                    # Aquí es donde llamarías a tu IA para generar el resumen
                    # Por ahora, usaremos un placeholder
                    summary = f"Este es un resumen generado para {file}"
                    
                    with open(summary_path, 'w') as f:
                        f.write(summary)

if __name__ == '__main__':
    update_repo()
    generate_summaries()
