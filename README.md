<h1 align="center">
<img width="144" src="https://user-images.githubusercontent.com/2100222/56097756-9520c880-5ec6-11e9-9e77-9a2b5339fbf8.png">

reattempt

</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/reattempt">
    <img src="https://img.shields.io/npm/v/reattempt.svg" alt="Current Release" />
  </a>
  <a href="https://travis-ci.org/wsmd/reattempt">
    <img src="https://travis-ci.org/wsmd/reattempt.svg?branch=master" alt="CI Build">
  </a>
  <a href='https://coveralls.io/github/wsmd/reattempt?branch=master'>
    <img src='https://coveralls.io/repos/github/wsmd/reattempt/badge.svg?branch=master' alt='Coverage Status' />
  </a>
  <a href="https://github.com/wsmd/reattempt/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/wsmd/reattempt.svg" alt="Licence">
  </a>
</p>

> `reattempt` is a modern JavaScript library for the browser and Node.js that lets you retry asynchronous functions when they fail - because some functions deserve a second chance, or a third or maybe even several dozen or so.

<details>
<summary>📖 Table of Contents</summary>
<p>

- [Highlights](#highlights)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Asynchronous Promise-Based Functions](#asynchronous-promise-based-functions)
  - [Node.js Error-First Callbacks](#nodejs-error-first-callbacks)
  - [Custom Interface Functions](#custom-interface-functions)
  - [Intercepting Attempts](#intercepting-attempts)
  - [Working with TypeScript](#working-with-typescript)
    - [Reattempt As A Decorator](#reattempt-as-a-decorator)
    - [Type Safe Callbacks](#type-safe-callbacks)
- [API](#api)
  - [Methods](#methods)
    - [`run(options: Options, callback: Callback): Promise`](#runoptions-options-callback-callback-promise)
  - [Reattempt Options](#reattempt-options)
    - [`times: number`](#times-number)
    - [`delay?: number`](#delay-number)
    - [`onError?(error, done, abort): void`](#onerrorerror-done-abort-void)
  - [Reattempt Callback](#reattempt-callback)
  - [The `done` Callback](#the-done-callback)

</p>
</details>

## Highlights

- 🚀 Very lightweight: ~550 bytes minified+gzipped
- ⚡️ Modern asynchronous JavaScript support with Promises and Async/Await
- 💪 Flexible API that covers many cases
- 🛠 Targeted for both the browser and Node.js
- ⛑ Type-safety with TypeScript and a built-in decorator

## Getting Started

To get started, add `reattempt` to your project:

```
npm i --save-dev reattempt
```

## Usage

### Asynchronous Promise-Based Functions

When an `async` function (or a function that returns a `Promise`) is passed to `Reattempt.run`, the function will be called immediately. If the functions reject with an error, `Reattempt.run` will retry calling that function. The function will be retried until it resolves, or until the maximum retries count is reached, whichever comes first.

```js
import Reattempt from 'reattempt';

async function doSomethingAsync() {
  // doing async operation that may throw
  return result;
}

async function main() {
  try {
    const result = await Reattempt.run({ times: 3 }, doSomethingAsync);
  } catch (error) {
    // an error is thrown if the function rejects with an error after
    // exhausting all attempts
  }
}
```

### Node.js Error-First Callbacks

Reattempt also works with functions following the _error-first callbacks_ pattern. When working with these functions, instead of passing an `async` or `Promise` based function, pass a function with a single argument called `done`. Use this argument as the error-first callback of your function.

The function will be retried until it returns a value without an error, or until the maximum retries count is reached, whichever comes first.

```js
import fs from 'fs';
import Reattempt from 'reattempt';

async function main() {
  try {
    const data = await Reattempt.run({ times: 3 }, done => {
      fs.readFile('./path/to/file', 'utf8', done);
    });
  } catch (error) {
    // an error is thrown if the function rejects with an error after
    // exhausting all attempts
  }
}
```

### Custom Interface Functions

Similar to working with _[Node.js Error-First Callbacks](#nodejs-error-first-callbacks)_, the `done` callback can be used to reattempt any asynchronous function with custom callback interface. For example, some APIs expects an `onSuccess` and `onError` callbacks.

The properties `done.resolve` and `done.reject` can be used to hook into any custom interface and perform reattempts as needed.

```ts
function doSomething(onSuccess, onError) {
  // some async operations
}

async function main() {
  try {
    const data = await Reattempt.run({ times: 3 }, done => {
      doSomething(done.resolve, done.reject);
    });
  } catch (error) {
    // an error is thrown if the function rejects with an error after
    // exhausting all attempts
  }
}
```

### Intercepting Attempts

There are cases when you need to intercept an attempt call. It's possible to control the reattempt flow, by providing the `onError` option. This option allows you to intercept each attempt and control the reattempt flow.

<!-- prettier-ignore -->
```js
import Reattempt from 'reattempt';

async function doSomething() {
  // some async operations
}

function handleError(
  error /* the error object that the function rejected with */,
  done  /* resolves the function call with a custom value */,
  abort /* bail out of remaining attempts and rejects with current error */,
) {
  if (shouldAbortRemainingAttempts) {
    abort();
  } else if (shouldSkipAttemptsAndResolve) {
    done(defaultValue);
  }
}

async function main() {
  try {
    const result = await Reattempt.run(
      { times: 10, onError: handleError },
      doSomething,
    );
  } catch (error) {
    // ...
  }
}
```

### Working with TypeScript

#### Reattempt As A Decorator

Reattempt also comes as a decorator that can be imported from `reattempt/decorator`.

```ts
import Reattempt from 'reattempt/decorator';

class Group {
  @Reattempt({ times: 3, delay: 5000 })
  private async getUserIds() {
    const user = await fakeAPI.getUsers(this.id); // could throw!
    return users.map(user => user.id);
  }

  public async doSomething() {
    try {
      const result = await this.getUserIds();
    } catch (error) {
      // Only throws after failing 3 attempts with 5 seconds in between
    }
  }
}
```

#### Type Safe Callbacks

Reattempt can infer types of async and Promise-based functions automatically.

However, when working with error-first callbacks, you can enforce type safety by passing a type argument informing Reattempt about the list of success arguments the original function could potentially provide.

```ts
Reattempt
  .run<[string, string]>({ times: 3 }, done => {
    childProcess.exec('cat *.md | wc -w', attempt);
  })
  // resolves with an array of success type-safe arguments
  .then(([stdout, stderr]) => stdout.trim())
  .catch(error => /* ... */);
```

## API

### Methods

#### `run(options: Options, callback: Callback): Promise`

Runs and reattempt the provided callback. If the callback fails, it will be reattempted until it resolves, or until the maximum retries count `options.times` is reached, whichever comes first.

Returns a `Promise` that resolves with the result of the provided function, and rejects with the same error it could reject with.

### Reattempt Options

All Reattempt methods accept an options object as the first argument with the following properties:

#### `times: number`

The number of times a function can be reattempted.

If this property is not provided Reattempt will perform the provided function once without any additional reattempts on failure.

#### `delay?: number`

The duration in milliseconds between each attempt. Defaults to `0`.

If this property is not provided Reattempt will perform a reattempt as soon as the function fails.

#### `onError?(error, done, abort): void`

A callback that fires on each attempt after receiving an error. It allows you to intercept an attempt and gives you access to the error object. It passes the following parameters:

- `error: any`: the error that the function rejected with
- `done(value: any): void`: a function that allows you to skip remaining reattempts and resolve the attempted function with the value provided.
- `abort(): void`: a function allowing you to bail out of remaining attempts and rejects the attempted function immediately.

### Reattempt Callback

All Reattempt methods take a function as the second argument.

This function will be reattempted on failure and can be one of three forms:

- An `async` function.

```js
Reattempt.run({ times: 2 }, async () => {
  // ...
});
```

- A function that returns a `Promise`

```js
Reattempt.run({ times: 2 }, () => {
  return new Promise((resolve, reject) => {
    //...
  });
});
```

- A non-`async`, non-`Promise` function that wraps functions with error-first-callbacks

```js
Reattempt.run({ times: 2 }, done => {
  fs.readFile('path/to/file', 'utf-8', done);
});
```

### The `done` Callback

If you are reattempting a non-`async` function (or a function that does not return a `Promise`), pass a callback function with one argument `done`.

This argument controls the reattempt flow and can be used in one of two ways:

- As an error-first callback that you can pass to any function such as most Node.js APIs
- As a hook to custom interfaces that expects success and error callbacks by utilizing the two properties `done.resolve` and `done.reject`.

# License

MIT
