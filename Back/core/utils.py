import sqlalchemy
from sqlalchemy import create_engine, inspect
import sys
from io import StringIO
import contextlib
import time
import json
import uuid

def introspect_database(config):
    """
    Connecte à une BDD via SQLAlchemy et retourne le schéma.
    Config attend: engine, user, password, host, port, db_name
    """
    try:
        # Construction de l'URL SQLAlchemy
        # Ex: postgresql://user:pass@host:port/dbname
        if config['engine'] == 'postgresql':
            driver = 'postgresql'
        elif config['engine'] == 'mysql':
            driver = 'mysql'
        else:
            driver = config['engine'] # sqlite, etc.

        url = f"{driver}://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['db_name']}"
        
        engine = create_engine(url)
        inspector = inspect(engine)
        
        schema = {"tables": []}
        
        for table_name in inspector.get_table_names():
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({
                    "name": col['name'],
                    "type": str(col['type']),
                    "nullable": col['nullable']
                })
            schema["tables"].append({
                "name": table_name,
                "columns": columns
            })
            
        return schema
    except Exception as e:
        raise Exception(f"Database connection error: {str(e)}")

def execute_python_code(code, params):
    """
    Exécute le code Python dans un environnement restreint (mais pas totalement isolé).
    NOTE: Pour la prod, utilisez Docker ou nsjail.
    """
    output_buffer = StringIO()
    result = None
    error = None
    start_time = time.time()
    
    # Création de l'environnement local
    local_env = {"params": params}
    
    try:
        # Redirection stdout
        with contextlib.redirect_stdout(output_buffer):
            # 1. Définition de la fonction
            exec(code, {}, local_env)
            
            # 2. Exécution de 'main' si elle existe
            if 'main' in local_env and callable(local_env['main']):
                result = local_env['main'](**params)
            else:
                error = "Function 'main' not found in code."
                
    except Exception as e:
        error = str(e)
    
    duration = (time.time() - start_time) * 1000 # ms
    
    return {
        "result": result,
        "logs": output_buffer.getvalue(),
        "error": error,
        "duration": duration,
        "status": 200 if not error else 500
    }