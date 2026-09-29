// UPIPulse Master Test Suite Runner
import { runParserTests } from './parser.test';
import { runDeduplicationTests } from './deduplication.test';
import { runApiAndIntegrityTests } from './api.test';

console.log('====================================================');
console.log('       UPIPulse Automated Test Verification         ');
console.log('====================================================');

const t1 = runParserTests();
const t2 = runDeduplicationTests();
const t3 = runApiAndIntegrityTests();

const totalPassed = t1.passed + t2.passed + t3.passed;
const totalFailed = t1.failed + t2.failed + t3.failed;

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('====================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓\n');
  process.exit(0);
}
