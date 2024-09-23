import git
import os
from dotenv import load_dotenv
from airllm import AutoModel
import torch

load_dotenv()
REPO_PATH = os.getenv('REPO_PATH')
NOTES_PATH = os.path.join(REPO_PATH, 'notes')
MAX_LENGTH = 49152  # Ajustado para manejar resúmenes más largos
MAX_NEW_TOKENS = 24576  # Ajustado para generar resúmenes más largos

# Inicializar el modelo AIR LLM con Llama 3.1
model = AutoModel.from_pretrained("unsloth/Meta-Llama-3.1-405B-Instruct-bnb-4bit")
model.cuda()  # Mover el modelo a la GPU


def generate_summary(content):
    prompt = f"""
    Eres un asistente experto en resumir notas académicas de manera concisa, precisa y profesional, 
    enfocándote en destacar los puntos clave del contenido. Al realizar el resumen, sigue las siguientes instrucciones:

    1. **Claridad y coherencia**: Asegúrate de que el resumen sea claro y mantenga una narrativa fluida, evitando términos ambiguos o vagos.
    2. **Puntos clave**: Identifica y prioriza los conceptos más importantes, eliminando detalles irrelevantes o redundantes. Mantén el tono académico y objetivo.
    3. **Investigación adicional**: Si encuentras alguna sección confusa o incompleta, realiza una búsqueda de información adicional para mejorar la precisión. Siempre que sea posible, adjunta las fuentes consultadas.
    4. **Mención de mejoras con IA**: Si no encuentras fuentes específicas para aclarar alguna sección, menciona explícitamente que esa parte fue mejorada usando IA.
    5. **Estilo**: Utiliza un estilo formal, directo y académico, sin perder la esencia original del texto. Evita repeticiones y simplifica las ideas complejas manteniendo el rigor intelectual.
    6. **Longitud**: Adapta el resumen a una extensión ideal para preservar los conceptos clave sin sobrecargar de detalles. El objetivo es condensar la información de manera eficiente.
    7. **Formato**: Estructura el resumen en párrafos claros y bien organizados, y utiliza listas si es necesario para facilitar la comprensión de puntos específicos.

    A continuación, se te proporciona el texto original en español. Realiza el resumen siguiendo las instrucciones indicadas:

    Texto original:
    {content}

    Resumen:
    """


    
    try:
        input_tokens = model.tokenizer(prompt,
            return_tensors="pt", 
            return_attention_mask=False, 
            truncation=True, 
            max_length=MAX_LENGTH, 
            padding=False)
        
        with torch.no_grad():
            generation_output = model.generate(
                input_tokens['input_ids'].cuda(), 
                max_new_tokens=MAX_NEW_TOKENS,
                use_cache=True,
                return_dict_in_generate=True)

        output = model.tokenizer.decode(generation_output.sequences[0])
        
        # Extraer solo el resumen generado (eliminar el prompt original)
        summary = output.split("Resumen:")[-1].strip()
        
        return summary
    except Exception as e:
        print(f"Error al generar el resumen: {e}")
        return None

@app.route('/generate_summary', methods=['POST'])
def api_generate_summary():
    content = request.json.get('content')
    if not content:
        return jsonify({'error': 'No content provided'}), 400
    
    summary = generate_summary(content)
    if summary:
        return jsonify({'summary': summary})
    else:
        return jsonify({'error': 'Failed to generate summary'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)