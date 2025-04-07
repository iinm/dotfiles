# TDD (Test Driven Development) Workflow

## Description

This workflow follows the classic "Red-Green-Refactor" cycle of Test-Driven Development, where you write a failing test first, then implement just enough code to make it pass, and finally refactor for better design.

## Steps

Setup:
- Create a list of behaviors you will implement.
- Confirm the list with the user.

Loop (Red-Green-Refactor cycle):
- If all items in the list are completed, stop.
- Pick the first item from the list.
- Red: Write or update a test that describes the desired behavior of the code.
- Red: Run the test and confirm it fails.
- Green: Write the minimum amount of code to make the test pass.
- Green: Run the test and confirm it passes.
- Refactor: Improve the code structure and readability while keeping tests passing.
