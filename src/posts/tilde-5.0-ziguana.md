---
title: "Tilde 5.0 Ziguana:A transpiler built in Zig"
date: "2026-08-12"
tags: [tilde-5.0, summer, mentoring, Zig, transpilers]
description: Ziguana blog
permalink: posts/{{ title | slug }}/index.html
author_name: "Team Ziguana"
author_link: "https://github.com/homebrew-foss/ziguana"
---


# Ziguana


Ziguana is a transpiler written in **Zig** that can convert source code written in our language to C

[Ziguana repository](https://github.com/homebrew-foss/ziguana)

**Mentees**:
- [Abhishek D](https://github.com/planksconstant)
- [Aniketh](https://github.com/Annadata-Aniketh)
- [Arnav](https://github.com/arnavparashar04)
- [Tanishk Singh](https://github.com/TanishkDev)


**Mentors**:
- [Aston Dsouza](https://github.com/Quan1umMango)
- [Saankhya Srikanth](https://github.com/SaankLeo)


---


## Introduction + What is Ziguana

![ZiguanaHelp](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigy-help.png?raw=true)

Transpilers are tools that convert source code from one language to another language at a similar abstraction level. Ziguana is a transpiler built in Zig that converts the source code written in our language to C

When we write code, it eventually has to become something the machine can execute. There are two well-known paths there: compilation, where code is translated directly into machine binary (C, C++), and interpretation, where code is executed line-by-line during runtime (Python).
There's a third, lesser-known path: transpilation. A transpiler translates code from one high-level language let's say (A) into another language (B), then hands it off to language B's existing compiler toolchain (TypeScript to JavaScript).

You get a new language without having to build a compiler backend from scratch.
That's the idea behind Ziguana, a transpiler written in **Zig**, that **Transpiles** our language down to C. Instead of writing our own compiler backend, optimizer and platform-specific code generation, we inherit decades of C toolchain maturity for free, while still designing the language surface however we want.

### Why Zig?
![ZigLogo](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zig-logo.png?raw=true)

Zig gives us low-level control and performance while still having modern language features and safety that make compiler development relatively straightforward. While developing Ziguana, Zig’s explicit memory management with arena allocators and simple data structures give us good control over the transpiler components without introducing the complexity of a larger runtime or garbage collector.


## Requirements
- **Zig 0.16.0**
- **GCC 13+**
- **Git**
## Getting started with Ziguana
### Clone the repository
```bash
git clone https://github.com/homebrew-foss/ziguana.git
cd ziguana
```
### Build and Install
```bash
zig build
```
#### To install it system wide (```/usr/local/bin``` should be in your ```PATH```)
```bash
sudo zig build install --prefix /usr/local
```


## Grammar rules of our language
Our language is designed to be simple and approachable while still including some features that are unique. One of our design decisions was to avoid indentation-based syntax, as seen in Python, while providing users with a programming experience inspired by traditional languages like C and Rust without their steep learning curve.


The [grammar of our language](https://github.com/homebrew-foss/ziguana/blob/main/docs/ebnf.md?raw=true) is formally represented using EBNF (Extended Backus–Naur Form), which provides a precise and structured description of the syntax and grammar rules of the language.




## Parts of a Transpiler
* Lexer
* Parser
* Abstract Syntax Tree
* Checker
* C code generation

![zigyflow](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigy-working.png?raw=true)

## Lexer
The first stage of the language pipeline is the lexer. It takes the raw source code and transforms it into a sequence of tokens that can be consumed by the parser. Each token stores its type along with its line and column, allowing the parser to work with structured input while providing useful error messages.

![Zigytokens](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigyTokens.png?raw=true)

Token types are represented using the `TokenTag` enum, covering identifiers, integer literals, strings, keywords, punctuation, arithmetic and comparison operators, and assignment operators. `TokenPayload` stores additional information such as identifier names, string contents, integer values, and type information.


The lexer tracks its current position using a character index, line number, and column number. Functions such as `readChar()` and `peekChar()` provide character-level navigation, while whitespace and comments are skipped before tokenization.


Identifiers are scanned and then checked to distinguish keywords such as `fn`, `int`, `bool`, `string`, `if`, `else`, `while`, and `return` from ordinary identifiers. Integer literals are parsed into `i64` values, while both single-character and multi-character operators such as `+`, `+=`, `==`, and `>=` are recognized.
Another unique part of the lexer is string interpolation. It uses two modes, `normal_state` and `string_state`, to switch between regular source code and string contents. Strings are split into `string_segment` tokens, while `{` and `}` produce `interpolation_start` and `interpolation_end` tokens, allowing the contents of an interpolation to be tokenized as a normal expression.


The lexer also handles escape sequences and detects errors such as unterminated strings or interpolations. These are represented as `invalid` tokens containing the error information and source location.


Finally, `lex()` repeatedly calls `nextToken()` until an `eof` token is produced, collecting the resulting tokens into an `ArrayList`.


By the end of this stage, the raw source code has been converted into a structured token stream that the parser can use to build the Abstract Syntax Tree.

## Abstract Syntax Tree
The Abstract Syntax Tree (AST) is the intermediate representation of the source after lexical analysis and parsing. Instead of keeping the source code as a flat sequence of tokens, the AST represents the **structure and meaning** of the program in a tree-like form.

![ZigyASTprint](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigyASTprint.png?raw=true)


Our AST is implemented using Zig's `union(enum)` types. Expressions are represented by `Expr`, while statements are represented by `Stmt`.


The expression nodes currently support:


- **Literals** — integers, strings, and booleans.
- **Variables** — references to declared variables.
- **Binary expressions** — arithmetic and comparison operations such as `+`, `-`, `*`, `/`, `<`, and `==`.
- **Unary expressions** — unary `+` and `-`.
- **Function calls** — a function name and a list of arguments.
- **Array indexing** — accessing elements such as `arr[i]`.
- **Interpolated strings for print** — Strings inside the print function containing both text and expressions.


Statements include variable declarations, assignments, function declarations, `if`/`else`, `while` loops, return statements, blocks, expression statements, and the complete program.


Each relevant AST node also stores its source **line and column**, allowing later compiler stages to report useful error locations.


AST nodes are allocated dynamically using Zig's `std.mem.Allocator`. Small constructor functions such as `makeBinary`, `makeCall`, and `makeVarDecl` keep AST creation consistent and make the parser easier to read.


## Parser


The parser converts the token stream produced by the lexer into the AST. Ziguana uses a **recursive-descent parser**, where each grammar rule is implemented as a separate function.


For expressions, the parser uses a hierarchy of functions to naturally implement **operator precedence**:


```text
parseExpression
    └── parseEquality
        └── parseComparison
            └── parseTerm
                └── parseFactor
                    └── parseUnary
                        └── parsePrimary
```


This means an expression such as:


```text
a + b * 2
```


is parsed as `a + (b * 2)` rather than `(a + b) * 2`.

For larger constructs, the same idea is applied recursively. For example, an if statement parses its condition and then calls `parseBlock()` to parse all statements inside `{ ... }`. A function declaration parses its parameters and then recursively parses its body by calling `parseBlock`. Function calls similarly parse each argument as an expression.
This recursive structure allows complex programs to naturally become a tree of AST nodes. Once parsing is complete, the entire source program is represented by a **program** node containing all of its statements.
The parser also performs basic syntax validation while doing this. Functions such as `consume()` check that the expected token is present and record an error with the token's line and column when it is not.


## Checker
Parsing only tells us whether a program is syntactically well-formed  whether the tokens fit together according to the grammar. It says nothing about whether the program actually makes sense. `int x = "hello";` parses without complaint, since a string literal is a perfectly valid expression, but it's clearly not a program we want to accept. That gap is what the checker closes: a separate pass over the finished AST that performs semantic analysis including type checking and scope resolution before the program is considered valid.


The Checker performs two tree traversals 


The first pass, `collectFunctions`, walks only the top-level of the program and records every function's name, parameter types, and return type into a hash map. Doing this upfront, before any function body is actually checked, allows functions to call each other regardless of the order they appear in the source. By the time we check any function's body, every other function's signature is already known, so forward references just work.


The second pass is where the real checking happens: two mutually recursive functions, `checkStmt` and `checkExpr` , walk the AST the same way the parser built it top-down, recursively. checkExpr is the more interesting of the two, since it doesn't just validate an expression, it also infers and returns its type. That return value is what makes the whole system compose: to check that a + b is valid, we call checkExpr on a and b, and only then can we ask whether both sides are of a type addition is defined for.

![zigyChecker](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigyChecker.png?raw=true)


Scope resolution is handled with a stack of hash maps rather than a single flat table, since the same name can validly refer to different variables in different nested blocks. Entering a block pushes a new scope; leaving one pops it. Looking up a variable searches from the innermost scope outward, so an inner declaration correctly shadows an outer one, and once a block ends, its variables are simply gone from the lookup chain.
The checker handles errors listed below 
Return-path analysis A function of a particular type returning a different type
Operator-level restrictions operations like += , -= can be performed only on integers
Constant-index bounds checking negative indexing is restricted so arr[-1] results in an error
Interpolated strings - Every embedded expression is recursively type-checked, so an undeclared variable inside "{x}" is caught the same way it would be anywhere else.
## C Code Generation
Now that we have a fully parsed and checked **Abstract Syntax Tree**, the next step is to transform the syntax tree into human-readable C code. This phase bridges the gap between the higher-level syntax and the lower-level efficiency of C, allowing expressive, type-safe code to be translated into performant binaries by a C compiler.

The `CodeGen` struct is responsible for traversing the AST and producing the final C source code. It maintains a symbol table (`symbol_types`) that records the types of variables encountered during generation. This information is used for type inference, particularly when determining how expressions should be represented in generated C code and which format specifiers should be used for string interpolation.

![zigyCodegen](https://github.com/planksconstant/homebrew-internethome/blob/main/src/images/Ziguana_Tilde5.0/zigyCodegen.png?raw=true)

Code generation is performed recursively through two main functions: `genExpr()` handles expressions such as literals, variables, unary and binary operations, array indexing, function calls, and interpolated strings, while `genStmt()` handles statements including variable declarations, assignments, return statements, blocks, conditionals, loops, function declarations, and the program itself.

Operators are translated from their language-specific token representations into their C equivalents. For example, arithmetic operators such as `+`, `-`, `*`, `/`, and `%`, comparison operators such as `==`, `!=`, `<`, and `>`, and assignment operators such as `+=` and `-=` are directly mapped to their corresponding C operators.

The code generator also performs several C-specific transformations. Types such as `int`, `bool`, and `string` are mapped to `int64_t`, `bool`, and `const char*` respectively. The required C headers, including `<stdio.h>`, `<stdint.h>`, `<inttypes.h>`, and `<stdbool.h>`, are automatically emitted at the beginning of the generated source file.

A notable part of the generation process is the handling of `print()` and interpolated strings. Calls to `print()` with strings are translated into C's `printf()`. When an interpolated string contains expressions, the generator constructs a C format string and determines the appropriate format specifier for each expression. For example, integers use `PRId64`, strings use `%s`, and booleans are converted to `"true"` or `"false"` through a conditional expression.

String generation requires additional handling because characters that have special meaning in C must be escaped. The `writeEscapedText()` function handles characters such as quotes, backslashes, and escape sequences like `\n`, `\t`, and `\r`. It also prevents percent signs in interpolated format strings from being interpreted as unintended format specifiers.

The generator additionally manages indentation while recursively traversing blocks, producing readable C source code rather than a single unformatted stream. Arrays are translated into C array declarations and initializers, while control-flow constructs such as `if`/`else` and `while` are emitted using their corresponding C syntax.

# Future Scope
* Memory Management by having a garbage collector 
* Name Mangling
* Multi file Module


