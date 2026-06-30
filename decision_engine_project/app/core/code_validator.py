"""Validador de snippets de código Python enviados desde el Frontend.

Este módulo valida snippets fn_* y rl_* antes de persistir o publicar. Realiza:
1) Validación AST (estructura segura y convenciones de nombres)
2) Análisis estático con Pyflakes (nombres no definidos, imports no usados, etc.)


idea: validación front-> validación back-> push a repo test
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, List, Optional
import ast
import io

from pyflakes.api import check
from pyflakes.reporter import Reporter


FORBIDDEN_IMPORTS = {
	"os",
	"sys",
	"subprocess",
	"importlib",
}


@dataclass
class ValidationIssue:
	message: str
	line: Optional[int] = None
	col: Optional[int] = None
	code: str = "VALIDATION"
	severity: str = "error"


@dataclass
class ValidationResult:
	is_valid: bool
	issues: List[ValidationIssue] = field(default_factory=list)


class CodeValidationError(Exception):
	def __init__(self, result: ValidationResult):
		super().__init__("Invalid python code")
		self.result = result


class _IssueCollector(Reporter):
	def __init__(self) -> None:
		super().__init__(io.StringIO(), io.StringIO())
		self.issues: List[ValidationIssue] = []

	def _add(self, message: str, lineno: Optional[int] = None, col: Optional[int] = None) -> None:
		self.issues.append(
			ValidationIssue(
				message=message,
				line=lineno,
				col=col,
				code="PYFLAKES",
			)
		)

	def flake(self, message) -> None:  # type: ignore[override]
		self._add(str(message), getattr(message, "lineno", None), getattr(message, "col", None))

	def syntaxError(self, filename, msg, lineno, offset, text) -> None:  # type: ignore[override]
		self._add(f"SyntaxError: {msg}", lineno, offset)

	def unexpectedError(self, filename, msg) -> None:  # type: ignore[override]
		self._add(f"UnexpectedError: {msg}")


def validate_fn_or_rl_source(code: str, filename: str = "submitted_code.py") -> ValidationResult:
	"""Valida un snippet de código con funciones fn_* o rl_*.

	Args:
		code: Código fuente a validar.
		filename: Nombre virtual usado por el linter.

	Returns:
		ValidationResult con issues (vacío cuando es válido).
	"""
	issues: List[ValidationIssue] = []

	if not code or not code.strip():
		return ValidationResult(
			is_valid=False,
			issues=[ValidationIssue(message="El código está vacío", code="EMPTY")],
		)

	try:
		tree = ast.parse(code, filename=filename)
	except SyntaxError as exc:
		return ValidationResult(
			is_valid=False,
			issues=[
				ValidationIssue(
					message=f"SyntaxError: {exc.msg}",
					line=exc.lineno,
					col=exc.offset,
					code="SYNTAX",
				)
			],
		)

	_validate_ast_structure(tree, issues)
	_validate_functions(tree, issues)

	collector = _IssueCollector()
	check(code, filename, collector)
	issues.extend(collector.issues)

	return ValidationResult(is_valid=len(issues) == 0, issues=issues)


def validate_or_raise(code: str, filename: str = "submitted_code.py") -> None:
	"""Valida el código y lanza CodeValidationError si es inválido."""
	result = validate_fn_or_rl_source(code, filename=filename)
	if not result.is_valid:
		raise CodeValidationError(result)


def _validate_ast_structure(tree: ast.AST, issues: List[ValidationIssue]) -> None:
	"""Asegura que solo existan nodos seguros a nivel módulo."""
	allowed_top_level = (
		ast.Import,
		ast.ImportFrom,
		ast.FunctionDef,
		ast.AsyncFunctionDef,
		ast.Assign,
		ast.AnnAssign,
		ast.Expr,
	)

	for node in getattr(tree, "body", []):
		if isinstance(node, ast.Expr) and isinstance(getattr(node, "value", None), ast.Constant):
			# Allow module docstring
			continue

		if not isinstance(node, allowed_top_level):
			issues.append(
				ValidationIssue(
					message=f"No se permiten declaraciones de tipo {type(node).__name__} a nivel módulo",
					line=getattr(node, "lineno", None),
					col=getattr(node, "col_offset", None),
					code="TOP_LEVEL",
				)
			)

	for node in ast.walk(tree):
		if isinstance(node, ast.Import):
			for alias in node.names:
				if alias.name.split(".")[0] in FORBIDDEN_IMPORTS:
					issues.append(
						ValidationIssue(
							message=f"Import prohibido: {alias.name}",
							line=getattr(node, "lineno", None),
							col=getattr(node, "col_offset", None),
							code="FORBIDDEN_IMPORT",
						)
					)
		elif isinstance(node, ast.ImportFrom):
			module = node.module or ""
			if module.split(".")[0] in FORBIDDEN_IMPORTS:
				issues.append(
					ValidationIssue(
						message=f"Import prohibido: {module}",
						line=getattr(node, "lineno", None),
						col=getattr(node, "col_offset", None),
						code="FORBIDDEN_IMPORT",
					)
				)


def _validate_functions(tree: ast.AST, issues: List[ValidationIssue]) -> None:
	function_defs: List[ast.FunctionDef] = [
		node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)
	]

	if not function_defs:
		issues.append(
			ValidationIssue(
				message="No se detectaron funciones fn_* o rl_*",
				code="NO_FUNCTIONS",
			)
		)
		return

	for fn in function_defs:
		if not (fn.name.startswith("fn_") or fn.name.startswith("rl_")):
			issues.append(
				ValidationIssue(
					message=f"Nombre de función inválido: {fn.name}. Debe iniciar con fn_ o rl_",
					line=fn.lineno,
					col=fn.col_offset,
					code="BAD_FUNCTION_NAME",
				)
			)

		if not fn.args.args:
			issues.append(
				ValidationIssue(
					message=f"La función {fn.name} debe recibir 'motor' como primer argumento",
					line=fn.lineno,
					col=fn.col_offset,
					code="BAD_SIGNATURE",
				)
			)
		else:
			first_arg = fn.args.args[0].arg
			if first_arg != "motor":
				issues.append(
					ValidationIssue(
						message=f"La función {fn.name} debe recibir 'motor' como primer argumento",
						line=fn.lineno,
						col=fn.col_offset,
						code="BAD_SIGNATURE",
					)
				)
