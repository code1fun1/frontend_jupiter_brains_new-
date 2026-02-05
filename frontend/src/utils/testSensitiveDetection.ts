// Quick test file for sensitive data detection
import { detectSensitiveData } from './sensitiveDataDetection';

// Test cases
const testMessages = [
    'This is confidential data',
    'My password is test123',
    'Generate video of meeting',
    'This is private information',
    'My credit card is 4532-1234-5678-9010',
    'Email me at user@company.com',
    'Normal message without sensitive content',
];

console.log('🧪 Testing Sensitive Data Detection:\n');

testMessages.forEach((message, index) => {
    const result = detectSensitiveData(message);
    console.log(`Test ${index + 1}: "${message}"`);
    console.log(`  Sensitive: ${result.isSensitive}`);
    console.log(`  Types: ${result.detectedTypes.join(', ')}`);
    console.log(`  Confidence: ${result.confidence}\n`);
});
