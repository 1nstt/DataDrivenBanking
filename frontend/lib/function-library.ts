import type { FunctionDefinition } from "./function-store"

export const functionLibrary: FunctionDefinition[] = [
  {
    id: "fetch_user",
    name: "Fetch User",
    category: "data",
    description: "Get user by ID",
    code: `def fetch_user(user_id: str) -> dict:
    """
    Fetch a user from the database by their ID.
    
    Args:
        user_id: The unique identifier of the user
        
    Returns:
        User data dictionary or None if not found
    """
    query = "SELECT * FROM users WHERE id = %s"
    result = db.execute(query, [user_id])
    return result.first()`,
    updatedAt: new Date(),
  },
  {
    id: "query_database",
    name: "Query Database",
    category: "data",
    description: "Execute SQL query",
    code: `def query_database(query: str, params: list = None) -> list:
    """
    Execute a SQL query against the database.
    
    Args:
        query: SQL query string
        params: Optional list of parameters
        
    Returns:
        List of result rows
    """
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(query, params or [])
    return cursor.fetchall()`,
    updatedAt: new Date(),
  },
  {
    id: "save_record",
    name: "Save Record",
    category: "data",
    description: "Save to database",
    code: `def save_record(table: str, data: dict) -> int:
    """
    Save a record to the specified table.
    
    Args:
        table: Target table name
        data: Dictionary of column-value pairs
        
    Returns:
        ID of the inserted record
    """
    columns = ", ".join(data.keys())
    placeholders = ", ".join(["%s"] * len(data))
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    return db.execute(query, list(data.values()))`,
    updatedAt: new Date(),
  },
  {
    id: "delete_record",
    name: "Delete Record",
    category: "data",
    description: "Remove from database",
    code: `def delete_record(table: str, record_id: int) -> bool:
    """
    Delete a record from the database.
    
    Args:
        table: Target table name
        record_id: ID of the record to delete
        
    Returns:
        True if deletion was successful
    """
    query = f"DELETE FROM {table} WHERE id = %s"
    result = db.execute(query, [record_id])
    return result.rowcount > 0`,
    updatedAt: new Date(),
  },
  {
    id: "send_email",
    name: "Send Email",
    category: "communication",
    description: "Send email notification",
    code: `def send_email(to: str, subject: str, body: str) -> bool:
    """
    Send an email notification to a recipient.
    
    Args:
        to: Recipient email address
        subject: Email subject line
        body: Email body content (HTML supported)
        
    Returns:
        True if email was sent successfully
    """
    message = EmailMessage()
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body, subtype="html")
    
    return smtp_client.send(message)`,
    updatedAt: new Date(),
  },
  {
    id: "send_sms",
    name: "Send SMS",
    category: "communication",
    description: "Send text message",
    code: `def send_sms(phone_number: str, message: str) -> dict:
    """
    Send an SMS text message.
    
    Args:
        phone_number: Recipient phone number (E.164 format)
        message: Text message content (max 160 chars)
        
    Returns:
        Response dict with message ID and status
    """
    response = twilio_client.messages.create(
        body=message,
        to=phone_number,
        from_=settings.TWILIO_NUMBER
    )
    return {"id": response.sid, "status": response.status}`,
    updatedAt: new Date(),
  },
  {
    id: "push_notification",
    name: "Push Notification",
    category: "communication",
    description: "Send push alert",
    code: `def push_notification(user_id: str, title: str, body: str) -> bool:
    """
    Send a push notification to a user's devices.
    
    Args:
        user_id: Target user ID
        title: Notification title
        body: Notification body text
        
    Returns:
        True if notification was delivered
    """
    tokens = get_user_device_tokens(user_id)
    for token in tokens:
        firebase.send_notification(token, title, body)
    return True`,
    updatedAt: new Date(),
  },
  {
    id: "calculate_score",
    name: "Calculate Score",
    category: "logic",
    description: "Compute risk score",
    code: `def calculate_score(data: dict, weights: dict = None) -> float:
    """
    Calculate a weighted risk score from input data.
    
    Args:
        data: Input data dictionary with score factors
        weights: Optional custom weights for each factor
        
    Returns:
        Calculated score between 0 and 100
    """
    weights = weights or DEFAULT_WEIGHTS
    score = 0.0
    
    for key, value in data.items():
        if key in weights:
            score += value * weights[key]
    
    return min(max(score, 0), 100)`,
    updatedAt: new Date(),
  },
  {
    id: "validate_input",
    name: "Validate Input",
    category: "logic",
    description: "Validate data format",
    code: `def validate_input(data: dict, schema: dict) -> tuple[bool, list]:
    """
    Validate input data against a schema definition.
    
    Args:
        data: Input data to validate
        schema: Validation schema with rules
        
    Returns:
        Tuple of (is_valid, list of errors)
    """
    errors = []
    for field, rules in schema.items():
        value = data.get(field)
        
        if rules.get("required") and value is None:
            errors.append(f"{field} is required")
        elif value and rules.get("type"):
            if not isinstance(value, rules["type"]):
                errors.append(f"{field} must be {rules['type'].__name__}")
    
    return len(errors) == 0, errors`,
    updatedAt: new Date(),
  },
  {
    id: "transform_data",
    name: "Transform Data",
    category: "logic",
    description: "Map and transform",
    code: `def transform_data(data: dict, mapping: dict) -> dict:
    """
    Transform data using a field mapping configuration.
    
    Args:
        data: Source data dictionary
        mapping: Field mapping rules
        
    Returns:
        Transformed data dictionary
    """
    result = {}
    for target_key, source_config in mapping.items():
        if isinstance(source_config, str):
            result[target_key] = data.get(source_config)
        elif callable(source_config):
            result[target_key] = source_config(data)
    return result`,
    updatedAt: new Date(),
  },
  {
    id: "aggregate_data",
    name: "Aggregate Data",
    category: "logic",
    description: "Sum, avg, count",
    code: `def aggregate_data(records: list, operations: dict) -> dict:
    """
    Perform aggregation operations on a list of records.
    
    Args:
        records: List of data records
        operations: Dict of field -> operation type
        
    Returns:
        Aggregated results dictionary
    """
    results = {}
    for field, op in operations.items():
        values = [r.get(field, 0) for r in records]
        if op == "sum":
            results[field] = sum(values)
        elif op == "avg":
            results[field] = sum(values) / len(values)
        elif op == "count":
            results[field] = len(values)
    return results`,
    updatedAt: new Date(),
  },
  {
    id: "verify_identity",
    name: "Verify Identity",
    category: "security",
    description: "KYC verification",
    code: `def verify_identity(user_data: dict) -> dict:
    """
    Perform KYC identity verification.
    
    Args:
        user_data: User identity information
        
    Returns:
        Verification result with status and score
    """
    result = kyc_provider.verify({
        "first_name": user_data["first_name"],
        "last_name": user_data["last_name"],
        "dob": user_data["date_of_birth"],
        "ssn": user_data.get("ssn"),
        "address": user_data["address"]
    })
    
    return {
        "verified": result.status == "PASS",
        "score": result.confidence_score,
        "checks": result.completed_checks
    }`,
    updatedAt: new Date(),
  },
  {
    id: "check_permissions",
    name: "Check Permissions",
    category: "security",
    description: "Validate access",
    code: `def check_permissions(user_id: str, resource: str, action: str) -> bool:
    """
    Check if a user has permission to perform an action.
    
    Args:
        user_id: The user's ID
        resource: The resource being accessed
        action: The action being performed (read, write, delete)
        
    Returns:
        True if user has permission
    """
    user_roles = get_user_roles(user_id)
    permissions = get_role_permissions(user_roles)
    
    required = f"{resource}:{action}"
    return required in permissions`,
    updatedAt: new Date(),
  },
  {
    id: "encrypt_data",
    name: "Encrypt Data",
    category: "security",
    description: "Encrypt sensitive data",
    code: `def encrypt_data(data: str, key_id: str = "default") -> str:
    """
    Encrypt sensitive data using AES-256.
    
    Args:
        data: Plain text data to encrypt
        key_id: Encryption key identifier
        
    Returns:
        Base64 encoded encrypted string
    """
    key = get_encryption_key(key_id)
    cipher = AES.new(key, AES.MODE_GCM)
    
    ciphertext, tag = cipher.encrypt_and_digest(data.encode())
    
    return base64.b64encode(
        cipher.nonce + tag + ciphertext
    ).decode()`,
    updatedAt: new Date(),
  },
  {
    id: "schedule_task",
    name: "Schedule Task",
    category: "time",
    description: "Schedule for later",
    code: `def schedule_task(task_name: str, run_at: datetime, payload: dict) -> str:
    """
    Schedule a task to run at a specific time.
    
    Args:
        task_name: Name of the task to execute
        run_at: Datetime when task should run
        payload: Data to pass to the task
        
    Returns:
        Scheduled task ID
    """
    task = ScheduledTask(
        name=task_name,
        scheduled_time=run_at,
        payload=json.dumps(payload),
        status="pending"
    )
    task.save()
    
    return task.id`,
    updatedAt: new Date(),
  },
  {
    id: "wait_delay",
    name: "Wait / Delay",
    category: "time",
    description: "Pause execution",
    code: `async def wait_delay(seconds: float, reason: str = None) -> None:
    """
    Pause execution for a specified duration.
    
    Args:
        seconds: Number of seconds to wait
        reason: Optional reason for the delay (for logging)
    """
    if reason:
        logger.info(f"Waiting {seconds}s: {reason}")
    
    await asyncio.sleep(seconds)`,
    updatedAt: new Date(),
  },
  {
    id: "set_timeout",
    name: "Set Timeout",
    category: "time",
    description: "Timeout handler",
    code: `def set_timeout(func: callable, timeout: float) -> any:
    """
    Execute a function with a timeout limit.
    
    Args:
        func: Function to execute
        timeout: Maximum execution time in seconds
        
    Returns:
        Function result or raises TimeoutError
    """
    import signal
    
    def handler(signum, frame):
        raise TimeoutError(f"Function timed out after {timeout}s")
    
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(int(timeout))
    
    try:
        result = func()
    finally:
        signal.alarm(0)
    
    return result`,
    updatedAt: new Date(),
  },
  {
    id: "generate_pdf",
    name: "Generate PDF",
    category: "document",
    description: "Create PDF document",
    code: `def generate_pdf(template: str, data: dict) -> bytes:
    """
    Generate a PDF document from a template.
    
    Args:
        template: Template name or path
        data: Data to populate the template
        
    Returns:
        PDF file as bytes
    """
    html_content = render_template(template, data)
    
    pdf = pdfkit.from_string(
        html_content,
        False,
        options={"page-size": "A4"}
    )
    
    return pdf`,
    updatedAt: new Date(),
  },
  {
    id: "parse_document",
    name: "Parse Document",
    category: "document",
    description: "Extract document data",
    code: `def parse_document(file_path: str, doc_type: str = "auto") -> dict:
    """
    Extract structured data from a document.
    
    Args:
        file_path: Path to the document file
        doc_type: Document type (pdf, docx, auto)
        
    Returns:
        Extracted data dictionary
    """
    if doc_type == "auto":
        doc_type = detect_document_type(file_path)
    
    parser = get_parser(doc_type)
    content = parser.extract(file_path)
    
    return {
        "text": content.text,
        "metadata": content.metadata,
        "tables": content.tables
    }`,
    updatedAt: new Date(),
  },
  {
    id: "sign_document",
    name: "Sign Document",
    category: "document",
    description: "Digital signature",
    code: `def sign_document(document: bytes, signer_id: str) -> dict:
    """
    Apply a digital signature to a document.
    
    Args:
        document: Document bytes to sign
        signer_id: ID of the signer
        
    Returns:
        Signed document with signature metadata
    """
    private_key = get_signer_key(signer_id)
    
    signature = private_key.sign(
        document,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    
    return {
        "document": document,
        "signature": base64.b64encode(signature).decode(),
        "signer_id": signer_id,
        "signed_at": datetime.utcnow().isoformat()
    }`,
    updatedAt: new Date(),
  },
]
