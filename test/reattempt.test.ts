import Reattempt from '../lib';

afterEach(() => {
  jest.useRealTimers();
});

describe('Reattempt', () => {
  test('Reattempt has correct methods', () => {
    expect(Reattempt).toHaveProperty('run', expect.any(Function));
  });

  test('Reattempt.run() returns a promise', () => {
    const result = Reattempt.run({ times: 2 }, () => Promise.resolve());
    expect(result).toBeInstanceOf(Promise);
  });

  test('Reattempt.run() resolves with the correct value', async () => {
    const result = Reattempt.run({ times: 2 }, () => Promise.resolve('test'));
    await expect(result).resolves.toBe('test');
  });

  test('Reattempt.run() reject with the correct value', async () => {
    const result = Reattempt.run({ times: 2 }, () => Promise.reject('error'));
    await expect(result).rejects.toEqual('error');
  });

  test('Reattempt.run() calls an async function once and resolves on first pass', async () => {
    const fn = jest.fn(() => Promise.resolve('test'));
    const result = await Reattempt.run({ times: 100 }, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('Reattempt.run() calls an async function multiple times and rejects', async () => {
    const fn = jest.fn(() => Promise.reject('test'));
    try {
      const result = await Reattempt.run({ times: 4 }, fn);
    } catch (error) {
      expect(error).toBe('test');
    } finally {
      expect(fn).toHaveBeenCalledTimes(4);
    }
  });

  test('Reattempt.run() calls an async function multiple times and resolves', async () => {
    let passes = 3;
    const fn = jest.fn(() => {
      return passes-- ? Promise.reject('error') : Promise.resolve('pass');
    });
    const result = Reattempt.run({ times: 4 }, fn);
    await expect(result).resolves.toBe('pass');
  });

  test('Reattempt.run() calls an async function multiple times with delays', async () => {
    jest.useFakeTimers();

    const fn = jest.fn(() => Promise.reject('error'));
    const promise = Reattempt.run({ times: 2, delay: 1000 }, fn);

    jest.advanceTimersByTime(500);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000); // 1500ms passed
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000); // 2500ms passed
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);

    // tslint:disable-next-line: no-empty
    promise.catch(() => {});
  });

  test('Reattempt.run() resolves error first callbacks', async () => {
    const fn = jest.fn(callback => {
      process.nextTick(() => callback(null, 'pass'));
    });
    const promise = Reattempt.run<[string]>({ times: 2 }, done => fn(done));
    await expect(promise).resolves.toEqual(['pass']);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('Reattempt.run() rejects error first callbacks', async () => {
    const fn = jest.fn(callback => {
      process.nextTick(() => callback('error'));
    });
    const promise = Reattempt.run<[string]>({ times: 2 }, done => fn(done));
    await expect(promise).rejects.toBe('error');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('Reattempt.run() resolves custom callbacks manually', async () => {
    let passes = 3;
    const fn = jest.fn((onSuccess, onError) => {
      process.nextTick(() => (passes-- ? onError('error') : onSuccess('pass')));
    });
    const promise = Reattempt.run<[string]>({ times: 4 }, done => {
      fn(done.resolve, done.reject);
    });
    await expect(promise).resolves.toEqual(['pass']);
  });

  test('Reattempt.run() rejects custom callbacks manually', async () => {
    let passes = 3;
    const fn = jest.fn((onSuccess, onError) => {
      process.nextTick(() => (passes-- ? onError('error') : onSuccess('pass')));
    });
    const promise = Reattempt.run<[string]>({ times: 2 }, done => {
      fn(done.resolve, done.reject);
    });
    await expect(promise).rejects.toBe('error');
  });

  describe('intercepting attempts of async functions', () => {
    it('Reattempt.run() report async errors via onError', async () => {
      const fn = jest.fn(() => Promise.reject('error'));
      const handleError = jest.fn();
      const result = Reattempt.run({ times: 3, onError: handleError }, fn);
      await expect(result).rejects.toBe('error');
      expect(handleError).toHaveBeenCalledWith(
        'error', // error
        expect.any(Function), // done
        expect.any(Function), // abort
      );
      expect(handleError).toHaveBeenCalledTimes(3);
    });

    it('options.onError can abort an error of async function', async () => {
      const fn = jest.fn(() => Promise.reject('error'));
      const handleError = jest.fn((error, done, abort) => {
        abort();
      });
      const result = Reattempt.run({ times: 3, onError: handleError }, fn);
      await expect(result).rejects.toBe('error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('options.onError can skip errors of async function', async () => {
      const fn = jest.fn(() => Promise.reject('error'));
      const handleError = jest.fn((error, done, abort) => {
        done('test');
      });
      const result = Reattempt.run({ times: 3, onError: handleError }, fn);
      await expect(result).resolves.toBe('test');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('intercepting attempts of callback functions', () => {
    it('Reattempt.run() report callback errors via onError', async () => {
      const fn = jest.fn(callback => process.nextTick(() => callback('error')));
      const handleError = jest.fn();
      const result = Reattempt.run<[]>(
        { times: 3, onError: handleError },
        done => fn(done),
      );
      await expect(result).rejects.toBe('error');
      expect(handleError).toHaveBeenCalledWith(
        'error', // error
        expect.any(Function), // done
        expect.any(Function), // abort
      );
      expect(handleError).toHaveBeenCalledTimes(3);
    });

    it('options.onError can abort an error', async () => {
      const fn = jest.fn(callback => process.nextTick(() => callback('error')));
      const handleError = jest.fn((error, done, abort) => {
        abort();
      });
      const result = Reattempt.run<[]>({ times: 3, onError: handleError }, fn);
      await expect(result).rejects.toBe('error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('options.onError can skip errors and resolve with custom value', async () => {
      const fn = jest.fn(callback => process.nextTick(() => callback('error')));
      const handleError = jest.fn((error, done, abort) => {
        done('test');
      });
      const result = Reattempt.run<[string]>(
        { times: 3, onError: handleError },
        fn,
      );
      await expect(result).resolves.toEqual(['test']);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
