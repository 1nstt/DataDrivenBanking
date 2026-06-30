import json
from dataclasses import dataclass, asdict, is_dataclass, fields
from typing import Type, TypeVar, List, Any, Union, get_origin, get_args

T = TypeVar("T")

@dataclass
class BaseModel:
    """
    Clase base robusta para conversión recursiva JSON <-> Dataclass.
    Soporta List[], Optional[], y estructuras anidadas.
    """
    
    @classmethod
    def from_dict(cls: Type[T], data: dict) -> T:
        if data is None:
            return None
            
        # Mapa de tipos de campos definidos en la clase
        field_types = {f.name: f.type for f in fields(cls)}
        
        init_args = {}
        for key, value in data.items():
            if key not in field_types:
                continue 
            
            target_type = field_types[key]
            
            # 1. Desenvolver Optional/Union (ej: Optional[DependentData])
            # Si es Union, buscamos si alguno de sus argumentos es una Dataclass
            if get_origin(target_type) is Union:
                args = get_args(target_type)
                # Buscamos el tipo interno que sea Dataclass
                inner_type = next((arg for arg in args if is_dataclass(arg)), None)
                if inner_type:
                    target_type = inner_type
                # Si no es dataclass, quizás es List dentro de Optional, etc.
                # Para simplificar, si encontramos una dataclass, la usamos.

            # 2. Caso Lista (ej: List[Applicant])
            if (get_origin(target_type) is list) or \
               (hasattr(target_type, "__origin__") and target_type.__origin__ is list):
                
                # Extraemos el tipo de los items de la lista
                item_type = get_args(target_type)[0] if get_args(target_type) else None
                
                # Si el item interno es Dataclass y el valor es lista
                if is_dataclass(item_type) and isinstance(value, list):
                    init_args[key] = [item_type.from_dict(item) for item in value]
                else:
                    init_args[key] = value
            
            # 3. Caso Objeto Anidado (Dataclass directa o desenvuelta del Optional)
            elif is_dataclass(target_type) and isinstance(value, dict):
                init_args[key] = target_type.from_dict(value)
            
            # 4. Caso Primitivo (int, str, float, bool)
            else:
                init_args[key] = value
                
        return cls(**init_args)

    def to_dict(self) -> dict:
        """Serializa a diccionario eliminando valores None recursivamente."""
        return asdict(self, dict_factory=lambda x: {k: v for k, v in x if v is not None})