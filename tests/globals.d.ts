/*
  Jest's globals, declared for the editor.

  `describe`, `it`, `expect`, `beforeEach` and `jest` are ambient globals that
  come from @types/jest. TypeScript picks that package up on its own, but only
  once its language server has seen it - an editor that was already open when
  the dependency was installed keeps the old view of the project and marks
  every one of them as an undefined name.

  This reference makes the dependency explicit for anyone reading the folder,
  and gives the editor a file inside `tests/` that points at the types.

  If they still show as undefined: restart the TypeScript server
  (Ctrl+Shift+P, "TypeScript: Restart TS Server"). Never "fix" it by importing
  `jest` - that rebinds the global to whatever was imported and breaks every
  jest.mock/fn/spyOn in the file. The eslint config rejects that import.
*/

/// <reference types="jest" />

export {};
