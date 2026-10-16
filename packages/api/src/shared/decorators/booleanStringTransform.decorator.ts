import { Transform } from "class-transformer";

export function BooleanStringTransform() {
  const transform = Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  });

  return (target: any, key: string) => {
    transform(target, key);
  };
}
