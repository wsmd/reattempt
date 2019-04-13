# reattempt

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

> Reattempt is a javascript library for the browser and Node.js that gives your functions another chance, or two or three or maybe even several dozen or so.

- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Asynchronous Promise-Based Functions](#asynchronous-promise-based-functions)
  - [Node.js Error-First Callbacks](#nodejs-error-first-callbacks)
  - [Lazily Evaluated Functions](#lazily-evaluated-functions)
  - [Working with TypeScript](#working-with-typescript)
    - [Reattempt As A Decorator](#reattempt-as-a-decorator)

## Getting Started

To get started, add `reattempt` to your project:

```
npm i --save-dev reattempt
```

## Usage

### Asynchronous Promise-Based Functions

```js
import Reattempt from 'reattempt';

Reattempt
  .run({ times: 3, delay: 5000 }, async () => {
    // doing something async
  })
  .then(() => {
    // function will resolve if it doesn't reject more that 3 times with 5
    // seconds in between
  })
  .catch(() => {
    // Only rejects after failing 3 attempts with 5 seconds in between
  });
```

### Node.js Error-First Callbacks

```js
import fs from 'fs';
import Reattempt from 'reattempt';

Reattempt
  .run({ times: 3 }, attempt => {
    fs.readFile('./path/to/file', 'utf8', attempt);
  })
  .then(data => /* ... */)
  .catch(error => /* ... */)
```

### Lazily Evaluated Functions

```js
import Reattempt from 'reattempt';

const getUserIds = Reattempt.lazy({ times: 3, delay: 5000 }, async () => {
  const user = await fakeAPI.getUsers(this.id); // could throw!
  return users.map(user => user.id);
});

// the newly created function will perform reattempts when necessary
getUserIds()
  .then(data => /* ... */)
  .catch(error => /* ... */)
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

# License

MIT
