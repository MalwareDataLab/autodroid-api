const isValidCommaSeparatedString = (str: string) =>
  !!str && str.split(",").every((tag: string) => tag.trim().length > 0);

export { isValidCommaSeparatedString };
