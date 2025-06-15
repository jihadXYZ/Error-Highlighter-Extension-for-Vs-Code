"use strict";
// TypeScript test file with various errors
Object.defineProperty(exports, "__esModule", { value: true });
// Error 1: Type mismatch
let numberVar = "string value";
let person = {
    name: "John",
    age: 30,
    invalidProperty: "this shouldn't exist" // Error: Object literal may only specify known properties
};
// Error 3: Missing property
let incompletePerson = {
    name: "Jane"
    // Missing 'age' property
};
// Error 4: Function parameter type error
function greet(name) {
    return "Hello, " + name;
}
greet(123); // Error: Argument of type 'number' is not assignable to parameter of type 'string'
// Error 5: Return type mismatch
function getNumber() {
    return "not a number"; // Error: Type 'string' is not assignable to type 'number'
}
// Working code (should not be highlighted)
function workingTypeScriptFunction(input) {
    return `Processed: ${input}`;
}
//# sourceMappingURL=test-file.js.map