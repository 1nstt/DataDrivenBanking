import json
import os
from pathlib import Path
from app.engine import DecisionEngine

# --- CONFIGURACIÓN DE RUTAS ---
# Usamos pathlib para que sea robusto en Windows, Mac y Linux
BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "data" / "input"
OUTPUT_DIR = BASE_DIR / "data" / "output"

def run_batch_process(flow_name: str = "p0"):
    # 1. Verificar directorios
    if not INPUT_DIR.exists():
        print(f"❌ Error: No existe el directorio de entrada: {INPUT_DIR}")
        print("   -> Ejecuta primero 'generate_data.py' o crea la carpeta manualmente.")
        return
    
    # Crea el directorio de salida si no existe
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Instanciamos el motor una sola vez
    engine = DecisionEngine()
    
    # 2. Listar archivos .json
    files = list(INPUT_DIR.glob("*.json"))
    
    if not files:
        print(f"⚠️  No se encontraron archivos .json en: {INPUT_DIR}")
        return

    print(f"🚀 Iniciando procesamiento por lotes.")
    print(f"🌊 Flujo seleccionado: {flow_name}")
    print(f"📂 Archivos encontrados: {len(files)}\n")
    print("-" * 60)

    # 3. Iterar y Procesar
    for file_path in files:
        filename = file_path.name
        print(f"📄 Procesando: {filename}")
        
        try:
            # A. Leer Input (Forzamos UTF-8 para evitar errores de tildes/ñ)
            with open(file_path, "r", encoding="utf-8") as f:
                raw_json = json.load(f)

            # B. Ejecutar Motor
            # El motor devuelve un diccionario listo para guardar
            result_json = engine.execute(raw_json, flow_name=flow_name)
            
            # C. Determinar ruta de salida
            output_filename = f"result_{filename}"
            output_path = OUTPUT_DIR / output_filename
            
            # D. Guardar Output
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result_json, f, indent=2, ensure_ascii=False)
            
            # Feedback visual del resultado
            # Intentamos leer la decisión para mostrarla en consola
            try:
                decision = result_json["solicitud"]["decision"]["final_decision_code"]
                print(f"   ✅ ÉXITO -> Resultado: {decision}")
            except KeyError:
                print(f"   ✅ ÉXITO (Procesado, pero no se encontró código de decisión)")

        except json.JSONDecodeError as e:
            # ERROR DE SINTAXIS EN EL JSON
            print(f"   ❌ ERROR FATAL DE JSON:")
            print(f"      Mensaje: {e.msg}")
            print(f"      Ubicación: Línea {e.lineno}, Columna {e.colno}")
            print(f"      (Revisa que no falten comas o sobren llaves)")
            
        except Exception as e:
            # CUALQUIER OTRO ERROR (Lógica, atributos faltantes, etc.)
            print(f"   ❌ ERROR DE EJECUCIÓN: {str(e)}")
            # Opcional: imprimir traceback completo si es necesario
            # import traceback; traceback.print_exc()

        print("-" * 60)

    print(f"\n✨ Proceso finalizado. Resultados guardados en:\n   {OUTPUT_DIR}")

if __name__ == "__main__":
    # Ejecutamos el flujo P0 (puedes cambiarlo si creas otros flows)
    run_batch_process(flow_name="p0")