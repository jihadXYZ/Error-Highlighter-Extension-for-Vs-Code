"use strict";
// TypeScript test file with various errors
Object.defineProperty(exports, "__esModule", { value: true });
// Error 1: Type mismatch
let numberVar = 42;
let person = {
    name: "John",
    age: 30
};
// Error 3: Missing property
let incompletePerson = {
    name: "Jane",
    age: 25
};
// Error 4: Function parameter type error
function greet(name) {
    return "Hello, " + name;
}
greet("123");
// Error 5: Return type mismatch
function getNumber() {
    return 42;
}
// Working code (should not be highlighted)
function workingTypeScriptFunction(input) {
    return `Processed: ${input}`;
}
//# sourceMappingURL=test-file.js.map