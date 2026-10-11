import { runParserTests } from './parser.test';
import { runDeduplicationTests } from './deduplication.test';
import { runApiAndIntegrityTests } from './api.test';
import { runSmartFeatureTests } from './smartFeatures.test';
import { runHardcoreTests } from './hardcoreParser.test';

console.log('====================================================');
console.log('       UPIPulse Automated Test Verification         ');
console.log('====================================================');

const t1 = runParserTests();
const t2 = runDeduplicationTests();
const t3 = runApiAndIntegrityTests();
const t4 = runSmartFeatureTests();
const t5 = runHardcoreTests();

const totalPassed = t1.passed + t2.passed + t3.passed + t4.passed + t5.passed;
const totalFailed = t1.failed + t2.failed + t3.failed + t4.failed + t5.failed;

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('====================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓\n');
  process.exit(0);
}
