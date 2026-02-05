/**
 * Sensitive Data Detection Utility
 * Detects potentially sensitive information in user messages
 */

// Patterns for sensitive data detection
const SENSITIVE_PATTERNS = {
    // Financial data
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    bankAccount: /\b\d{9,18}\b/g,

    // Personal identifiers
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,

    // Contact information
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

    // Passwords and keys
    password: /\b(password|pwd|pass|secret|key|token|api[_-]?key)\s*[:=]\s*\S+/gi,
    apiKey: /\b[A-Za-z0-9_-]{32,}\b/g,

    // Medical/Health
    medicalRecord: /\b(medical|health|diagnosis|prescription|patient)\b/gi,

    // Legal/Confidential
    confidential: /\b(confidential|classified|proprietary|internal\s+only|nda|non-disclosure)\b/gi,

    // IP addresses
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

// Keywords that suggest sensitive content
const SENSITIVE_KEYWORDS = [
    'confidential',
    'secret',
    'private',
    'password',
    'credit card',
    'bank account',
    'ssn',
    'social security',
    'medical record',
    'patient data',
    'proprietary',
    'classified',
    'internal only',
    'do not share',
    'restricted',
    'sensitive',
];

export interface SensitiveDataResult {
    isSensitive: boolean;
    detectedTypes: string[];
    confidence: 'low' | 'medium' | 'high';
    matchedContent?: string;
}

/**
 * Detect sensitive data in text
 */
export function detectSensitiveData(text: string): SensitiveDataResult {
    const detectedTypes: string[] = [];
    let matchedContent: string | undefined;

    // Check patterns
    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            detectedTypes.push(type);
            if (!matchedContent) {
                matchedContent = type;
            }
        }
    }

    // Check keywords
    const lowerText = text.toLowerCase();
    const foundKeywords = SENSITIVE_KEYWORDS.filter(keyword =>
        lowerText.includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
        detectedTypes.push('sensitive keywords');
        if (!matchedContent) {
            matchedContent = foundKeywords[0];
        }
    }

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (detectedTypes.length >= 3) {
        confidence = 'high';
    } else if (detectedTypes.length >= 1) {
        confidence = 'medium';
    }

    return {
        isSensitive: detectedTypes.length > 0,
        detectedTypes,
        confidence,
        matchedContent,
    };
}

/**
 * Check if message should trigger on-prem model suggestion
 */
export function shouldSuggestOnPremModel(text: string): boolean {
    const result = detectSensitiveData(text);

    // Suggest on-prem for medium or high confidence
    return result.isSensitive && result.confidence !== 'low';
}

/**
 * Get user-friendly description of detected content
 */
export function getSensitiveContentDescription(detectedTypes: string[]): string {
    if (detectedTypes.length === 0) return '';

    const typeMap: Record<string, string> = {
        creditCard: 'Credit card number',
        bankAccount: 'Bank account number',
        ssn: 'Social Security Number',
        aadhaar: 'Aadhaar number',
        pan: 'PAN number',
        email: 'Email address',
        phone: 'Phone number',
        password: 'Password/API key',
        apiKey: 'API key',
        medicalRecord: 'Medical information',
        confidential: 'Confidential content',
        ipAddress: 'IP address',
        'sensitive keywords': 'Sensitive keywords',
    };

    const descriptions = detectedTypes
        .map(type => typeMap[type] || type)
        .slice(0, 3);

    if (descriptions.length === 1) {
        return descriptions[0];
    } else if (descriptions.length === 2) {
        return `${descriptions[0]} and ${descriptions[1]}`;
    } else {
        return `${descriptions.slice(0, -1).join(', ')}, and ${descriptions[descriptions.length - 1]}`;
    }
}
