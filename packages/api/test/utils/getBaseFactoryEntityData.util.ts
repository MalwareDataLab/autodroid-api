const getBaseFactoryEntityData = <
  BASE extends Record<string, any>,
  ITEM extends Record<string, any>,
>(params: {
  base: BASE;
  item: ITEM;
}): BASE =>
  Object.keys(params.base).reduce<BASE>((obj, key) => {
    Object.assign(obj, { [key]: params.item[key] });
    return obj;
  }, {} as BASE);

export { getBaseFactoryEntityData };
