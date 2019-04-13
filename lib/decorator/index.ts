import Reattempt, { ReattemptOptions } from '..';

export default function ReattemptDecorator(options: ReattemptOptions) {
  return function withReattempt(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): any {
    const fn = descriptor.value;
    descriptor.value = function() {
      const args = arguments;
      return Reattempt.run(options, () => fn.apply(this, args));
    };
  };
}
