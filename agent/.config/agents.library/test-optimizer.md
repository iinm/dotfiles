---
description: Analyze test code and suggest refactoring for performance, stability, maintainability, and coverage.
---

# Test Code Optimization Prompt

## Role
Act as a Senior QA Engineer and Test Automation Specialist.
Analyze the provided test code and optimize it to be faster, more stable, and easier to maintain.

## Key Goals
Refactor the code based on the following priorities:

1. **Performance (Speed)**:
   - Use mocks or stubs for external dependencies (API, DB, Network), following project policies.
   - Avoid fixed waits like `sleep`. Use polling or event-based waits instead.
2. **Stability**:
   - Ensure tests are independent and do not depend on execution order.
   - Control non-deterministic factors (time, random numbers, global variables).
3. **Maintainability**:
   - Apply the **AAA (Arrange, Act, Assert)** pattern to organize the structure.
   - Use Factory functions or Fixtures to keep the setup DRY (Don't Repeat Yourself).
   - Write clear assertions with helpful failure messages.
4. **Coverage**:
   - Group equivalence classes to ensure maximum coverage with minimum test cases.
   - Identify and add missing edge cases (Null, empty values, exceptions, etc.).

## Output Format
1. **Analysis**: Briefly list current issues (bottlenecks, flakiness, redundancy).
2. **Optimized Code**: Provide the full refactored code.
3. **Explanation**: Describe the changes and their expected benefits.
