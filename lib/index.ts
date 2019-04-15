type AsyncAttemptFunction<T> = () => Promise<T>;

interface Done<T extends any[]> {
  (error: any, ...args: T): void;
  resolve(...args: T): void;
  reject(error: any): void;
}

type CallbackAttemptFunction<T> = T extends any[]
  ? (done: Done<T>) => any
  : never;

type AttemptPromise<Callback, Value> = Promise<
  Callback extends AsyncAttemptFunction<infer T>
    ? T
    : Value extends (...args: infer A) => any
    ? A
    : never
>;

export interface ReattemptOptions {
  times: number;
  delay?: number;
}

function isPromise<T>(value: any): value is Promise<T> {
  const type = typeof value;
  return (
    value != null &&
    (type === 'object' || type === 'function') &&
    typeof value.then === 'function'
  );
}

function runAttempt<T>(
  options: ReattemptOptions,
  callback: AsyncAttemptFunction<T> | CallbackAttemptFunction<T>,
): AttemptPromise<typeof callback, T> {
  const delay = options.delay || 0;
  let currentAttempts = options.times;

  function attemptAsync(
    promise: Promise<T>,
    fn: AsyncAttemptFunction<T>,
    resolve: (value?: T | PromiseLike<T>) => void,
    reject: (value?: T | PromiseLike<T>) => void,
  ) {
    promise.then(resolve).catch(error => {
      if (currentAttempts > 0) {
        setTimeout(() => {
          currentAttempts--;
          attemptAsync(fn(), fn, resolve, reject);
        }, delay);
      } else {
        return reject(error);
      }
    });
  }

  const callbackResolver: {
    resolve: Done<T[]>;
    promise: Promise<any>;
  } = {} as any;

  function resetCallbackResolver() {
    callbackResolver.promise = new Promise(resolve => {
      function done() {
        resolve(Array.from(arguments));
      }
      done.resolve = done.bind(null, null);
      done.reject = done.bind(null);
      callbackResolver.resolve = done;
    });
  }

  resetCallbackResolver();

  function attemptCallback(
    fn: CallbackAttemptFunction<T>,
    resolve: (value?: T) => void,
    reject: (value?: T) => void,
  ) {
    callbackResolver.promise.then((args: any[]) => {
      if (!args[0]) {
        return resolve(args.slice(1) as any);
      } else if (currentAttempts > 0) {
        resetCallbackResolver();
        setTimeout(() => {
          currentAttempts--;
          fn(callbackResolver.resolve);
          attemptCallback(fn, resolve, reject);
        }, delay);
      } else {
        reject(args[0]);
      }
    });
  }

  return new Promise((resolve, reject) => {
    currentAttempts--;
    const value = callback(callbackResolver.resolve as any);
    if (isPromise<T>(value)) {
      callbackResolver.resolve(null);
      attemptAsync(value, callback as AsyncAttemptFunction<T>, resolve, reject);
    } else {
      attemptCallback(callback as CallbackAttemptFunction<T>, resolve, reject);
    }
  });
}

export default {
  run: runAttempt,
};
