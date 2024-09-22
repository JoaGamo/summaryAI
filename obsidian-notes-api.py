from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS, cross_origin
import os
import git  
import markdown
from dotenv import load_dotenv


app = Flask(__name__)
CORS(app)

# Configuración 

load_dotenv()
REPO_PATH = os.getenv('REPO_PATH')
NOTES_PATH = os.path.join(REPO_PATH, 'notes')
                                
def get_file_structure():
    structure = {}
    for year in os.listdir(NOTES_PATH):
        year_path = os.path.join(NOTES_PATH, year)
        if os.path.isdir(year_path):
            structure[year] = {}
            for semester in os.listdir(year_path):
                semester_path = os.path.join(year_path, semester)
                if os.path.isdir(semester_path):
                    structure[year][semester] = {}
                    for subject in os.listdir(semester_path):
                        subject_path = os.path.join(semester_path, subject)
                        if os.path.isdir(subject_path):
                            structure[year][semester][subject] = [
                                f for f in os.listdir(subject_path) if f.endswith('.md')
                            ]
    return structure

@app.route('/api/file-structure')
def file_structure():
    response = jsonify(get_file_structure())
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response 

@app.route('/api/note')
def get_note():
    year = request.args.get('year')
    semester = request.args.get('semester')
    subject = request.args.get('subject')
    file = request.args.get('file')
    
    if not all([year, semester, subject, file]):
        return jsonify({"error": "Missing parameters"}), 400
    
    file_path = os.path.join(NOTES_PATH, year, semester, subject, file)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    return content

@app.route('/api/summary')
def get_summary():
    year = request.args.get('year')
    semester = request.args.get('semester')
    subject = request.args.get('subject')
    file = request.args.get('file')
    
    if not all([year, semester, subject, file]):
        return jsonify({"error": "Missing parameters"}), 400
    
    summary_file = file.replace('.md', '-resumen.md')
    file_path = os.path.join(NOTES_PATH, year, semester, subject, summary_file)
    
    if not os.path.exists(file_path):
        return jsonify({"error": "Summary not found"}), 404
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    return content

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True)
