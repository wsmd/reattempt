import { ReattemptOptions } from '../lib';
import Reattempt from '../lib/decorator';

function decorateWithReattempt<T>(
  options: ReattemptOptions,
  target: T,
  property: Extract<keyof T, string>,
) {
  const desc = Object.getOwnPropertyDescriptor(target, property)!;
  const newDesc = Reattempt(options)(target, property, desc) || desc;
  Object.defineProperty(target, property, newDesc);
}

describe('Reattempt decorator', () => {
  test('Reattempt decorator is a function', () => {
    expect(Reattempt).toBeInstanceOf(Function);
  });

  it('decorates a method', () => {
    const spy = jest.fn(() => Promise.resolve());
    const object = { doIt: spy };
    decorateWithReattempt({ times: 2 }, object, 'doIt');
    expect(object.doIt).not.toBe(spy);
    expect(object.doIt).toBeInstanceOf(Function);
    expect(spy).not.toHaveBeenCalled();
  });

  test('decorated method throws after attempts', async () => {
    const spy = jest.fn(() => Promise.reject('error'));
    const foo = { doIt: spy };
    decorateWithReattempt({ times: 2 }, foo, 'doIt');
    await expect(foo.doIt()).rejects.toBe('error');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('decorated method resolves after attempts', async () => {
    let passes = 2;
    const spy = jest.fn(() =>
      passes-- ? Promise.reject('error') : Promise.resolve('pass'),
    );
    const foo = { doIt: spy };
    decorateWithReattempt({ times: 4 }, foo, 'doIt');
    await expect(foo.doIt()).resolves.toBe('pass');
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
