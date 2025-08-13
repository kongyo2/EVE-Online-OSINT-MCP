1.  **Test-Driven Development (TDD):**
    *   Always implement TDD. For every piece of code generated, generate the corresponding unit test.
    *   When modifying code, always verify that `npm test` passes.
    *   Example:
        ```typescript
        function add(a: number, b: number) { return a + b }
        test("1+2=3", () => {
          expect(add(1, 2)).toBe(3);
        });
        ```
2.  **Specification Documentation:**
    *   Begin each file with a comment block describing its specification.
    *   Example:
        ```typescript
        /**
         * Calculates the Euclidean distance between two points.
        **/
        type Point = { x: number; y: number; };
        export function distance(a: Point, b: Point): number {
          return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        }
        ```
3.  **Testing Standards:**
    *   Aim for 100% test coverage.
    *   Write unit tests in `*.test.ts` files corresponding to `*.ts` implementation files.
    *   If a `.test.ts` file is missing for an implementation, add tests referencing other existing tests.
    *   Prioritize testing actual behavior, API interactions, and network requests. Avoid unnecessary mocking; prefer testing real actions when feasible.

**TypeScript and JavaScript Style Guide:**

1.  **Prefer Plain Objects and Types:**
    *   Prioritize using plain JavaScript objects combined with TypeScript `interface` or `type` declarations over JavaScript `class` syntax. This approach enhances interoperability (especially with React) and overall maintainability.
    *   **Reasoning for Plain Objects over Classes:**
        *   **Seamless React Integration:** Aligns with React's explicit props/state management; avoids hidden internal state.
        *   **Reduced Boilerplate:** Less verbosity than classes; leverages TypeScript's static type checking effectively.
        *   **Enhanced Readability:** Direct property access; no complex inheritance or hidden state.
        *   **Simplified Immutability:** Encourages creating new objects instead of mutating existing ones, aligning with React patterns.
        *   **Better Serialization:** Easier JSON serialization/deserialization.

2.  **Module Encapsulation:**
    *   Use ES Module syntax (`import`/`export`) for encapsulation instead of class-based private/public members.
    *   **Benefits:**
        *   **Clear Public API:** Exported items define the public API; unexported items are private.
        *   **Enhanced Testability:** Tests focus on public APIs. Needing to access unexported functions suggests refactoring into a separate, testable module.
        *   **Reduced Coupling:** Explicit boundaries make refactoring and understanding easier.

3.  **Type Safety:**
    *   **Avoid `any` Types and Type Assertions:** Maximize TypeScript's static type checking benefits.
    *   **Dangers of `any`:** Bypasses type checking, reduces safety, readability, and maintainability; can mask design issues.
    *   **Prefer `unknown`:** If a type cannot be determined, use `unknown`. Requires type narrowing (`typeof`, `instanceof`, type guards) before use, preventing accidental runtime errors.
        ```typescript
        function processValue(value: unknown) {
           if (typeof value === 'string') {
              // value is now safely a string
              console.log(value.toUpperCase());
           } else if (typeof value === 'number') {
              // value is now safely a number
              console.log(value * 2);
           }
           // Without narrowing, you cannot access properties or methods on 'value'
           // console.log(value.someProperty); // Error: Object is of type 'unknown'.
        }
        ```
    *   **Use Type Assertions (`as Type`) Cautiously:** Only when necessary (e.g., imperfect library types, more info than compiler). They bypass checks and can introduce runtime errors if incorrect. Avoid using them to access private internals for testing.

4.  **Functional Programming with Arrays:**
    *   Leverage JavaScript's array methods (`.map()`, `.filter()`, `.reduce()`, `.slice()`, `.sort()`, etc.) extensively.
    *   **Benefits:**
        *   **Promotes Immutability:** Methods typically return new arrays.
        *   **Improves Readability:** Declarative chains are often clearer than imperative loops.
        *   **Facilitates Functional Programming:** Encourages pure functions, beneficial for robustness and testability.

By consistently applying these principles, generate TypeScript code that is efficient, performant, maintainable, and a joy to work with.
