type AsyncAttemptFunction<T> = () => Promise<T>;

interface DoneCallback<T extends any[]> {
  (error: any, ...args: T): void;
  resolve(...args: T): void;
  reject(error: any): void;
}

type CallbackAttemptFunction<T> = T extends any[]
  ? (done: DoneCallback<T>) => any
  : never;

type AttemptResult<Callback, Value> = Promise<
  Callback extends AsyncAttemptFunction<infer T>
    ? T
    : Value extends (...args: infer A) => any
    ? A
    : never
>;

export interface ReattemptOptions {
  times: number;
  delay?: number;
  onError?(error: any, done: (value?: any) => void, abort: () => void): void;
}

interface Interceptor {
  done: any;
  abort: boolean;
  setDone(...args: any[]): void;
  setAbort(): void;
  intercept(error: any): void;
}

function isFunction(value: any): value is (...args: any[]) => any {
  return typeof value === 'function';
}

function isPromise<T>(value: any): value is Promise<T> {
  return (
    value != null &&
    (isFunction(value) || typeof value === 'object') &&
    isFunction(value.then)
  );
}

function createInterceptor(
  callback: Required<ReattemptOptions>['onError'],
): Interceptor {
  const interceptor = {
    abort: false,
    setAbort() {
      interceptor.abort = true;
    },
    setDone() {
      interceptor.done = Array.from(arguments);
    },
    intercept(error: any) {
      callback(error, interceptor.setDone, interceptor.setAbort);
    },
  } as Interceptor;
  return interceptor;
}

function runAttempt<T>(
  options: ReattemptOptions,
  callback: AsyncAttemptFunction<T> | CallbackAttemptFunction<T>,
): AttemptResult<typeof callback, T> {
  const delay = options.delay || 0;
  let currentAttempts = options.times;
  const interceptor = createInterceptor(
    isFunction(options.onError) ? options.onError : () => {},
  );

  function reattemptAsync(
    promise: Promise<T>,
    fn: AsyncAttemptFunction<T>,
    resolve: (value?: T | PromiseLike<T>) => void,
    reject: (value?: T | PromiseLike<T>) => void,
  ) {
    promise.then(resolve).catch(error => {
      interceptor.intercept(error);
      if (interceptor.done) {
        return resolve.apply(null, interceptor.done);
      }

      if (interceptor.abort || currentAttempts <= 0) {
        return reject(error);
      }

      setTimeout(() => {
        currentAttempts--;
        reattemptAsync(fn(), fn, resolve, reject);
      }, delay);
    });
  }

  const callbackResolver: {
    resolve: DoneCallback<T[]>;
    promise: Promise<any>;
  } = {} as any;

  function resetCallbackResolver() {
    callbackResolver.promise = new Promise(resolve => {
      function resolveCallback() {
        resolve(Array.from(arguments));
      }
      resolveCallback.resolve = resolveCallback.bind(null, null);
      resolveCallback.reject = resolveCallback.bind(null);
      callbackResolver.resolve = resolveCallback;
    });
  }

  resetCallbackResolver();

  function reattemptCallback(
    fn: CallbackAttemptFunction<T>,
    resolve: (value?: T) => void,
    reject: (value?: T) => void,
  ) {
    callbackResolver.promise.then((args: any[]) => {
      if (!args[0]) {
        return resolve(args.slice(1) as any);
      }

      interceptor.intercept(args[0]);

      if (interceptor.done) {
        return resolve(interceptor.done as any);
      }

      if (interceptor.abort || currentAttempts <= 0) {
        return reject(args[0]);
      }

      resetCallbackResolver();
      setTimeout(() => {
        currentAttempts--;
        fn(callbackResolver.resolve);
        reattemptCallback(fn, resolve, reject);
      }, delay);
    });
  }

  return new Promise((resolve, reject) => {
    currentAttempts--;
    const value = callback(callbackResolver.resolve as any);
    if (isPromise<T>(value)) {
      callbackResolver.resolve(null);
      reattemptAsync(
        value,
        callback as AsyncAttemptFunction<T>,
        resolve,
        reject,
      );
    } else {
      reattemptCallback(
        callback as CallbackAttemptFunction<T>,
        resolve,
        reject,
      );
    }
  });
}

export default {
  run: runAttempt,
};
