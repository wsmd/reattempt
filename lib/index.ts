type AsyncAttemptFunction<T> = () => Promise<T>;

type CallbackAttemptFunction<T> = (
  resolve: (error: any, value?: T) => any,
) => any;

type CallbackPromise<Callback> = Promise<
  Callback extends AsyncAttemptFunction<infer T>
    ? T
    : Callback extends CallbackAttemptFunction<infer P>
    ? P
    : any
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

function reattemptFunction<V>(
  options: ReattemptOptions,
  callback: AsyncAttemptFunction<V> | CallbackAttemptFunction<V>,
): CallbackPromise<typeof callback> {
  const delay = options.delay || 0;
  let currentAttempts = options.times;

  function attemptAsync<T>(
    promise: Promise<T>,
    fn: AsyncAttemptFunction<T>,
    resolve: (value?: T | PromiseLike<T>) => void,
    reject: (value?: T | PromiseLike<T>) => void,
  ) {
    promise.then(resolve).catch(error => {
      if (currentAttempts) {
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
    resolve: (args?: any[]) => void;
    promise: Promise<any>;
  } = {} as any;

  function resetCallbackResolver() {
    callbackResolver.promise = new Promise(resolve => {
      callbackResolver.resolve = function resolveCallback() {
        resolve(arguments);
      };
    });
  }

  resetCallbackResolver();

  function attemptCallback<T>(
    fn: CallbackAttemptFunction<T>,
    resolve: (value?: T | PromiseLike<T>) => void,
    reject: (value?: T | PromiseLike<T>) => void,
  ) {
    callbackResolver.promise.then((args: any[]) => {
      if (!args[0]) {
        return resolve(args[1]);
      } else if (currentAttempts) {
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
    const value = callback(callbackResolver.resolve);
    if (isPromise<V>(value)) {
      callbackResolver.resolve();
      attemptAsync(value, callback as AsyncAttemptFunction<V>, resolve, reject);
    } else {
      attemptCallback(callback, resolve, reject);
    }
  });
}

function createReattemptFunction<V>(
  options: ReattemptOptions,
  callback: AsyncAttemptFunction<V> | CallbackAttemptFunction<V>,
): () => CallbackPromise<typeof callback> {
  return reattemptFunction.bind(null, options, callback) as any;
}

export default {
  lazy: createReattemptFunction,
  run: reattemptFunction,
};
